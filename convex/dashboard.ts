import { query } from './_generated/server';
import { requirePermission } from './lib/auth';

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requirePermission(ctx, 'org:overview:read');

    const [conversations, inboxItems, accessRecords, admissionsEnquiries, attendanceSessions] =
      await Promise.all([
        ctx.db
          .query('conversations')
          .withIndex('by_school_updatedAt', (q) => q.eq('schoolId', identity.schoolId))
          .collect(),
        ctx.db
          .query('inboxItems')
          .withIndex('by_school_createdAt', (q) => q.eq('schoolId', identity.schoolId))
          .collect(),
        ctx.db
          .query('accessRecords')
          .withIndex('by_school_sortOrder', (q) => q.eq('schoolId', identity.schoolId))
          .collect(),
        ctx.db
          .query('admissionsEnquiries')
          .withIndex('by_school_updatedAt', (q) => q.eq('schoolId', identity.schoolId))
          .collect(),
        ctx.db
          .query('attendanceSessions')
          .withIndex('by_school_updatedAt', (q) => q.eq('schoolId', identity.schoolId))
          .collect()
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
      admissionsEnquiryCount: admissionsEnquiries.length,
      attendanceSessionCount: attendanceSessions.length,
      readyAccessCount,
      partialAccessCount,
      needsSetupAccessCount
    };
  }
});

export const recentActivity = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requirePermission(ctx, 'org:overview:read');

    const [latestInbox, latestConversations] = await Promise.all([
      ctx.db
        .query('inboxItems')
        .withIndex('by_school_createdAt', (q) => q.eq('schoolId', identity.schoolId))
        .order('desc')
        .take(5),
      ctx.db
        .query('conversations')
        .withIndex('by_school_updatedAt', (q) => q.eq('schoolId', identity.schoolId))
        .order('desc')
        .take(5)
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
