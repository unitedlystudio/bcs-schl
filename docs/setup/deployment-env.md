# Deployment env checklist

Do not commit local env files.

Vercel frontend envs needed for Schly dashboard:
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- NEXT_PUBLIC_CLERK_SIGN_IN_URL
- NEXT_PUBLIC_CLERK_SIGN_UP_URL
- NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
- NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
- NEXT_PUBLIC_CONVEX_URL

Convex deployment envs needed:
- CLERK_JWT_ISSUER_DOMAIN

Expected Clerk JWT template name:
- convex
