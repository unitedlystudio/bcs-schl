import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuthenticatedUser } from './lib/auth';

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const items = await ctx.db
      .query('inboxItems')
      .withIndex('by_createdAt')
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
    await requireAuthenticatedUser(ctx);

    const unread = await ctx.db
      .query('inboxItems')
      .withIndex('by_status', (q) => q.eq('status', 'unread'))
      .collect();

    return unread.length;
  }
});

export const markAsRead = mutation({
  args: { itemId: v.id('inboxItems') },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const item = await ctx.db.get(args.itemId);
    if (!item || item.status === 'read') return;

    await ctx.db.patch(args.itemId, { status: 'read' });
  }
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const unread = await ctx.db
      .query('inboxItems')
      .withIndex('by_status', (q) => q.eq('status', 'unread'))
      .collect();

    await Promise.all(unread.map((item) => ctx.db.patch(item._id, { status: 'read' })));
  }
});
