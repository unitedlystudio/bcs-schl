import type { MutationCtx, QueryCtx } from '../_generated/server';
import {
  type DashboardPermissionKey,
  hasDashboardPermission,
  normalizeDashboardPermissions
} from '../../src/lib/school-permissions';

type AuthIdentity = NonNullable<Awaited<ReturnType<QueryCtx['auth']['getUserIdentity']>>>;
type ContextLike = QueryCtx | MutationCtx;
type IdentityLike = AuthIdentity & Record<string, unknown>;

type DashboardAccessProfile = {
  _id: string;
  roleTemplateId?: string;
  permissions: DashboardPermissionKey[];
  dashboardRoleLabel?: string;
  updatedAt?: number;
};

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

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

function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function getClerkPermissions(identity: IdentityLike) {
  return normalizeDashboardPermissions([
    ...readStringArray(identity.orgPermissions),
    ...readStringArray(identity.org_permissions),
    ...readStringArray(identity.permissions)
  ]);
}

function getClerkRole(identity: IdentityLike) {
  return (
    readLowercaseString(identity.orgRole) ||
    readLowercaseString(identity.org_role) ||
    readLowercaseString(identity.role)
  );
}

export function getOrganizationIdFromIdentity(identity: IdentityLike) {
  return readString(identity.orgId) || readString(identity.org_id);
}

async function getStoredDashboardAccess(
  ctx: ContextLike,
  identity: IdentityLike
): Promise<DashboardAccessProfile | null> {
  const orgId = getOrganizationIdFromIdentity(identity);
  const userId = readString(identity.subject);

  if (!orgId || !userId || identity.subject === 'local-dev-bypass') {
    return null;
  }

  const profiles = await ctx.db
    .query('schoolStaffAccessProfiles')
    .withIndex('by_org_and_user', (query) => query.eq('orgId', orgId).eq('userId', userId))
    .collect();

  if (profiles.length === 0) {
    return null;
  }

  // oxlint-disable-next-line unicorn/no-array-sort
  const [latestProfile] = [...profiles].sort(
    (left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0)
  );

  if (latestProfile.roleTemplateId) {
    const roleTemplate = await ctx.db.get(latestProfile.roleTemplateId);

    if (roleTemplate && roleTemplate.orgId === orgId) {
      return {
        _id: latestProfile._id,
        roleTemplateId: latestProfile.roleTemplateId,
        permissions: normalizeDashboardPermissions(roleTemplate.permissions),
        dashboardRoleLabel: roleTemplate.name,
        updatedAt: latestProfile.updatedAt
      };
    }
  }

  return {
    _id: latestProfile._id,
    roleTemplateId: latestProfile.roleTemplateId,
    permissions: normalizeDashboardPermissions(latestProfile.permissions),
    dashboardRoleLabel: latestProfile.dashboardRoleLabel,
    updatedAt: latestProfile.updatedAt
  };
}

async function getInvitedDashboardAccess(
  ctx: ContextLike,
  identity: IdentityLike
): Promise<DashboardAccessProfile | null> {
  const orgId = getOrganizationIdFromIdentity(identity);
  const normalizedEmail = normalizeEmail(identity.email);

  if (!orgId || !normalizedEmail || identity.subject === 'local-dev-bypass') {
    return null;
  }

  const invites = await ctx.db
    .query('schoolStaffInvites')
    .withIndex('by_org_and_email', (query) =>
      query.eq('orgId', orgId).eq('normalizedEmail', normalizedEmail)
    )
    .collect();

  const activeInvites = invites.filter(
    (invite) => invite.status === 'pending' || invite.status === 'accepted'
  );

  if (activeInvites.length === 0) {
    return null;
  }

  // oxlint-disable-next-line unicorn/no-array-sort
  const [latestInvite] = [...activeInvites].sort(
    (left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0)
  );

  if (latestInvite.roleTemplateId) {
    const roleTemplate = await ctx.db.get(latestInvite.roleTemplateId);

    if (roleTemplate && roleTemplate.orgId === orgId) {
      return {
        _id: latestInvite._id,
        roleTemplateId: latestInvite.roleTemplateId,
        permissions: normalizeDashboardPermissions(roleTemplate.permissions),
        dashboardRoleLabel: roleTemplate.name,
        updatedAt: latestInvite.updatedAt
      };
    }
  }

  return {
    _id: latestInvite._id,
    roleTemplateId: latestInvite.roleTemplateId,
    permissions: normalizeDashboardPermissions(latestInvite.permissions),
    dashboardRoleLabel: latestInvite.dashboardRoleLabel,
    updatedAt: latestInvite.updatedAt
  };
}

export async function getEffectiveDashboardAccess(ctx: ContextLike, identity: IdentityLike) {
  const clerkPermissions = getClerkPermissions(identity);
  const clerkRole = getClerkRole(identity);
  const storedProfile = await getStoredDashboardAccess(ctx, identity);
  const inviteProfile = storedProfile ? null : await getInvitedDashboardAccess(ctx, identity);
  const managedProfile = storedProfile ?? inviteProfile;
  const storedPermissions = managedProfile?.permissions ?? [];
  const isManaged = Boolean(managedProfile);
  const effectivePermissions = isManaged
    ? storedPermissions
    : normalizeDashboardPermissions(clerkPermissions);
  const effectiveRole = isManaged ? '' : clerkRole;

  return {
    organizationId: getOrganizationIdFromIdentity(identity),
    clerkRole,
    clerkPermissions,
    storedProfile,
    inviteProfile,
    isManaged,
    effectivePermissions,
    effectiveRole
  };
}

export async function requireAuthenticatedUser(ctx: ContextLike) {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    return identity;
  }

  if (isLocalAuthBypassEnabled()) {
    return buildLocalBypassIdentity();
  }

  throw new Error('Unauthorized');
}

export async function requireOrganizationAccess(ctx: ContextLike, orgId?: string) {
  const identity = (await requireAuthenticatedUser(ctx)) as IdentityLike;

  if (identity.subject === 'local-dev-bypass') {
    return identity;
  }

  const activeOrgId = getOrganizationIdFromIdentity(identity);

  if (!activeOrgId) {
    throw new Error('Organization context required');
  }

  if (orgId && activeOrgId !== orgId) {
    throw new Error('Active organization mismatch');
  }

  return identity;
}

async function requirePermission(ctx: ContextLike, permission: DashboardPermissionKey) {
  const identity = (await requireAuthenticatedUser(ctx)) as IdentityLike;

  if (identity.subject === 'local-dev-bypass') {
    return identity;
  }

  const access = await getEffectiveDashboardAccess(ctx, identity);

  if (!hasDashboardPermission(access.effectivePermissions, permission, access.effectiveRole)) {
    const label =
      permission === 'org:admin:manage' ? 'Admin access required' : 'Dashboard access required';
    throw new Error(label);
  }

  return identity;
}

export async function requireAdminManageUser(ctx: ContextLike, orgId?: string) {
  const identity = await requirePermission(ctx, 'org:admin:manage');

  if (identity.subject === 'local-dev-bypass') {
    return identity;
  }

  const activeOrgId = getOrganizationIdFromIdentity(identity as IdentityLike);

  if (orgId && activeOrgId !== orgId) {
    throw new Error('Active organization mismatch');
  }

  return identity;
}

export async function requireFinanceReadUser(ctx: ContextLike) {
  return requirePermission(ctx, 'org:finance:read');
}

export async function requireFinanceWriteUser(ctx: ContextLike) {
  return requirePermission(ctx, 'org:finance:write');
}
