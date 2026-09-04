import { ConvexError } from 'convex/values';
import { mutation } from './_generated/server';
import { authComponent } from './auth';
import { normalizeEmail } from './lib/authPolicy';
import { DASHBOARD_PERMISSION_KEYS } from '../src/lib/school-permissions';

export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const configuredEmail = normalizeEmail(process.env.INITIAL_ADMIN_EMAIL);
    if (!configuredEmail) throw new ConvexError('INITIAL_ADMIN_EMAIL_NOT_CONFIGURED');
    if (normalizeEmail(authUser.email) !== configuredEmail)
      throw new ConvexError('BOOTSTRAP_NOT_ALLOWED');
    const existingUsers = await ctx.db
      .query('appUsers')
      .withIndex('by_authUserId', (q) => q.eq('authUserId', authUser._id))
      .collect();
    if (existingUsers.length > 1) throw new ConvexError('ACCESS_CONFIGURATION_INVALID');
    let role = await ctx.db
      .query('roles')
      .withIndex('by_key', (q) => q.eq('key', 'admin'))
      .unique();
    if (!role) {
      const now = Date.now();
      const id = await ctx.db.insert('roles', {
        key: 'admin',
        name: 'Administrator',
        permissions: DASHBOARD_PERMISSION_KEYS,
        system: true,
        createdAt: now,
        updatedAt: now
      });
      role = await ctx.db.get(id);
    }
    if (!role) throw new ConvexError('ACCESS_CONFIGURATION_INVALID');
    const assignments = await ctx.db
      .query('userRoles')
      .withIndex('by_role', (q) => q.eq('roleId', role._id))
      .collect();
    if (assignments.length > 0) {
      const existing = existingUsers[0];
      if (existing && assignments.some((assignment) => assignment.userId === existing._id))
        return { status: 'already_bootstrapped' as const };
      throw new ConvexError('BOOTSTRAP_CLOSED');
    }
    const now = Date.now();
    const schools = await ctx.db
      .query('schools')
      .withIndex('by_key', (q) => q.eq('key', 'primary'))
      .collect();
    if (schools.length > 1) throw new ConvexError('SCHOOL_CONFIGURATION_INVALID');
    const schoolId =
      schools[0]?._id ??
      (await ctx.db.insert('schools', { key: 'primary', name: 'Schly School', createdAt: now }));
    if (existingUsers[0] && existingUsers[0].schoolId !== schoolId)
      throw new ConvexError('SCHOOL_CONFIGURATION_INVALID');
    const userId =
      existingUsers[0]?._id ??
      (await ctx.db.insert('appUsers', {
        schoolId,
        authUserId: authUser._id,
        email: authUser.email,
        normalizedEmail: configuredEmail,
        name: authUser.name,
        status: 'active',
        createdAt: now,
        updatedAt: now
      }));
    await ctx.db.insert('userRoles', {
      userId,
      roleId: role._id,
      source: 'bootstrap',
      createdAt: now
    });
    await ctx.db.insert('authAuditEvents', {
      subjectUserId: userId,
      event: 'bootstrap_admin',
      createdAt: now
    });
    return { status: 'created' as const };
  }
});
