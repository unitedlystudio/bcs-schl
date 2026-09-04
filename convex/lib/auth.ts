import { ConvexError } from 'convex/values';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { authComponent } from '../auth';
import {
  hasDashboardPermission,
  normalizeDashboardPermissions,
  type DashboardPermissionKey
} from '../../src/lib/school-permissions';

type Context = QueryCtx | MutationCtx;

export async function getSessionUser(ctx: Context) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new ConvexError('UNAUTHENTICATED');
  return user;
}

export async function getActiveAccess(ctx: Context) {
  const authUser = await getSessionUser(ctx);
  const users = await ctx.db
    .query('appUsers')
    .withIndex('by_authUserId', (query) => query.eq('authUserId', authUser._id))
    .collect();
  if (users.length !== 1) throw new ConvexError('ACCESS_NOT_PROVISIONED');
  const user = users[0];
  if (user.status !== 'active') throw new ConvexError('USER_DISABLED');
  const school = await ctx.db.get(user.schoolId);
  if (!school || school.key !== 'primary') throw new ConvexError('SCHOOL_CONFIGURATION_INVALID');
  const assignments = await ctx.db
    .query('userRoles')
    .withIndex('by_user', (query) => query.eq('userId', user._id))
    .collect();
  if (assignments.length === 0) throw new ConvexError('ACCESS_NOT_PROVISIONED');
  const roles = await Promise.all(assignments.map((assignment) => ctx.db.get(assignment.roleId)));
  if (roles.some((role) => !role)) throw new ConvexError('ACCESS_CONFIGURATION_INVALID');
  const permissions = normalizeDashboardPermissions(
    roles.flatMap((role) => role?.permissions ?? [])
  );
  return { authUser, user, roles: roles.filter(Boolean), permissions };
}

export async function requireAuthenticatedUser(ctx: Context) {
  const access = await getActiveAccess(ctx);
  return {
    subject: access.authUser._id,
    email: access.authUser.email,
    name: access.authUser.name,
    appUserId: access.user._id,
    schoolId: access.user.schoolId,
    permissions: access.permissions
  };
}

export function requireSchoolOwnership<T extends { schoolId: unknown }>(
  identity: { schoolId: unknown },
  record: T | null
): T {
  if (!record || record.schoolId !== identity.schoolId) throw new ConvexError('NOT_FOUND');
  return record;
}

export async function requirePermission(ctx: Context, permission: DashboardPermissionKey) {
  const identity = await requireAuthenticatedUser(ctx);
  if (!hasDashboardPermission(identity.permissions, permission)) throw new ConvexError('FORBIDDEN');
  return identity;
}

export const requireAdminManageUser = (ctx: Context) => requirePermission(ctx, 'org:admin:manage');
export const requireFinanceReadUser = (ctx: Context) => requirePermission(ctx, 'org:finance:read');
export const requireFinanceWriteUser = (ctx: Context) =>
  requirePermission(ctx, 'org:finance:write');
