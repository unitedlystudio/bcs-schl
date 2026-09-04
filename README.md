# Schly

Schly is a single-school operations dashboard built with Next.js 16, TypeScript, Tailwind CSS, Better Auth, and Convex.

Authentication uses same-origin email/password sessions. Registration is closed: the backend-configured initial administrator bootstraps once, then administrators create expiring, copyable invitation links. Convex application roles are the only authorization authority.

## Local development

Copy `env.example.txt` to `.env.local`, configure a Convex development deployment, then run:

```bash
bun install
bun run dev
```

## Verification

```bash
bun run test
bun run auth:denylist
bun run lint:strict
bun run format:check
bun run build
```
