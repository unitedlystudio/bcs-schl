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
type StaffInviteId = Id<'schoolStaffInvites'>;
type StaffInviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

type AccessProfilePayload = {
  orgId: string;
  userId: string;
  dashboardRoleLabel: string;
  roleTemplateId?: DashboardRoleTemplateId;
  permissions: string[];
  updatedAt: number;
  updatedByUserId: string;
};

type StaffInvitePayload = {
  orgId: string;
  email: string;
  normalizedEmail: string;
  clerkInvitationId: string;
  clerkRole: string;
  batchLabel?: string;
  dashboardRoleLabel: string;
  roleTemplateId?: DashboardRoleTemplateId;
  permissions: string[];
  status: StaffInviteStatus;
  invitedByUserId: string;
  invitedAt: number;
  lastSentAt: number;
  sendCount: number;
  updatedAt: number;
  claimedByUserId?: string;
  acceptedAt?: number;
  revokedAt?: number;
};

function normalizeRoleLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
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

function mapInvite(invite: {
  _id: StaffInviteId;
  email: string;
  clerkInvitationId: string;
  clerkRole: string;
  batchLabel?: string;
  dashboardRoleLabel: string;
  roleTemplateId?: DashboardRoleTemplateId;
  permissions: string[];
  status: StaffInviteStatus;
  invitedByUserId: string;
  invitedAt: number;
  lastSentAt: number;
  sendCount: number;
  updatedAt: number;
  claimedByUserId?: string;
  acceptedAt?: number;
  revokedAt?: number;
}) {
  const permissions = normalizeDashboardPermissions(invite.permissions);
  const summary = summarizeDashboardPermissions(permissions);

  return {
    id: invite._id,
    email: invite.email,
    clerkInvitationId: invite.clerkInvitationId,
    clerkRole: invite.clerkRole,
    batchLabel: invite.batchLabel ?? null,
    dashboardRole: invite.dashboardRoleLabel,
    roleTemplateId: invite.roleTemplateId ?? null,
    permissions,
    permissionCount: summary.count,
    status: invite.status,
    invitedByUserId: invite.invitedByUserId,
    invitedAt: invite.invitedAt,
    lastSentAt: invite.lastSentAt,
    sendCount: invite.sendCount,
    updatedAt: invite.updatedAt,
    claimedByUserId: invite.claimedByUserId ?? null,
    acceptedAt: invite.acceptedAt ?? null,
    revokedAt: invite.revokedAt ?? null
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

async function getInvitesForEmail(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
  normalizedEmail: string
) {
  return ctx.db
    .query('schoolStaffInvites')
    .withIndex('by_org_and_email', (query) =>
      query.eq('orgId', orgId).eq('normalizedEmail', normalizedEmail)
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

async function upsertInvite(ctx: MutationCtx, payload: StaffInvitePayload) {
  const existingInvites = await getInvitesForEmail(ctx, payload.orgId, payload.normalizedEmail);
  // oxlint-disable-next-line unicorn/no-array-sort
  const [primaryInvite, ...duplicateInvites] = [...existingInvites].sort(
    (left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0)
  );

  if (primaryInvite) {
    const nextSendCount = Math.max(primaryInvite.sendCount ?? 0, payload.sendCount ?? 0);

    await ctx.db.patch(primaryInvite._id, {
      ...payload,
      sendCount: nextSendCount
    });

    for (const duplicateInvite of duplicateInvites) {
      await ctx.db.delete(duplicateInvite._id);
    }

    return primaryInvite._id;
  }

  return ctx.db.insert('schoolStaffInvites', payload);
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

async function applyInviteAccessProfile(
  ctx: MutationCtx,
  invite: {
    orgId: string;
    dashboardRoleLabel: string;
    roleTemplateId?: DashboardRoleTemplateId;
    permissions: string[];
  },
  userId: string,
  updatedByUserId: string,
  now: number
) {
  const resolved = await resolveProfileInput(ctx, {
    orgId: invite.orgId,
    dashboardRoleLabel: invite.dashboardRoleLabel,
    roleTemplateId: invite.roleTemplateId,
    permissions: invite.permissions
  });

  await upsertProfile(ctx, {
    orgId: invite.orgId,
    userId,
    dashboardRoleLabel: resolved.dashboardRoleLabel,
    roleTemplateId: resolved.roleTemplateId,
    permissions: resolved.permissions,
    updatedAt: now,
    updatedByUserId
  });
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

export const listStaffInvites = query({
  args: {
    orgId: v.string()
  },
  handler: async (ctx, args) => {
    await requireAdminManageUser(ctx, args.orgId);

    const invites = await ctx.db
      .query('schoolStaffInvites')
      .withIndex('by_org_and_updatedAt', (query) => query.eq('orgId', args.orgId))
      .order('desc')
      .collect();

    return invites.map(mapInvite);
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

export const upsertStaffInvites = mutation({
  args: {
    orgId: v.string(),
    batchLabel: v.optional(v.string()),
    dashboardRoleLabel: v.string(),
    roleTemplateId: v.optional(v.id('schoolDashboardRoles')),
    permissions: v.array(v.string()),
    clerkRole: v.string(),
    invitations: v.array(
      v.object({
        email: v.string(),
        clerkInvitationId: v.string(),
        status: v.union(
          v.literal('pending'),
          v.literal('accepted'),
          v.literal('revoked'),
          v.literal('expired')
        )
      })
    )
  },
  handler: async (ctx, args) => {
    const identity = await requireAdminManageUser(ctx, args.orgId);
    const resolved = await resolveProfileInput(ctx, args);
    const batchLabel = args.batchLabel ? normalizeRoleLabel(args.batchLabel) : undefined;
    const uniqueInvitations = new Map<
      string,
      { email: string; clerkInvitationId: string; status: StaffInviteStatus }
    >();

    for (const invitation of args.invitations) {
      const normalizedEmail = normalizeEmail(invitation.email);
      if (!normalizedEmail) {
        continue;
      }

      uniqueInvitations.set(normalizedEmail, {
        email: invitation.email.trim(),
        clerkInvitationId: invitation.clerkInvitationId,
        status: invitation.status
      });
    }

    const now = Date.now();
    let recorded = 0;

    for (const [normalizedEmail, invitation] of uniqueInvitations) {
      const existingInvites = await getInvitesForEmail(ctx, args.orgId, normalizedEmail);
      const sendCount =
        existingInvites.reduce(
          (maxCount, existingInvite) => Math.max(maxCount, existingInvite.sendCount),
          0
        ) + 1;

      await upsertInvite(ctx, {
        orgId: args.orgId,
        email: invitation.email,
        normalizedEmail,
        clerkInvitationId: invitation.clerkInvitationId,
        clerkRole: args.clerkRole,
        batchLabel,
        dashboardRoleLabel: resolved.dashboardRoleLabel,
        roleTemplateId: resolved.roleTemplateId,
        permissions: resolved.permissions,
        status: invitation.status,
        invitedByUserId: identity.subject,
        invitedAt: now,
        lastSentAt: now,
        sendCount,
        updatedAt: now,
        acceptedAt: invitation.status === 'accepted' ? now : undefined,
        revokedAt: invitation.status === 'revoked' ? now : undefined
      });
      recorded += 1;
    }

    return { recorded };
  }
});

export const syncStaffInviteStatuses = mutation({
  args: {
    orgId: v.string(),
    statuses: v.array(
      v.object({
        clerkInvitationId: v.string(),
        status: v.union(
          v.literal('pending'),
          v.literal('accepted'),
          v.literal('revoked'),
          v.literal('expired')
        )
      })
    )
  },
  handler: async (ctx, args) => {
    await requireAdminManageUser(ctx, args.orgId);

    const now = Date.now();
    let synced = 0;

    for (const entry of args.statuses) {
      const matchingInvites = await ctx.db
        .query('schoolStaffInvites')
        .withIndex('by_org_and_clerkInvitationId', (query) =>
          query.eq('orgId', args.orgId).eq('clerkInvitationId', entry.clerkInvitationId)
        )
        .collect();

      for (const invite of matchingInvites) {
        await ctx.db.patch(invite._id, {
          status: entry.status,
          updatedAt: now,
          acceptedAt:
            entry.status === 'accepted'
              ? (invite.acceptedAt ?? now)
              : entry.status === 'pending'
                ? undefined
                : invite.acceptedAt,
          revokedAt:
            entry.status === 'revoked'
              ? (invite.revokedAt ?? now)
              : entry.status === 'pending'
                ? undefined
                : invite.revokedAt
        });
        synced += 1;
      }
    }

    return { synced };
  }
});

export const claimCurrentUserInvite = mutation({
  args: {
    orgId: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.orgId);
    const identityEmail = normalizeEmail(String(identity.email ?? ''));

    if (!identityEmail) {
      return { claimed: false, reason: 'missing-email' as const };
    }

    const matchingInvites = await getInvitesForEmail(ctx, args.orgId, identityEmail);
    const activeInvites = matchingInvites.filter(
      (invite) => invite.status === 'pending' || invite.status === 'accepted'
    );

    if (activeInvites.length === 0) {
      return { claimed: false, reason: 'not-found' as const };
    }

    // oxlint-disable-next-line unicorn/no-array-sort
    const [primaryInvite, ...duplicateInvites] = [...activeInvites].sort(
      (left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0)
    );
    const now = Date.now();

    for (const invite of [primaryInvite, ...duplicateInvites]) {
      await ctx.db.patch(invite._id, {
        status: 'accepted',
        claimedByUserId: identity.subject,
        acceptedAt: invite.acceptedAt ?? now,
        updatedAt: now
      });
    }

    for (const duplicateInvite of duplicateInvites) {
      await ctx.db.delete(duplicateInvite._id);
    }

    await applyInviteAccessProfile(ctx, primaryInvite, identity.subject, identity.subject, now);

    return {
      claimed: true,
      inviteId: primaryInvite._id,
      dashboardRole: primaryInvite.dashboardRoleLabel
    };
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
