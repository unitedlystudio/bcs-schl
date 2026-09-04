# Better Auth and Convex setup

Schly uses `better-auth@1.6.30` with `@convex-dev/better-auth@0.12.5`. Browser auth requests remain same-origin at `/api/auth/*`; the Next.js handler proxies only approved Better Auth endpoints to the matching Convex site URL.

Set the four backend-only values shown in `env.example.txt` with `npx convex env set`. For this checkpoint, configure `INITIAL_ADMIN_EMAIL` as `don@unitedly.co`; it remains backend configuration and is never client data. After that account bootstraps, all fresh users require a reveal-once invitation link. Password reset is intentionally unavailable until verified email delivery ships.

Run `npx convex dev --once` to register the component and regenerate `convex/_generated`, then run the repository verification commands from the README.

Invitation tokens exist only in the invite URL, an HMAC digest in Convex, and transient browser memory. They are removed from the address bar immediately, never written to local/session storage or logs, and retained in memory until an authenticated claim returns `accepted` or `already_accepted`. An invited existing account signs in with the same link and follows the same retry-safe claim path.

The Next.js `NEXT_PUBLIC_SITE_URL` and server/Convex `SITE_URL` values must be the same canonical origin. See `docs/setup/deployment-env.md` for the HTTPS production and localhost development rules.
