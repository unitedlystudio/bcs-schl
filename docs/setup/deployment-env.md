# Deployment environment

Deploy Convex before the Next.js application. Convex requires backend-only `BETTER_AUTH_SECRET`, `INVITE_TOKEN_SECRET`, `SITE_URL`, and `INITIAL_ADMIN_EMAIL`. The production checkpoint value for `INITIAL_ADMIN_EMAIL` is `don@unitedly.co`; it must be set in Convex, not bundled into Next.js. Production secrets must be independent random values of at least 32 bytes, and `SITE_URL` must be the exact HTTPS Next.js origin.

Next.js requires `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `NEXT_PUBLIC_SITE_URL`, and the server-only `SITE_URL`. `NEXT_PUBLIC_SITE_URL` and `SITE_URL` are mandatory and must be byte-for-byte identical canonical origins: HTTPS with no path, query, fragment, credentials, or trailing slash in production. Only `http://localhost[:port]` or `http://127.0.0.1[:port]` is accepted during development. All state-changing same-origin routes validate the request `Origin` against this contract and reject missing, `null`, foreign, or malformed origins. Production validation rejects mismatched deployments, insecure URLs, and trailing slashes. Never put an administrator email, auth secret, invite secret, session token, or deploy key in a public variable.

Cut over backend first, then frontend. Rollback must revoke Better Auth sessions and must not restore legacy debug, bypass, or public seed surfaces.

This schema change is an explicit fresh cutover: every sensitive domain row has a mandatory server-owned `schoolId` and school-leading indexes. There is intentionally no permissive legacy-row migration or fallback. Deploy only to an empty domain dataset (authentication bootstrap rows may remain), or export, validate, and re-import domain data with an operator-approved school assignment before deploying. Schema validation must fail closed if any legacy domain row lacks `schoolId`; never infer ownership from a client argument or silently attach orphaned rows to the primary school.

For Docker builds, pass `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `NEXT_PUBLIC_SITE_URL`, and `SITE_URL` as build arguments; pass `SITE_URL` again as a runtime environment variable. The two site-origin values must remain identical.
