import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/auth';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requirePermission(ctx, 'org:notifications:read');

    const items = await ctx.db
      .query('inboxItems')
      .withIndex('by_school_createdAt', (q) => q.eq('schoolId', identity.schoolId))
      .order('desc')
      .collect();

    return items.map((item) => ({
      id: item._id,
      title: item.title,
      body: item.body,
      status: item.status,
      createdAt: item.createdAt,
      actions: item.actions
    }));
  }
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requirePermission(ctx, 'org:notifications:read');

    const unread = await ctx.db
      .query('inboxItems')
      .withIndex('by_school_status', (q) =>
        q.eq('schoolId', identity.schoolId).eq('status', 'unread')
      )
      .collect();

    return unread.length;
  }
});

export const markAsRead = mutation({
  args: { itemId: v.id('inboxItems') },
  handler: async (ctx, args) => {
    const identity = await requirePermission(ctx, 'org:notifications:write');

    const item = await ctx.db.get(args.itemId);
    if (!item || item.schoolId !== identity.schoolId || item.status === 'read') return;

    await ctx.db.patch(args.itemId, { status: 'read' });
  }
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requirePermission(ctx, 'org:notifications:write');

    const unread = await ctx.db
      .query('inboxItems')
      .withIndex('by_school_status', (q) =>
        q.eq('schoolId', identity.schoolId).eq('status', 'unread')
      )
      .collect();

    await Promise.all(unread.map((item) => ctx.db.patch(item._id, { status: 'read' })));
  }
});
