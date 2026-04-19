import type { MutationCtx, QueryCtx } from '../_generated/server';

type AuthIdentity = NonNullable<Awaited<ReturnType<QueryCtx['auth']['getUserIdentity']>>>;

function isTruthy(value: string | undefined) {
  return ['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase() ?? '');
}

function isLocalAuthBypassEnabled() {
  return (
    isTruthy(process.env.SCHLY_LOCAL_AUTH_BYPASS) ||
    isTruthy(process.env.BENTOFLOW_LOCAL_AUTH_BYPASS)
  );
}

function buildLocalBypassIdentity(): AuthIdentity {
  return {
    subject: 'local-dev-bypass',
    tokenIdentifier: 'local-dev-bypass',
    issuer: 'local-dev-bypass',
    name: 'Local Dev Bypass'
  } as AuthIdentity;
}

export async function requireAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    return identity;
  }

  if (isLocalAuthBypassEnabled()) {
    return buildLocalBypassIdentity();
  }

  throw new Error('Unauthorized');
}
