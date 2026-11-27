# Resident Labs 3.0.7 — remote preview preparation

No deployment is authorized by this document. Use a dedicated existing machine or explicitly approved zero-cost host; do not use the production domain, database, wallet, AI credentials or Lovable. The only runnable entry is preview/isolated-server.ts with its synthetic mock module. Never serve the repository root or full application.

## Proposed topology
Private VPN or authenticated HTTPS reverse proxy -> 127.0.0.1:4179. Keep the backend loopback-only. Require TLS and private access at the proxy, preserve the exact configured Host and Origin, forward Authorization without logging it, and reject all other hosts. Do not expose port 4179. Set RESIDENT_PREVIEW_ORIGIN to the exact HTTPS origin and RESIDENT_PREVIEW_PASSWORD to a unique randomly generated secret of at least 24 characters. Inject secrets at runtime, never commit them. Set RESIDENT_PREVIEW_STATE_DIR to a dedicated writable private directory on a persistent volume, owned by the unprivileged preview process. Single process only; no shared or production mounts. Back up synthetic data only.

## Approval gates
- Confirm host, access policy, TLS certificate, storage and zero incremental charges before provisioning or deployment.
- Restrict runtime outbound traffic at OS/container firewall; allow only necessary loopback proxy traffic. Browser CSP and route interception are not infrastructure isolation.
- Verify unauthenticated requests, wrong host, wrong origin, signing, transfer, mint and payment endpoints are rejected; verify persistence after restart and no outbound traffic.
- Verify TLS from actual iPhone Safari and Mac browser. CI WebKit is not actual Safari.
- Do not unlock the full application or enable real transactions. No public DNS or production settings changes.
- Stop and remove only the isolated preview on rollback; preserve production untouched.

Current limitations: no host selected or provisioned, no proxy or firewall configured, no remote TLS verification. Existing bundle and dependency warnings require separate investigation. Local startup retry noise is reduced without suppressing final assertion failures.
