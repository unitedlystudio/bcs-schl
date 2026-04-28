import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import {
  getEffectiveDashboardAccess,
  requireAdminManageUser,
  requireOrganizationAccess
} from './lib/auth';
import {
  DASHBOARD_PERMISSION_CATALOG,
  normalizeDashboardPermissions,
  summarizeDashboardPermissions
} from '../src/lib/school-permissions';

const dashboardRoleValidator = v.union(
  v.literal('Owner'),
  v.literal('Admin'),
  v.literal('Accounts'),
  v.literal('Teacher'),
  v.literal('Teacher Assistant'),
  v.literal('Staff'),
  v.literal('Custom')
);

function mapProfile(profile: {
  _id: string;
  userId: string;
  dashboardRole:
    | 'Owner'
    | 'Admin'
    | 'Accounts'
    | 'Teacher'
    | 'Teacher Assistant'
    | 'Staff'
    | 'Custom';
  permissions: string[];
  updatedAt: number;
  updatedByUserId: string;
}) {
  const permissions = normalizeDashboardPermissions(profile.permissions);
  const summary = summarizeDashboardPermissions(permissions);

  return {
    id: profile._id,
    userId: profile.userId,
    dashboardRole: profile.dashboardRole,
    permissions,
    permissionCount: summary.count,
    updatedAt: profile.updatedAt,
    updatedByUserId: profile.updatedByUserId
  };
}

async function getProfilesForUser(ctx: QueryCtx | MutationCtx, orgId: string, userId: string) {
  return ctx.db
    .query('schoolStaffAccessProfiles')
    .withIndex('by_org_and_user', (query) => query.eq('orgId', orgId).eq('userId', userId))
    .collect();
}

async function upsertProfile(
  ctx: MutationCtx,
  payload: {
    orgId: string;
    userId: string;
    dashboardRole:
      | 'Owner'
      | 'Admin'
      | 'Accounts'
      | 'Teacher'
      | 'Teacher Assistant'
      | 'Staff'
      | 'Custom';
    permissions: string[];
    updatedAt: number;
    updatedByUserId: string;
  }
) {
  const existingProfiles = await getProfilesForUser(ctx, payload.orgId, payload.userId);
  // oxlint-disable-next-line unicorn/no-array-sort
  const [primaryProfile, ...duplicateProfiles] = [...existingProfiles].sort(
    (left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0)
  );

  if (primaryProfile) {
    await ctx.db.patch(primaryProfile._id, payload);
    for (const duplicateProfile of duplicateProfiles) {
      await ctx.db.delete(duplicateProfile._id);
    }
    return primaryProfile._id;
  }

  return ctx.db.insert('schoolStaffAccessProfiles', payload);
}

async function clearProfilesForUsers(ctx: MutationCtx, orgId: string, userIds: string[]) {
  for (const userId of userIds) {
    const existingProfiles = await getProfilesForUser(ctx, orgId, userId);
    for (const profile of existingProfiles) {
      await ctx.db.delete(profile._id);
    }
  }
}

export const listAccessProfiles = query({
  args: {
    orgId: v.string()
  },
  handler: async (ctx, args) => {
    await requireAdminManageUser(ctx, args.orgId);

    const profiles = await ctx.db
      .query('schoolStaffAccessProfiles')
      .withIndex('by_org_and_updatedAt', (query) => query.eq('orgId', args.orgId))
      .order('desc')
      .collect();

    return profiles.map(mapProfile);
  }
});

export const getCurrentAccess = query({
  args: {
    orgId: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.orgId);
    const access = await getEffectiveDashboardAccess(
      ctx,
      identity as typeof identity & Record<string, unknown>
    );

    return {
      orgId: args.orgId,
      hasManagedProfile: Boolean(access.storedProfile),
      dashboardRole: access.storedProfile?.dashboardRole ?? 'Inherited',
      permissions: access.effectivePermissions,
      managedPermissions: access.storedProfile?.permissions ?? [],
      clerkRole: access.clerkRole
    };
  }
});

export const saveAccessProfile = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    dashboardRole: dashboardRoleValidator,
    permissions: v.array(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await requireAdminManageUser(ctx, args.orgId);
    const permissions = normalizeDashboardPermissions(args.permissions);
    const now = Date.now();

    const profileId = await upsertProfile(ctx, {
      orgId: args.orgId,
      userId: args.userId,
      dashboardRole: args.dashboardRole,
      permissions,
      updatedAt: now,
      updatedByUserId: identity.subject
    });

    return { profileId };
  }
});

export const clearAccessProfiles = mutation({
  args: {
    orgId: v.string(),
    userIds: v.array(v.string())
  },
  handler: async (ctx, args) => {
    await requireAdminManageUser(ctx, args.orgId);

    const uniqueUserIds = Array.from(
      new Set(args.userIds.map((userId) => userId.trim()).filter(Boolean))
    );
    await clearProfilesForUsers(ctx, args.orgId, uniqueUserIds);

    return { cleared: uniqueUserIds.length };
  }
});

export const bulkSaveAccessProfiles = mutation({
  args: {
    orgId: v.string(),
    userIds: v.array(v.string()),
    dashboardRole: dashboardRoleValidator,
    permissions: v.array(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await requireAdminManageUser(ctx, args.orgId);
    const permissions = normalizeDashboardPermissions(args.permissions);
    const uniqueUserIds = Array.from(
      new Set(args.userIds.map((userId) => userId.trim()).filter(Boolean))
    );
    const now = Date.now();

    for (const userId of uniqueUserIds) {
      await upsertProfile(ctx, {
        orgId: args.orgId,
        userId,
        dashboardRole: args.dashboardRole,
        permissions,
        updatedAt: now,
        updatedByUserId: identity.subject
      });
    }

    return { updated: uniqueUserIds.length };
  }
});

export const getPermissionCatalog = query({
  args: {},
  handler: async () => {
    return DASHBOARD_PERMISSION_CATALOG;
  }
});
