"""Isolated live-backend tests. Creates and removes only the UUIDs it records."""
import concurrent.futures
import datetime
import json
import os
from pathlib import Path
import uuid
import requests
BASE = os.environ['SUPABASE_URL'].rstrip('/')
KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
HEADERS = {'apikey': KEY, 'Content-Type':'application/json'}
if not KEY.startswith('sb_'): HEADERS['Authorization'] = 'Bearer ' + KEY
created=[]
checks=[]
def check(name, value):
    assert value, name
    checks.append(name)
def request(method, path, body=None):
    return requests.request(method, BASE+path, headers=HEADERS, json=body, timeout=30)
def rpc(name, body): return request('POST','/rest/v1/rpc/'+name,body)
def user():
    response=request('POST','/auth/v1/admin/users', {'email':'resident-v3-'+str(uuid.uuid4())+'@example.com','email_confirm':True,'user_metadata':{'role':'admin'}})
    response.raise_for_status()
    uid=response.json()['id']; created.append(uid)
    Path('/tmp/resident-v3-test-ids.json').write_text(json.dumps(created))
    return uid
def checkout(uid, rid, confirm): return rpc('resident_simulation_checkout',{'p_user':uid,'p_request':rid,'p_confirm':confirm})
def reserve(uid): return rpc('resident_reserve_ai',{'p_user':uid,'p_request':str(uuid.uuid4())})
def patch(table, uid, body):
    response=request('PATCH',f'/rest/v1/{table}?user_id=eq.{uid}',body); response.raise_for_status()
def rows(table, uid):
    response=request('GET',f'/rest/v1/{table}?user_id=eq.{uid}'); response.raise_for_status(); return response.json()
try:
    first=user(); second=user()
    rid=str(uuid.uuid4())
    begin=checkout(first,rid,False); begin.raise_for_status()
    check('Quote is 4.99 USDC, pending',float(begin.json()['amount_usdc'])==4.99 and begin.json()['status']=='pending')
    check('Opening checkout does not activate membership',not rows('subscriptions',first))
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results=list(pool.map(lambda _:checkout(first,rid,True),range(8)))
    check('8 concurrent confirmations succeed idempotently',all(r.ok for r in results))
    orders=rows('resident_simulation_orders',first); sub=rows('subscriptions',first)
    check('Concurrent retry produces one completed order and one membership',len(orders)==1 and orders[0]['status']=='completed' and len(sub)==1)
    start=datetime.datetime.fromisoformat(sub[0]['current_period_start']);end=datetime.datetime.fromisoformat(sub[0]['current_period_end'])
    check('Membership lasts exactly 30 days',(end-start).total_seconds()==30*86400)
    check('Membership never auto-renews',sub[0]['cancel_at_period_end'] is True and sub[0]['environment']=='resident_v3_simulation')
    retry=checkout(first,rid,True);check('Retry does not extend expiration',retry.json()['expires_at']==orders[0]['expires_at'])
    check('New checkout cannot extend active simulation',not checkout(first,str(uuid.uuid4()),True).ok)
    check('User-supplied role metadata grants no administrator row',not request('GET',f'/rest/v1/resident_admin_roles?user_id=eq.{first}').json())
    # Concurrent free quota and previous-day reset.
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        free=list(pool.map(lambda _:reserve(second),range(10)))
    check('Concurrent free tier permits exactly 5 requests',sum(r.ok for r in free)==5)
    check('Free tier rejects sixth request',not reserve(second).ok)
    day=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=1)).date().isoformat()
    patch('resident_ai_usage',second,{'usage_day':day})
    check('Previous UTC day does not consume today quota',reserve(second).ok)
    request_id=str(uuid.uuid4()); r=rpc('resident_reserve_ai',{'p_user':second,'p_request':request_id});check('New request reserved',r.ok)
    check('Duplicate AI request ID rejected',not rpc('resident_reserve_ai',{'p_user':second,'p_request':request_id}).ok)
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        pro=list(pool.map(lambda _:reserve(first),range(55)))
    check('Concurrent Pro tier permits exactly 50 requests',sum(r.ok for r in pro)==50)
    check('Pro tier rejects request 51',not reserve(first).ok)
    patch('subscriptions',first,{'current_period_end':day+'T00:00:00Z'})
    patch('resident_ai_usage',first,{'usage_day':day})
    expired=reserve(first);check('Expired membership falls back to free tier',expired.ok and expired.json()['tier']=='free')
    newrid=str(uuid.uuid4());check('Manual renewal after expiration succeeds',checkout(first,newrid,True).ok)
    # Only owned order can settle, even when another user's request id is supplied.
    foreign=checkout(second,rid,True);check('Request keys are owner scoped',foreign.ok and foreign.json()['user_id']==second)
    # An expired checkout cannot activate a membership.
    expired_uid=user();oldrid=str(uuid.uuid4());checkout(expired_uid,oldrid,False)
    patch('resident_simulation_orders',expired_uid,{'created_at':day+'T00:00:00Z'})
    check('Expired checkout rejected',not checkout(expired_uid,oldrid,True).ok)
    print(json.dumps({'passed':len(checks),'checks':checks},indent=2))
finally:
    for uid in created:
        response=request('DELETE','/auth/v1/admin/users/'+uid)
        if not response.ok: raise RuntimeError('Disposable test cleanup failed for recorded ID '+uid)
    print('Removed only the '+str(len(created))+' recorded disposable test accounts and their owned rows.')
