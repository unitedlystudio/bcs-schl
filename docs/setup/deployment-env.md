# Deployment env checklist

Do not commit local env files.

Vercel frontend envs needed for Schly dashboard:
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- NEXT_PUBLIC_CLERK_SIGN_IN_URL
- NEXT_PUBLIC_CLERK_SIGN_UP_URL
- NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
- NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
- NEXT_PUBLIC_CONVEX_URL

Convex deployment envs needed:
- CLERK_JWT_ISSUER_DOMAIN

Expected Clerk JWT template name:
- convex

Production notes:
- Use production Clerk keys on Vercel. If the browser console says Clerk was loaded with development keys, production auth + Convex token exchange is not correctly configured.
- The Clerk JWT template named `convex` must exist on the same Clerk instance used by the deployed publishable key.
- `NEXT_PUBLIC_CONVEX_URL` should be the Convex cloud URL with no trailing slash. Example: `https://clear-wren-571.convex.cloud`
- A trailing slash can produce malformed websocket URLs like `wss://...cloud//api/...`.
