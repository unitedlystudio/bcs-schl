import type { MutationCtx, QueryCtx } from '../_generated/server';

type AuthIdentity = NonNullable<Awaited<ReturnType<QueryCtx['auth']['getUserIdentity']>>>;

type IdentityLike = AuthIdentity & Record<string, unknown>;

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

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function readLowercaseString(value: unknown) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function hasFinanceReadAccess(identity: IdentityLike) {
  const role =
    readLowercaseString(identity.orgRole) ||
    readLowercaseString(identity.org_role) ||
    readLowercaseString(identity.role);
  const permissions = [
    ...readStringArray(identity.orgPermissions),
    ...readStringArray(identity.org_permissions),
    ...readStringArray(identity.permissions)
  ];

  return (
    role === 'admin' ||
    role === 'accounts' ||
    role === 'account' ||
    permissions.includes('org:admin:manage') ||
    permissions.includes('org:finance:read') ||
    permissions.includes('org:finance:write')
  );
}

function hasFinanceWriteAccess(identity: IdentityLike) {
  const role =
    readLowercaseString(identity.orgRole) ||
    readLowercaseString(identity.org_role) ||
    readLowercaseString(identity.role);
  const permissions = [
    ...readStringArray(identity.orgPermissions),
    ...readStringArray(identity.org_permissions),
    ...readStringArray(identity.permissions)
  ];

  return (
    role === 'admin' ||
    role === 'accounts' ||
    role === 'account' ||
    permissions.includes('org:admin:manage') ||
    permissions.includes('org:finance:write')
  );
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

export async function requireFinanceReadUser(ctx: QueryCtx | MutationCtx) {
  const identity = (await requireAuthenticatedUser(ctx)) as IdentityLike;

  if (identity.subject === 'local-dev-bypass') {
    return identity;
  }

  if (!hasFinanceReadAccess(identity)) {
    throw new Error('Finance access required');
  }

  return identity;
}

export async function requireFinanceWriteUser(ctx: QueryCtx | MutationCtx) {
  const identity = (await requireAuthenticatedUser(ctx)) as IdentityLike;

  if (identity.subject === 'local-dev-bypass') {
    return identity;
  }

  if (!hasFinanceWriteAccess(identity)) {
    throw new Error('Finance write access required');
  }

  return identity;
}
