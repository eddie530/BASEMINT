# Resident Labs 3.0.1 — independence staging
Baseline: 4ffe2c8aaed231f10b56f607e3ed1b1ea5d2677f. GitHub main and Lovable reported the same commit; GitHub compare returned identical, zero changed files. This covers committed source, not cloud settings or data.

## Build-only validation
Install Bun locally; from this branch run `bash scripts/independence-check.sh`. It archives committed HEAD, removes dotenv and npm configuration files, clears inherited credentials, installs frozen dependencies without lifecycle scripts, runs Vitest and builds. No server, database migrations, deployment or integration tests. Build may fail if Lovable packages need credentials or lifecycle scripts; investigate rather than inject production credentials. This is a build harness, not a verified independent runtime.

## Dependency and credential audit
- vite.config.ts imports @lovable.dev/vite-tanstack-config; preserve existing Coinbase CSS, stream and websocket shims when replacing with standard TanStack/Vite/Nitro configuration.
- resident-v3.functions.ts dynamically imports @lovable.dev/ai-gateway. Replace with a server-only provider adapter retaining quotas, request deduplication and evidence caveats. No provider credentials in browser bundles.
- Supabase client uses brokeredPreviewStorage; audit standalone auth and callback origins. Server admin uses SUPABASE_SERVICE_ROLE_KEY; keep server-only.
- Tracked .env, .env.production and .env.development exist; .gitignore lacks general dotenv exclusions. VITE_PAYMENTS_CLIENT_TOKEN and VITE_CDP_PAYMASTER_URL_BASE need classification with their providers; client-visible does not imply secret or safe. Review all history and rotate confirmed exposed credentials privately. Never paste values into public PRs. Do not rewrite history or rotate production credentials in this update.
- Existing release workflow can publish packages on release creation; do not create releases. Check hosting integrations for automatic branch deployments before pushing further.
- Prior report: 1,374 inherited lint errors, 17 warnings, dependency warnings and unavailable hosted security scans. Not a clean security bill.

## Runtime preview gate (not yet enabled)
Provision a separate disposable backend and synthetic accounts; never copy production rows or credentials. Audit every legacy payment, wallet signing, minting, Stripe and USDC path and enforce server-side deny-by-default plus client-side disabled controls. Existing Resident Pro simulation alone is not a global payment kill switch. Use mock payment and wallet adapters, test data, isolated auth and explicit preview environment allowlists. No public deployment. Do not start a runtime preview until these gates are verified.
Keep existing production behavior unchanged. Do not apply migrations against production. Do not merge.
 
## Acceptance tests
Frozen install and build, unit tests, isolated backend concurrency and RLS tests, mobile/Farcaster authentication, legacy games and entitlement regression, negative tests for all live payment and signing paths, secret scanning including history, dependency audit, standalone AI and hosting verification. Record actual results separately from historical Lovable results.
