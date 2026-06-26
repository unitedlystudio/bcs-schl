import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import {
  getEffectiveDashboardAccess,
  requireAdminManageUser,
  requireOrganizationAccess
} from './lib/auth';
import {
  DASHBOARD_PERMISSION_CATALOG,
  DASHBOARD_ROLE_OPTIONS,
  normalizeDashboardPermissions,
  summarizeDashboardPermissions
} from '../src/lib/school-permissions';

const RESERVED_ROLE_LABELS = new Set(DASHBOARD_ROLE_OPTIONS.map((role) => role.toLowerCase()));

type DashboardRoleTemplateId = Id<'schoolDashboardRoles'>;

type AccessProfilePayload = {
  orgId: string;
  userId: string;
  dashboardRoleLabel: string;
  roleTemplateId?: DashboardRoleTemplateId;
  permissions: string[];
  updatedAt: number;
  updatedByUserId: string;
};

function normalizeRoleLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function slugifyRoleLabel(value: string) {
  return normalizeRoleLabel(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureCustomRoleName(name: string) {
  const normalizedName = normalizeRoleLabel(name);

  if (normalizedName.length < 2) {
    throw new Error('Role name must be at least 2 characters long.');
  }

  if (RESERVED_ROLE_LABELS.has(normalizedName.toLowerCase())) {
    throw new Error('That role name is reserved by a built-in Schly role.');
  }

  return normalizedName;
}

function mapProfile(profile: {
  _id: string;
  userId: string;
  dashboardRoleLabel: string;
  roleTemplateId?: DashboardRoleTemplateId;
  permissions: string[];
  updatedAt: number;
  updatedByUserId: string;
}) {
  const permissions = normalizeDashboardPermissions(profile.permissions);
  const summary = summarizeDashboardPermissions(permissions);

  return {
    id: profile._id,
    userId: profile.userId,
    dashboardRole: profile.dashboardRoleLabel,
    roleTemplateId: profile.roleTemplateId ?? null,
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

async function getProfilesForRoleTemplate(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
  roleTemplateId: DashboardRoleTemplateId
) {
  return ctx.db
    .query('schoolStaffAccessProfiles')
    .withIndex('by_org_and_roleTemplate', (query) =>
      query.eq('orgId', orgId).eq('roleTemplateId', roleTemplateId)
    )
    .collect();
}

async function upsertProfile(ctx: MutationCtx, payload: AccessProfilePayload) {
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

async function resolveProfileInput(
  ctx: MutationCtx,
  args: {
    orgId: string;
    dashboardRoleLabel: string;
    roleTemplateId?: DashboardRoleTemplateId;
    permissions: string[];
  }
) {
  if (args.roleTemplateId) {
    const roleTemplate = await ctx.db.get(args.roleTemplateId);

    if (!roleTemplate || roleTemplate.orgId !== args.orgId) {
      throw new Error('Selected role template could not be found in this school workspace.');
    }

    return {
      dashboardRoleLabel: roleTemplate.name,
      roleTemplateId: args.roleTemplateId,
      permissions: normalizeDashboardPermissions(roleTemplate.permissions)
    };
  }

  const dashboardRoleLabel = normalizeRoleLabel(args.dashboardRoleLabel);

  if (!dashboardRoleLabel) {
    throw new Error('Dashboard role label is required.');
  }

  return {
    dashboardRoleLabel,
    roleTemplateId: undefined,
    permissions: normalizeDashboardPermissions(args.permissions)
  };
}

async function ensureUniqueCustomRoleName(
  ctx: MutationCtx,
  orgId: string,
  name: string,
  existingRoleId?: DashboardRoleTemplateId
) {
  const roles = await ctx.db
    .query('schoolDashboardRoles')
    .withIndex('by_org_and_updatedAt', (query) => query.eq('orgId', orgId))
    .collect();
  const targetName = name.toLowerCase();
  const targetSlug = slugifyRoleLabel(name);

  const conflictingRole = roles.find((role) => {
    if (existingRoleId && role._id === existingRoleId) {
      return false;
    }

    return role.name.toLowerCase() === targetName || role.slug === targetSlug;
  });

  if (conflictingRole) {
    throw new Error('A role with that name already exists in this school workspace.');
  }
}

async function syncProfilesForRoleTemplate(
  ctx: MutationCtx,
  payload: {
    orgId: string;
    roleTemplateId: DashboardRoleTemplateId;
    dashboardRoleLabel: string;
    permissions: string[];
    updatedAt: number;
    updatedByUserId: string;
  }
) {
  const profiles = await getProfilesForRoleTemplate(ctx, payload.orgId, payload.roleTemplateId);

  for (const profile of profiles) {
    await ctx.db.patch(profile._id, {
      dashboardRoleLabel: payload.dashboardRoleLabel,
      permissions: payload.permissions,
      updatedAt: payload.updatedAt,
      updatedByUserId: payload.updatedByUserId
    });
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

export const listRoleTemplates = query({
  args: {
    orgId: v.string()
  },
  handler: async (ctx, args) => {
    await requireAdminManageUser(ctx, args.orgId);

    const [roles, profiles] = await Promise.all([
      ctx.db
        .query('schoolDashboardRoles')
        .withIndex('by_org_and_updatedAt', (query) => query.eq('orgId', args.orgId))
        .order('desc')
        .collect(),
      ctx.db
        .query('schoolStaffAccessProfiles')
        .withIndex('by_org_and_updatedAt', (query) => query.eq('orgId', args.orgId))
        .collect()
    ]);

    const assignmentCounts = new Map<string, number>();
    for (const profile of profiles) {
      if (!profile.roleTemplateId) {
        continue;
      }

      const key = String(profile.roleTemplateId);
      assignmentCounts.set(key, (assignmentCounts.get(key) ?? 0) + 1);
    }

    return roles.map((role) => ({
      id: role._id,
      name: role.name,
      slug: role.slug,
      permissions: normalizeDashboardPermissions(role.permissions),
      permissionCount: normalizeDashboardPermissions(role.permissions).length,
      assignmentCount: assignmentCounts.get(String(role._id)) ?? 0,
      updatedAt: role.updatedAt,
      updatedByUserId: role.updatedByUserId
    }));
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
      dashboardRole: access.storedProfile?.dashboardRoleLabel ?? 'Inherited',
      roleTemplateId: access.storedProfile?.roleTemplateId ?? null,
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
    dashboardRoleLabel: v.string(),
    roleTemplateId: v.optional(v.id('schoolDashboardRoles')),
    permissions: v.array(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await requireAdminManageUser(ctx, args.orgId);
    const resolved = await resolveProfileInput(ctx, args);
    const now = Date.now();

    const profileId = await upsertProfile(ctx, {
      orgId: args.orgId,
      userId: args.userId,
      dashboardRoleLabel: resolved.dashboardRoleLabel,
      roleTemplateId: resolved.roleTemplateId,
      permissions: resolved.permissions,
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
    dashboardRoleLabel: v.string(),
    roleTemplateId: v.optional(v.id('schoolDashboardRoles')),
    permissions: v.array(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await requireAdminManageUser(ctx, args.orgId);
    const resolved = await resolveProfileInput(ctx, args);
    const uniqueUserIds = Array.from(
      new Set(args.userIds.map((userId) => userId.trim()).filter(Boolean))
    );
    const now = Date.now();

    for (const userId of uniqueUserIds) {
      await upsertProfile(ctx, {
        orgId: args.orgId,
        userId,
        dashboardRoleLabel: resolved.dashboardRoleLabel,
        roleTemplateId: resolved.roleTemplateId,
        permissions: resolved.permissions,
        updatedAt: now,
        updatedByUserId: identity.subject
      });
    }

    return { updated: uniqueUserIds.length };
  }
});

export const saveRoleTemplate = mutation({
  args: {
    orgId: v.string(),
    roleId: v.optional(v.id('schoolDashboardRoles')),
    name: v.string(),
    permissions: v.array(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await requireAdminManageUser(ctx, args.orgId);
    const name = ensureCustomRoleName(args.name);
    const permissions = normalizeDashboardPermissions(args.permissions);
    const now = Date.now();

    if (args.roleId) {
      const existingRole = await ctx.db.get(args.roleId);
      if (!existingRole || existingRole.orgId !== args.orgId) {
        throw new Error('Role template could not be found in this school workspace.');
      }
    }

    await ensureUniqueCustomRoleName(ctx, args.orgId, name, args.roleId);

    const payload = {
      orgId: args.orgId,
      name,
      slug: slugifyRoleLabel(name),
      permissions,
      updatedAt: now,
      updatedByUserId: identity.subject
    };

    const roleId = args.roleId
      ? (await ctx.db.patch(args.roleId, payload), args.roleId)
      : await ctx.db.insert('schoolDashboardRoles', payload);

    await syncProfilesForRoleTemplate(ctx, {
      orgId: args.orgId,
      roleTemplateId: roleId,
      dashboardRoleLabel: name,
      permissions,
      updatedAt: now,
      updatedByUserId: identity.subject
    });

    return { roleId };
  }
});

export const getPermissionCatalog = query({
  args: {},
  handler: async () => {
    return DASHBOARD_PERMISSION_CATALOG;
  }
});
