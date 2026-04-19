# Convex Chat + Inbox Integration Plan

> For Hermes: implement this incrementally, preserving the current theme system and reusing the existing chat/inbox UI where possible.

Goal: Set up Convex in the Schly Next.js app, create a dedicated Convex-backed chat and inbox backend, and replace the local mock Zustand data for those two features with realtime Convex subscriptions and mutations.

Architecture: Add Convex as a new provider layer alongside the existing Clerk/theme/query providers, create a minimal Convex schema for conversations, messages, and inbox items, seed starter data, then convert the current chat and inbox features to use useQuery/useMutation while keeping UI-only draft/selection state local.

Tech Stack: Next.js App Router, Clerk, shadcn/ui, Convex, Zustand only for UI-local state if still needed.

---

## Task sequence
1. Install Convex and create backend files under convex/
2. Add Convex provider plumbing without changing the theme system
3. Generate Convex API/types and seed starter data
4. Replace chat's mock shared state with Convex queries/mutations
5. Replace inbox's mock shared state with Convex queries/mutations
6. Run lint/build and fix any integration issues
