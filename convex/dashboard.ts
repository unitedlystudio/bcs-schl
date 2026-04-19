import { query } from './_generated/server';
import { requireAuthenticatedUser } from './lib/auth';

export const summary = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const [conversations, inboxItems, accessRecords] = await Promise.all([
      ctx.db.query('conversations').collect(),
      ctx.db.query('inboxItems').collect(),
      ctx.db.query('accessRecords').collect()
    ]);

    const unreadInboxCount = inboxItems.filter((item) => item.status === 'unread').length;
    const readyAccessCount = accessRecords.filter((record) => record.status === 'Ready').length;
    const partialAccessCount = accessRecords.filter((record) => record.status === 'Partial').length;
    const needsSetupAccessCount = accessRecords.filter(
      (record) => record.status === 'Needs setup'
    ).length;

    return {
      activeThreads: conversations.length,
      unreadInboxCount,
      accessRecordCount: accessRecords.length,
      readyAccessCount,
      partialAccessCount,
      needsSetupAccessCount
    };
  }
});

export const recentActivity = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const [latestInbox, latestConversations] = await Promise.all([
      ctx.db.query('inboxItems').withIndex('by_createdAt').order('desc').take(5),
      ctx.db.query('conversations').withIndex('by_updatedAt').order('desc').take(5)
    ]);

    return {
      inbox: latestInbox.map((item) => ({
        id: item._id,
        title: item.title,
        body: item.body,
        status: item.status,
        createdAt: item.createdAt
      })),
      conversations: latestConversations.map((conversation) => ({
        id: conversation._id,
        name: conversation.name,
        title: conversation.title,
        status: conversation.status
      }))
    };
  }
});
