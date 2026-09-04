import { query } from './_generated/server';
import { requirePermission, requireAdminManageUser } from './lib/auth';

export const listActiveMembers = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requirePermission(ctx, 'org:chat:read');
    const users = await ctx.db
      .query('appUsers')
      .withIndex('by_school', (q) => q.eq('schoolId', viewer.schoolId))
      .collect();
    return Promise.all(
      users
        .filter((user) => user.status === 'active' && user.authUserId !== viewer.subject)
        .map(async (user) => {
          const assignments = await ctx.db
            .query('userRoles')
            .withIndex('by_user', (q) => q.eq('userId', user._id))
            .collect();
          const role = assignments[0] ? await ctx.db.get(assignments[0].roleId) : null;
          return {
            userId: user._id,
            name: user.name ?? user.email,
            email: user.email,
            role: role?.name ?? 'Staff',
            imageUrl: ''
          };
        })
    );
  }
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireAdminManageUser(ctx);
    return ctx.db
      .query('appUsers')
      .withIndex('by_school', (q) => q.eq('schoolId', viewer.schoolId))
      .collect();
  }
});
