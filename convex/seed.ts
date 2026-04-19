import { mutation } from './_generated/server';
import { requireAuthenticatedUser } from './lib/auth';

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const existingConversations = await ctx.db.query('conversations').collect();
    const existingInbox = await ctx.db.query('inboxItems').collect();

    if (existingConversations.length === 0) {
      const alexId = await ctx.db.insert('conversations', {
        name: 'Alex from Support',
        title: 'Billing Follow-up',
        status: 'online',
        initials: 'AS',
        quickReplies: [
          'Thanks, please log that against the family profile.',
          'Can you send the reminder history as well?',
          'Loop finance in before closing this.'
        ],
        updatedAt: Date.now() - 1000 * 60 * 5
      });

      const priyaId = await ctx.db.insert('conversations', {
        name: 'Priya from Engineering',
        title: 'Convex Runtime Check',
        status: 'online',
        initials: 'PE',
        quickReplies: [
          'Please confirm the deployment is healthy.',
          'Can you share the failing request details?',
          'Let us keep this in the operational inbox.'
        ],
        updatedAt: Date.now() - 1000 * 60 * 30
      });

      const jordanId = await ctx.db.insert('conversations', {
        name: 'Jordan from Security',
        title: 'Account Access Review',
        status: 'offline',
        initials: 'JS',
        quickReplies: [
          'Please revoke any stale sessions.',
          'Reset the password and reissue access.',
          'Was any school data accessed?'
        ],
        updatedAt: Date.now() - 1000 * 60 * 60 * 24
      });

      await ctx.db.insert('messages', {
        conversationId: alexId,
        sender: 'contact',
        author: 'Alex',
        text: 'A parent billing question is still open. I have the reminder history ready if finance needs it.',
        timestampLabel: '10:02',
        createdAt: Date.now() - 1000 * 60 * 20
      });
      await ctx.db.insert('messages', {
        conversationId: alexId,
        sender: 'user',
        author: 'You',
        text: 'Thanks. Please keep it attached to the family thread so admin and finance both see it.',
        timestampLabel: '10:05',
        createdAt: Date.now() - 1000 * 60 * 18
      });
      await ctx.db.insert('messages', {
        conversationId: alexId,
        sender: 'contact',
        author: 'Alex',
        text: 'Done. I have also flagged it for overdue review in the inbox.',
        timestampLabel: '10:08',
        createdAt: Date.now() - 1000 * 60 * 15
      });

      await ctx.db.insert('messages', {
        conversationId: priyaId,
        sender: 'user',
        author: 'You',
        text: 'Can you confirm the Convex deployment is healthy after the latest inbox/chat migration?',
        timestampLabel: '09:15',
        createdAt: Date.now() - 1000 * 60 * 60
      });
      await ctx.db.insert('messages', {
        conversationId: priyaId,
        sender: 'contact',
        author: 'Priya',
        text: 'The deployment is up. I am checking the remaining logs and will post a status note in the operational inbox.',
        timestampLabel: '09:18',
        createdAt: Date.now() - 1000 * 60 * 55
      });
      await ctx.db.insert('messages', {
        conversationId: priyaId,
        sender: 'contact',
        author: 'Priya',
        text: 'The realtime subscriptions look stable. Next step is tightening auth on the backend functions.',
        timestampLabel: '09:25',
        createdAt: Date.now() - 1000 * 60 * 50
      });

      await ctx.db.insert('messages', {
        conversationId: jordanId,
        sender: 'contact',
        author: 'Jordan',
        text: 'We noticed an access review item that needs confirmation before school credentials are shared more broadly.',
        timestampLabel: 'Yesterday',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2
      });
      await ctx.db.insert('messages', {
        conversationId: jordanId,
        sender: 'user',
        author: 'You',
        text: 'Please revoke anything stale and keep the final note in the operational inbox.',
        timestampLabel: 'Yesterday',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000
      });
    }

    if (existingInbox.length === 0) {
      await ctx.db.insert('inboxItems', {
        title: 'Finance follow-up needs review',
        body: 'A parent billing thread is waiting for admin + accounts review before closure.',
        status: 'unread',
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        actions: [{ id: 'open-chat', label: 'Open thread', type: 'redirect', style: 'primary' }]
      });
      await ctx.db.insert('inboxItems', {
        title: 'Platform access record updated',
        body: 'One school credential record changed and should be checked in Platform Access.',
        status: 'unread',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        actions: [{ id: 'open-access', label: 'Open access', type: 'redirect', style: 'primary' }]
      });
      await ctx.db.insert('inboxItems', {
        title: 'Attendance escalation drafted',
        body: 'An attendance-related follow-up was drafted and is ready for triage in the operational inbox.',
        status: 'read',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        actions: [{ id: 'open-inbox', label: 'Review item', type: 'redirect', style: 'default' }]
      });
    }

    return { ok: true };
  }
});
