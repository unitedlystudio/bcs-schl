import { ConvexError, v } from 'convex/values';
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { authComponent } from './auth';
import { requireAdminManageUser } from './lib/auth';
import {
  digestInviteToken,
  generateInviteToken,
  normalizeEmail,
  requireAbsoluteOrigin
} from './lib/authPolicy';
import { DASHBOARD_ROLE_PRESETS } from '../src/lib/school-permissions';

const inviteSecret = () => {
  const value = process.env.INVITE_TOKEN_SECRET;
  if (!value || value.length < 32)
    throw new Error('INVITE_TOKEN_SECRET must contain at least 32 characters');
  return value;
};

export const validateSignup = internalQuery({
  args: { email: v.string(), tokenDigest: v.string() },
  handler: async (ctx, args) => {
    if (!args.email) return false;
    const initialEmail = normalizeEmail(process.env.INITIAL_ADMIN_EMAIL);
    if (initialEmail && args.email === initialEmail) {
      const adminRole = await ctx.db
        .query('roles')
        .withIndex('by_key', (q) => q.eq('key', 'admin'))
        .unique();
      if (!adminRole) return true;
      return (
        (
          await ctx.db
            .query('userRoles')
            .withIndex('by_role', (q) => q.eq('roleId', adminRole._id))
            .take(1)
        ).length === 0
      );
    }
    if (!args.tokenDigest) return false;
    const invites = await ctx.db
      .query('invites')
      .withIndex('by_tokenDigest', (q) => q.eq('tokenDigest', args.tokenDigest))
      .collect();
    if (invites.length !== 1) return false;
    const invite = invites[0];
    return (
      invite.normalizedEmail === args.email &&
      invite.status === 'pending' &&
      invite.expiresAt > Date.now() &&
      !invite.claimedByUserId
    );
  }
});

export const inspectPublic = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const digest = await digestInviteToken(args.token, inviteSecret());
    if (!digest) return { valid: false };
    const matches = await ctx.db
      .query('invites')
      .withIndex('by_tokenDigest', (q) => q.eq('tokenDigest', digest))
      .collect();
    if (
      matches.length !== 1 ||
      matches[0].status !== 'pending' ||
      matches[0].expiresAt <= Date.now()
    )
      return { valid: false };
    const invite = matches[0];
    const [local, domain] = invite.normalizedEmail.split('@');
    return {
      valid: true,
      maskedEmail: `${local.slice(0, 1)}***@${domain}`,
      expiresAt: invite.expiresAt
    };
  }
});

export const create = action({
  args: { email: v.string(), roleKey: v.string(), expiresInDays: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{ inviteId: string; url: string }> => {
    const token = generateInviteToken();
    const tokenDigest = await digestInviteToken(token, inviteSecret());
    const inviteId: string = await ctx.runMutation(internal.invites.storeNew, {
      ...args,
      tokenDigest
    });
    const siteUrl = requireAbsoluteOrigin(process.env.SITE_URL, 'SITE_URL');
    return { inviteId, url: `${siteUrl}/auth/sign-up?invite=${token}` };
  }
});

export const storeNew = internalMutation({
  args: {
    email: v.string(),
    roleKey: v.string(),
    expiresInDays: v.optional(v.number()),
    tokenDigest: v.string()
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminManageUser(ctx);
    const email = normalizeEmail(args.email);
    if (!email) throw new ConvexError('INVALID_EMAIL');
    const pending = await ctx.db
      .query('invites')
      .withIndex('by_normalizedEmail_status', (q) =>
        q.eq('normalizedEmail', email).eq('status', 'pending')
      )
      .collect();
    if (pending.some((invite) => invite.expiresAt > Date.now()))
      throw new ConvexError('PENDING_INVITE_EXISTS');
    let role = await ctx.db
      .query('roles')
      .withIndex('by_key', (q) => q.eq('key', args.roleKey))
      .unique();
    if (!role && args.roleKey === 'staff') {
      const now = Date.now();
      role = await ctx.db.get(
        await ctx.db.insert('roles', {
          key: 'staff',
          name: 'Staff',
          permissions: [...DASHBOARD_ROLE_PRESETS.Staff],
          system: true,
          createdAt: now,
          updatedAt: now,
          updatedBy: admin.appUserId
        })
      );
    }
    if (!role || role.key === 'admin') throw new ConvexError('INVALID_INVITE_ROLE');
    const now = Date.now();
    const expiresInDays = Math.min(Math.max(args.expiresInDays ?? 7, 1), 30);
    const actor = await ctx.db.get(admin.appUserId);
    if (!actor) throw new ConvexError('ACCESS_CONFIGURATION_INVALID');
    const inviteId = await ctx.db.insert('invites', {
      schoolId: actor.schoolId,
      email: args.email.trim(),
      normalizedEmail: email,
      roleId: role._id,
      tokenDigest: args.tokenDigest,
      tokenVersion: 1,
      status: 'pending',
      expiresAt: now + expiresInDays * 86_400_000,
      createdBy: admin.appUserId,
      createdAt: now,
      updatedAt: now,
      lastPresentedAt: now
    });
    await ctx.db.insert('authAuditEvents', {
      actorUserId: admin.appUserId,
      event: 'invite_created',
      inviteId,
      createdAt: now
    });
    return inviteId;
  }
});

export const rotate = action({
  args: { inviteId: v.id('invites') },
  handler: async (ctx, args): Promise<{ inviteId: string; url: string }> => {
    const token = generateInviteToken();
    const tokenDigest = await digestInviteToken(token, inviteSecret());
    await ctx.runMutation(internal.invites.storeRotation, { inviteId: args.inviteId, tokenDigest });
    const siteUrl = requireAbsoluteOrigin(process.env.SITE_URL, 'SITE_URL');
    return { inviteId: args.inviteId, url: `${siteUrl}/auth/sign-up?invite=${token}` };
  }
});

export const storeRotation = internalMutation({
  args: { inviteId: v.id('invites'), tokenDigest: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdminManageUser(ctx);
    const invite = await ctx.db.get(args.inviteId);
    const actor = await ctx.db.get(admin.appUserId);
    if (
      !invite ||
      !actor ||
      invite.schoolId !== actor.schoolId ||
      invite.status !== 'pending' ||
      invite.expiresAt <= Date.now()
    )
      throw new ConvexError('INVITE_NOT_PENDING');
    const now = Date.now();
    await ctx.db.patch(invite._id, {
      tokenDigest: args.tokenDigest,
      tokenVersion: invite.tokenVersion + 1,
      updatedAt: now,
      lastPresentedAt: now
    });
    await ctx.db.insert('authAuditEvents', {
      actorUserId: admin.appUserId,
      event: 'invite_rotated',
      inviteId: invite._id,
      createdAt: now
    });
  }
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdminManageUser(ctx);
    const actor = await ctx.db.get(admin.appUserId);
    if (!actor) throw new ConvexError('ACCESS_CONFIGURATION_INVALID');
    const rows = await ctx.db
      .query('invites')
      .withIndex('by_school_createdAt', (q) => q.eq('schoolId', actor.schoolId))
      .order('desc')
      .take(100);
    return Promise.all(
      rows.map(async (invite) => ({
        id: invite._id,
        email: invite.email,
        role: (await ctx.db.get(invite.roleId))?.name ?? 'Unavailable',
        status:
          invite.status === 'pending' && invite.expiresAt <= Date.now() ? 'expired' : invite.status,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt
      }))
    );
  }
});

export const revoke = mutation({
  args: { inviteId: v.id('invites') },
  handler: async (ctx, args) => {
    const admin = await requireAdminManageUser(ctx);
    const invite = await ctx.db.get(args.inviteId);
    const actor = await ctx.db.get(admin.appUserId);
    if (!invite || !actor || invite.schoolId !== actor.schoolId || invite.status !== 'pending')
      throw new ConvexError('INVITE_NOT_PENDING');
    const now = Date.now();
    await ctx.db.patch(invite._id, { status: 'revoked', revokedAt: now, updatedAt: now });
    await ctx.db.insert('authAuditEvents', {
      actorUserId: admin.appUserId,
      event: 'invite_revoked',
      inviteId: invite._id,
      createdAt: now
    });
    return { status: 'revoked' as const };
  }
});

export const claimCurrent = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const digest = await digestInviteToken(args.token, inviteSecret());
    if (!digest) throw new ConvexError('INVITE_INVALID');
    const matches = await ctx.db
      .query('invites')
      .withIndex('by_tokenDigest', (q) => q.eq('tokenDigest', digest))
      .collect();
    if (matches.length !== 1) throw new ConvexError('INVITE_INVALID');
    const invite = matches[0];
    const existingUsers = await ctx.db
      .query('appUsers')
      .withIndex('by_authUserId', (q) => q.eq('authUserId', authUser._id))
      .collect();
    if (
      invite.status === 'accepted' &&
      existingUsers.length === 1 &&
      invite.claimedByUserId === existingUsers[0]._id
    )
      return { status: 'already_accepted' as const };
    if (
      invite.status !== 'pending' ||
      invite.expiresAt <= Date.now() ||
      normalizeEmail(authUser.email) !== invite.normalizedEmail ||
      existingUsers.length > 1
    )
      throw new ConvexError('INVITE_INVALID');
    const now = Date.now();
    if (existingUsers[0] && existingUsers[0].schoolId !== invite.schoolId)
      throw new ConvexError('INVITE_INVALID');
    const userId =
      existingUsers[0]?._id ??
      (await ctx.db.insert('appUsers', {
        schoolId: invite.schoolId,
        authUserId: authUser._id,
        email: authUser.email,
        normalizedEmail: invite.normalizedEmail,
        name: authUser.name,
        status: 'active',
        createdAt: now,
        updatedAt: now
      }));
    const assignments = await ctx.db
      .query('userRoles')
      .withIndex('by_user_role', (q) => q.eq('userId', userId).eq('roleId', invite.roleId))
      .collect();
    if (assignments.length === 0)
      await ctx.db.insert('userRoles', {
        userId,
        roleId: invite.roleId,
        grantedBy: invite.createdBy,
        source: 'invite',
        createdAt: now
      });
    else if (assignments.length > 1) throw new ConvexError('ACCESS_CONFIGURATION_INVALID');
    await ctx.db.patch(invite._id, {
      status: 'accepted',
      claimedByUserId: userId,
      acceptedAt: now,
      updatedAt: now
    });
    await ctx.db.insert('authAuditEvents', {
      actorUserId: userId,
      subjectUserId: userId,
      event: 'invite_accepted',
      inviteId: invite._id,
      createdAt: now
    });
    return { status: 'accepted' as const };
  }
});
