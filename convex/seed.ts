import { mutation } from './_generated/server';

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingConversations = await ctx.db.query('conversations').collect();
    const existingInbox = await ctx.db.query('inboxItems').collect();

    if (existingConversations.length === 0) {
      const alexId = await ctx.db.insert('conversations', {
        name: 'Alex from Support',
        title: 'Billing Issue #4821',
        status: 'online',
        initials: 'AS',
        quickReplies: [
          "That's perfect, thank you!",
          'Can I get a receipt for the refund?',
          'I also have a question about upgrading.'
        ],
        updatedAt: Date.now() - 1000 * 60 * 5
      });

      const priyaId = await ctx.db.insert('conversations', {
        name: 'Priya from Engineering',
        title: 'API Integration Help',
        status: 'online',
        initials: 'PE',
        quickReplies: [
          'That would be very helpful.',
          'Can you also share the rate limit docs?',
          "We're also seeing timeouts on the webhook endpoint."
        ],
        updatedAt: Date.now() - 1000 * 60 * 30
      });

      const jordanId = await ctx.db.insert('conversations', {
        name: 'Jordan from Security',
        title: 'Account Access Request',
        status: 'offline',
        initials: 'JS',
        quickReplies: [
          'Can I also see a list of all active sessions?',
          'Please reset my password as well.',
          'Has any data been accessed from that session?'
        ],
        updatedAt: Date.now() - 1000 * 60 * 60 * 24
      });

      await ctx.db.insert('messages', {
        conversationId: alexId,
        sender: 'contact',
        author: 'Alex',
        text: "Hi there! I can see you were charged twice for the Pro plan this month. I've already initiated a refund for the duplicate charge.",
        timestampLabel: '10:02',
        createdAt: Date.now() - 1000 * 60 * 20
      });
      await ctx.db.insert('messages', {
        conversationId: alexId,
        sender: 'user',
        author: 'You',
        text: 'Thanks for catching that. How long will the refund take to process?',
        timestampLabel: '10:05',
        createdAt: Date.now() - 1000 * 60 * 18
      });
      await ctx.db.insert('messages', {
        conversationId: alexId,
        sender: 'contact',
        author: 'Alex',
        text: 'Typically 3-5 business days depending on your bank. You should see a pending credit within 24 hours though. Is there anything else I can help with?',
        timestampLabel: '10:08',
        createdAt: Date.now() - 1000 * 60 * 15
      });

      await ctx.db.insert('messages', {
        conversationId: priyaId,
        sender: 'user',
        author: 'You',
        text: "I'm getting a 429 rate limit error when calling the /api/products endpoint. We're only making about 50 requests per minute.",
        timestampLabel: '09:15',
        createdAt: Date.now() - 1000 * 60 * 60
      });
      await ctx.db.insert('messages', {
        conversationId: priyaId,
        sender: 'contact',
        author: 'Priya',
        text: "I checked your API key — it's on the Starter tier which has a 30 req/min limit. You'll need the Growth plan for 200 req/min. Would you like me to upgrade it?",
        timestampLabel: '09:18',
        createdAt: Date.now() - 1000 * 60 * 55
      });
      await ctx.db.insert('messages', {
        conversationId: priyaId,
        sender: 'contact',
        author: 'Priya',
        text: "Great question — our SDK handles this automatically if you enable autoRetry in the config. I'll send you a code snippet.",
        timestampLabel: '09:25',
        createdAt: Date.now() - 1000 * 60 * 50
      });

      await ctx.db.insert('messages', {
        conversationId: jordanId,
        sender: 'contact',
        author: 'Jordan',
        text: "We noticed a login attempt from an unrecognized device. We've temporarily locked the session as a precaution.",
        timestampLabel: 'Yesterday',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2
      });
      await ctx.db.insert('messages', {
        conversationId: jordanId,
        sender: 'user',
        author: 'You',
        text: 'No, that was not me. Can you revoke that session and enable 2FA on my account?',
        timestampLabel: 'Yesterday',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000
      });
    }

    if (existingInbox.length === 0) {
      await ctx.db.insert('inboxItems', {
        title: 'New support escalation',
        body: 'Alex flagged a billing follow-up that may need admin review.',
        status: 'unread',
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        actions: [{ id: 'open-chat', label: 'Open chat', type: 'redirect', style: 'primary' }]
      });
      await ctx.db.insert('inboxItems', {
        title: 'Access credentials updated',
        body: 'Platform Access records were updated for one school account.',
        status: 'unread',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        actions: [{ id: 'view', label: 'View access', type: 'redirect', style: 'primary' }]
      });
      await ctx.db.insert('inboxItems', {
        title: 'Payment reminder review',
        body: 'A parent billing follow-up is ready for review in the inbox.',
        status: 'read',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        actions: [
          { id: 'view-product', label: 'Open inbox item', type: 'redirect', style: 'default' }
        ]
      });
    }

    return { ok: true };
  }
});
