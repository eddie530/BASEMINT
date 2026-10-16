create extension if not exists pgcrypto with schema extensions;

create table public.moonshot_pilots (
  id text primary key, fid bigint unique, wallet text unique, name text not null,
  avatar text, equipped text not null default 'base' check (equipped in ('base','acid','ember','violet')),
  created_at timestamptz not null default now()
);
create table public.moonshot_sessions (
  token_hash text primary key, pilot_id text not null references public.moonshot_pilots(id) on delete cascade,
  expires_at timestamptz not null
);
create table public.moonshot_nonces (
  id text primary key, browser_hash text not null, address text not null, message text not null,
  expires_at timestamptz not null
);
create table public.moonshot_days (
  pilot_id text not null references public.moonshot_pilots(id) on delete cascade, day text not null,
  used integer not null default 0 check (used between 0 and 10),
  completed integer not null default 0 check (completed between 0 and 10),
  balance integer not null default 1000 check (balance >= 0), finished_at timestamptz,
  primary key (pilot_id, day)
);
create table public.moonshot_rounds (
  id text primary key, pilot_id text not null references public.moonshot_pilots(id) on delete cascade,
  day text not null, number integer not null, request_key text not null, start_ms bigint not null,
  secret text not null, commitment text not null, crash double precision not null, auto double precision,
  status text not null default 'flying' check (status in ('flying','cash','rug')),
  multiplier double precision, payout integer not null default 0, settled_at timestamptz,
  unique (pilot_id, request_key), unique (pilot_id, day, number)
);
create unique index moonshot_one_active on public.moonshot_rounds(pilot_id) where status = 'flying';
create table public.moonshot_friends (
  pilot_id text not null references public.moonshot_pilots(id) on delete cascade,
  friend_id text not null references public.moonshot_pilots(id) on delete cascade,
  primary key (pilot_id, friend_id), check (pilot_id <> friend_id)
);
create table public.moonshot_orders (
  id text primary key, pilot_id text not null references public.moonshot_pilots(id) on delete cascade,
  payer text not null, created_ms bigint not null, expires_ms bigint not null, start_block bigint not null,
  tx_hash text unique, status text not null default 'pending' check (status in ('pending','paid'))
);
create table public.moonshot_entitlements (
  pilot_id text not null references public.moonshot_pilots(id) on delete cascade, pack text not null,
  order_id text not null unique references public.moonshot_orders(id),
  primary key (pilot_id, pack)
);
create table public.moonshot_limits (key text primary key, count integer not null, expires_ms bigint not null);

do $$
declare t text;
begin
  foreach t in array array['moonshot_pilots','moonshot_sessions','moonshot_nonces','moonshot_days','moonshot_rounds','moonshot_friends','moonshot_orders','moonshot_entitlements','moonshot_limits'] loop
    execute format('revoke all on public.%I from anon, authenticated, public', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I as restrictive for all to anon, authenticated using (false) with check (false)', t || '_deny_all', t);
  end loop;
end $$;

create or replace function public.moonshot__now_ms() returns bigint language sql volatile set search_path = public as
$$ select (extract(epoch from clock_timestamp()) * 1000)::bigint $$;

create or replace function public.moonshot__day(p_ms bigint) returns text language sql immutable set search_path = public as
$$ select to_char((to_timestamp(p_ms / 1000.0) at time zone 'UTC')::date, 'YYYY-MM-DD') $$;

create or replace function public.moonshot__mult(p_start bigint, p_now bigint) returns double precision language sql immutable set search_path = public as
$$ select least(1000::double precision, floor(exp(0.22::double precision * greatest(0, p_now - p_start)::double precision / 1000) * 100 + 1e-8) / 100) $$;

create or replace function public.moonshot__crash(p_secret text) returns double precision language plpgsql immutable set search_path = public, extensions as $$
declare r double precision;
begin
  r := (('x' || lpad(substr(encode(extensions.digest(p_secret, 'sha256'), 'hex'), 1, 8), 16, '0'))::bit(64)::bigint)::double precision / 4294967296::double precision;
  return greatest(1::double precision, least(1000::double precision,
    floor((case when r < 0.03 then 1::double precision else 0.97::double precision / (1 - r) end) * 100) / 100));
end $$;

create or replace function public.moonshot__settle(p_id text, p_now bigint, p_cash boolean)
returns public.moonshot_rounds language plpgsql set search_path = public as $$
declare r public.moonshot_rounds; v_status text; v_mult double precision; v_pay int; el double precision;
begin
  select * into r from public.moonshot_rounds where id = p_id;
  if r.status <> 'flying' or p_now < r.start_ms then return r; end if;
  el := (p_now - r.start_ms)::double precision / 1000;
  if r.auto is not null and r.auto < r.crash and el >= ln(r.auto) / 0.22 then
    v_status := 'cash'; v_mult := r.auto; v_pay := floor(100 * r.auto);
  elsif el >= ln(r.crash) / 0.22 then
    v_status := 'rug'; v_mult := r.crash; v_pay := 0;
  elsif p_cash then
    v_mult := public.moonshot__mult(r.start_ms, p_now); v_status := 'cash'; v_pay := floor(100 * v_mult);
  else
    return r;
  end if;
  update public.moonshot_rounds set status = v_status, multiplier = v_mult, payout = v_pay, settled_at = now()
    where id = p_id and status = 'flying' returning * into r;
  if found then
    update public.moonshot_days set balance = balance + v_pay, completed = completed + 1,
      finished_at = case when completed + 1 = 10 then now() else null end
      where pilot_id = r.pilot_id and day = r.day;
  else
    select * into r from public.moonshot_rounds where id = p_id;
  end if;
  return r;
end $$;

create or replace function public.moonshot__view(r public.moonshot_rounds, p_now bigint)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object('id', r.id, 'day', r.day, 'number', r.number, 'startMs', r.start_ms,
    'serverNow', p_now, 'commitment', r.commitment, 'auto', r.auto, 'status', r.status,
    'multiplier', r.multiplier,
    'crash', case when r.status = 'flying' then null else r.crash end,
    'seed', case when r.status = 'flying' then null else r.secret end,
    'payout', r.payout, 'balance', d.balance, 'completed', d.completed)
  from public.moonshot_days d where d.pilot_id = r.pilot_id and d.day = r.day
$$;

create or replace function public.moonshot_daily_state(p_pilot text) returns jsonb language plpgsql set search_path = public as $$
declare now_ms bigint := public.moonshot__now_ms(); a public.moonshot_rounds; d public.moonshot_days; v_day text;
begin
  perform 1 from public.moonshot_pilots where id = p_pilot for update;
  if not found then raise exception 'MS:Pilot not found.' using detail = '401'; end if;
  select * into a from public.moonshot_rounds where pilot_id = p_pilot and status = 'flying';
  if found then a := public.moonshot__settle(a.id, now_ms, false); end if;
  v_day := public.moonshot__day(now_ms);
  select * into d from public.moonshot_days where pilot_id = p_pilot and day = v_day;
  select * into a from public.moonshot_rounds where pilot_id = p_pilot and status = 'flying';
  return jsonb_build_object('day', v_day, 'used', coalesce(d.used, 0), 'completed', coalesce(d.completed, 0),
    'balance', coalesce(d.balance, 1000), 'serverNow', now_ms,
    'active', case when a.id is null then null else public.moonshot__view(a, now_ms) end);
end $$;

create or replace function public.moonshot_start_round(p_pilot text, p_auto double precision, p_key text)
returns jsonb language plpgsql set search_path = public, extensions as $$
declare now_ms bigint := public.moonshot__now_ms(); r public.moonshot_rounds; s public.moonshot_days; v_day text; v_id text; v_secret text;
begin
  if p_auto is not null and p_auto not in (1.5, 2, 3, 5, 10) then raise exception 'MS:Choose a supported auto cash-out.'; end if;
  if p_key is null or p_key !~ '^[a-f0-9-]{36}$' then raise exception 'MS:Invalid round request.'; end if;
  perform 1 from public.moonshot_pilots where id = p_pilot for update;
  if not found then raise exception 'MS:Pilot not found.' using detail = '401'; end if;
  select * into r from public.moonshot_rounds where pilot_id = p_pilot and request_key = p_key;
  if found then return public.moonshot__view(public.moonshot__settle(r.id, now_ms, false), now_ms); end if;
  select * into r from public.moonshot_rounds where pilot_id = p_pilot and status = 'flying';
  if found then
    r := public.moonshot__settle(r.id, now_ms, false);
    if r.status = 'flying' then return public.moonshot__view(r, now_ms); end if;
  end if;
  v_day := public.moonshot__day(now_ms);
  insert into public.moonshot_days(pilot_id, day) values (p_pilot, v_day) on conflict do nothing;
  select * into s from public.moonshot_days where pilot_id = p_pilot and day = v_day;
  if s.used >= 10 then raise exception 'MS:Your ten ranked rounds are complete. Come back after 00:00 UTC.' using detail = '409'; end if;
  v_id := gen_random_uuid()::text;
  v_secret := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.moonshot_rounds(id, pilot_id, day, number, request_key, start_ms, secret, commitment, crash, auto)
    values (v_id, p_pilot, v_day, s.used + 1, p_key, now_ms + 800, v_secret,
      encode(extensions.digest(v_id || ':' || v_secret, 'sha256'), 'hex'), public.moonshot__crash(v_secret), p_auto)
    returning * into r;
  update public.moonshot_days set used = used + 1, balance = balance - 100 where pilot_id = p_pilot and day = v_day;
  return public.moonshot__view(r, now_ms);
end $$;

create or replace function public.moonshot_read_round(p_pilot text, p_id text, p_cash boolean)
returns jsonb language plpgsql set search_path = public as $$
declare now_ms bigint := public.moonshot__now_ms(); r public.moonshot_rounds;
begin
  perform 1 from public.moonshot_pilots where id = p_pilot for update;
  if not found then raise exception 'MS:Pilot not found.' using detail = '401'; end if;
  select * into r from public.moonshot_rounds where id = p_id and pilot_id = p_pilot;
  if not found then raise exception 'MS:Round not found.' using detail = '404'; end if;
  if p_cash and now_ms < r.start_ms then raise exception 'MS:Wait for ignition.'; end if;
  return public.moonshot__view(public.moonshot__settle(r.id, now_ms, p_cash), now_ms);
end $$;

create or replace function public.moonshot_leaderboard(p_pilot text, p_from text, p_to text, p_friends boolean)
returns jsonb language sql stable set search_path = public as $$
  with scores as (
    select p.id, p.name, p.avatar, sum(d.balance)::int as score, count(*)::int as days
    from public.moonshot_days d join public.moonshot_pilots p on p.id = d.pilot_id
    where d.completed = 10 and d.day >= p_from and d.day <= p_to
      and (p_friends = false or p.id = p_pilot or exists (select 1 from public.moonshot_friends f where f.pilot_id = p_pilot and f.friend_id = p.id))
    group by p.id, p.name, p.avatar
  ), ranked as (select *, rank() over (order by score desc) as rank from scores)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'avatar', avatar, 'score', score, 'days', days,
    'rank', rank, 'you', id = p_pilot) order by rank, id), '[]'::jsonb)
  from (select * from ranked where rank <= 20 or id = p_pilot order by rank, id limit 100) x
$$;

create or replace function public.moonshot_hit_limit(p_key text, p_max int) returns boolean language plpgsql set search_path = public as $$
declare now_ms bigint := public.moonshot__now_ms(); c int;
begin
  insert into public.moonshot_limits(key, count, expires_ms) values (p_key, 1, now_ms + 600000)
  on conflict (key) do update set
    count = case when public.moonshot_limits.expires_ms < now_ms then 1 else public.moonshot_limits.count + 1 end,
    expires_ms = case when public.moonshot_limits.expires_ms < now_ms then now_ms + 600000 else public.moonshot_limits.expires_ms end
  returning count into c;
  return c <= p_max;
end $$;

create or replace function public.moonshot_wallet_pilot(p_address text, p_current text) returns text language plpgsql set search_path = public as $$
declare cur public.moonshot_pilots; ex public.moonshot_pilots; v_id text;
begin
  select * into ex from public.moonshot_pilots where wallet = p_address;
  if p_current is not null then
    select * into cur from public.moonshot_pilots where id = p_current for update;
    if cur.fid is not null then
      if ex.id is not null and ex.id <> cur.id then raise exception 'MS:This wallet already has a pilot. Sign out first to use that pilot.'; end if;
      if cur.wallet is not null and cur.wallet <> p_address then raise exception 'MS:This pilot already has a linked wallet.'; end if;
      update public.moonshot_pilots set wallet = p_address where id = cur.id;
      return cur.id;
    end if;
  end if;
  if ex.id is not null then return ex.id; end if;
  v_id := gen_random_uuid()::text;
  insert into public.moonshot_pilots(id, wallet, name) values (v_id, p_address, substr(p_address, 1, 6) || '…' || right(p_address, 4))
  on conflict (wallet) do nothing;
  select id into v_id from public.moonshot_pilots where wallet = p_address;
  return v_id;
end $$;

create or replace function public.moonshot_farcaster_pilot(p_fid bigint, p_name text, p_avatar text) returns text language sql set search_path = public as $$
  insert into public.moonshot_pilots(id, fid, name, avatar) values (gen_random_uuid()::text, p_fid, p_name, p_avatar)
  on conflict (fid) do update set name = excluded.name, avatar = excluded.avatar returning id
$$;

create or replace function public.moonshot_create_order(p_pilot text, p_payer text, p_start_block bigint) returns jsonb language plpgsql set search_path = public as $$
declare now_ms bigint := public.moonshot__now_ms(); o public.moonshot_orders;
begin
  perform 1 from public.moonshot_pilots where id = p_pilot for update;
  if exists (select 1 from public.moonshot_entitlements where pilot_id = p_pilot and pack = 'afterhours') then
    raise exception 'MS:You already own After Hours.'; end if;
  select * into o from public.moonshot_orders where pilot_id = p_pilot and status = 'pending' and expires_ms > now_ms order by created_ms desc limit 1;
  if not found then
    insert into public.moonshot_orders(id, pilot_id, payer, created_ms, expires_ms, start_block)
      values (gen_random_uuid()::text, p_pilot, lower(p_payer), now_ms, now_ms + 1200000, p_start_block) returning * into o;
  end if;
  return jsonb_build_object('id', o.id, 'payer', o.payer, 'createdMs', o.created_ms, 'expiresAt', o.expires_ms, 'startBlock', o.start_block, 'hash', o.tx_hash);
end $$;

create or replace function public.moonshot_settle_payment(p_pilot text, p_order text, p_hash text) returns boolean language plpgsql set search_path = public as $$
declare o public.moonshot_orders;
begin
  select * into o from public.moonshot_orders where id = p_order and pilot_id = p_pilot for update;
  if not found then raise exception 'MS:Checkout not found.' using detail = '404'; end if;
  if o.status = 'paid' then
    if o.tx_hash <> p_hash then raise exception 'MS:This order has already been paid.'; end if;
    return true;
  end if;
  if exists (select 1 from public.moonshot_orders where tx_hash = p_hash and id <> p_order) then
    raise exception 'MS:This payment was already used.'; end if;
  update public.moonshot_orders set tx_hash = p_hash, status = 'paid' where id = p_order;
  insert into public.moonshot_entitlements(pilot_id, pack, order_id) values (p_pilot, 'afterhours', p_order) on conflict (pilot_id, pack) do nothing;
  return true;
end $$;

do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'moonshot%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;