import type { QueryCtx, MutationCtx } from '../_generated/server';

export async function requireAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error('Unauthorized');
  }

  return identity;
}
