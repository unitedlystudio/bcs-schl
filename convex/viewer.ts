import { query } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { authComponent } from './auth';
import { getActiveAccess, requirePermission } from './lib/auth';
import { normalizeEmail } from './lib/authPolicy';
import { isDashboardPermissionKey } from '../src/lib/school-permissions';

export const assertPermission = query({
  args: { permission: v.string() },
  handler: async (ctx, args) => {
    if (!isDashboardPermissionKey(args.permission)) throw new ConvexError('FORBIDDEN');
    await requirePermission(ctx, args.permission);
    return true;
  }
});

export const getAccess = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) return { state: 'unauthorized' as const, canBootstrap: false };
    const appUsers = await ctx.db
      .query('appUsers')
      .withIndex('by_authUserId', (q) => q.eq('authUserId', authUser._id))
      .collect();
    if (appUsers.length === 0) {
      const configured = normalizeEmail(process.env.INITIAL_ADMIN_EMAIL);
      const adminRole = await ctx.db
        .query('roles')
        .withIndex('by_key', (q) => q.eq('key', 'admin'))
        .unique();
      const admins = adminRole
        ? await ctx.db
            .query('userRoles')
            .withIndex('by_role', (q) => q.eq('roleId', adminRole._id))
            .take(1)
        : [];
      return {
        state: 'unassigned' as const,
        canBootstrap: Boolean(
          configured && configured === normalizeEmail(authUser.email) && admins.length === 0
        )
      };
    }
    if (appUsers.length !== 1 || appUsers[0].status === 'disabled')
      return { state: 'disabled' as const, canBootstrap: false };
    try {
      const access = await getActiveAccess(ctx);
      return {
        state: 'authorized' as const,
        canBootstrap: false,
        user: {
          id: access.user._id,
          authUserId: access.authUser._id,
          email: access.user.email,
          name: access.user.name
        },
        roleKeys: access.roles.map((role) => role!.key),
        permissions: access.permissions
      };
    } catch {
      return { state: 'unassigned' as const, canBootstrap: false };
    }
  }
});
