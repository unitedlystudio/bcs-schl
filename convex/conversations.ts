import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db
      .query('conversations')
      .withIndex('by_updatedAt')
      .order('desc')
      .collect();

    return Promise.all(
      conversations.map(async (conversation) => {
        const lastMessage = await ctx.db
          .query('messages')
          .withIndex('by_conversation', (q) => q.eq('conversationId', conversation._id))
          .order('desc')
          .take(1);

        return {
          id: conversation._id,
          name: conversation.name,
          title: conversation.title,
          status: conversation.status,
          initials: conversation.initials,
          unread: 0,
          quickReplies: conversation.quickReplies,
          messages: lastMessage.map((message) => ({
            id: message._id,
            sender: message.sender,
            author: message.author,
            text: message.text,
            timestamp: message.timestampLabel,
            attachments: message.attachments
          }))
        };
      })
    );
  }
});

export const getMessages = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
      .order('asc')
      .collect();

    return messages.map((message) => ({
      id: message._id,
      sender: message.sender,
      author: message.author,
      text: message.text,
      timestamp: message.timestampLabel,
      attachments: message.attachments
    }));
  }
});

export const markRead = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;

    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
  }
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id('conversations'),
    text: v.string(),
    attachments: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          size: v.number(),
          type: v.string()
        })
      )
    )
  },
  handler: async (ctx, args) => {
    const trimmed = args.text.trim();
    if (!trimmed && (!args.attachments || args.attachments.length === 0)) {
      return null;
    }

    const timestampLabel = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const messageId = await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      sender: 'user',
      author: 'You',
      text: trimmed,
      timestampLabel,
      attachments: args.attachments,
      createdAt: Date.now()
    });

    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
    return messageId;
  }
});
