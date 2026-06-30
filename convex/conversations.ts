import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuthenticatedUser, getOrganizationIdFromIdentity } from './lib/auth';

type IdentityLike = Awaited<ReturnType<typeof requireAuthenticatedUser>> & Record<string, unknown>;

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readEmail(identity: IdentityLike) {
  return (
    readString(identity.email) ||
    readString(identity.email_address) ||
    readString(identity.primary_email_address)
  ).toLowerCase();
}

function readDisplayName(identity: IdentityLike) {
  return readString(identity.name) || readEmail(identity) || 'You';
}

function sameLabel(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function isLegacyConversationNamedForCurrentUser(
  conversation: { name: string },
  identity: IdentityLike
) {
  const email = readEmail(identity);
  const name = readDisplayName(identity);
  return Boolean(
    (email && sameLabel(conversation.name, email)) || (name && sameLabel(conversation.name, name))
  );
}

function messageSenderForViewer(
  message: {
    sender: 'user' | 'contact';
    authorUserId?: string;
    authorEmail?: string;
  },
  conversation: { name: string },
  identity: IdentityLike
): 'user' | 'contact' {
  const currentUserId = readString(identity.subject);
  const currentEmail = readEmail(identity);

  if (message.authorUserId) {
    return message.authorUserId === currentUserId ? 'user' : 'contact';
  }

  if (message.authorEmail) {
    return sameLabel(message.authorEmail, currentEmail) ? 'user' : 'contact';
  }

  if (
    message.sender === 'user' &&
    isLegacyConversationNamedForCurrentUser(conversation, identity)
  ) {
    return 'contact';
  }

  return message.sender;
}

function initialsFor(name: string) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return initials || 'ST';
}

function timeLabel() {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function isParticipant(
  conversation: { participantUserIds?: string[]; participantEmails?: string[] },
  identity: IdentityLike
) {
  const userId = readString(identity.subject);
  const email = readEmail(identity);

  return (
    (userId && conversation.participantUserIds?.includes(userId)) ||
    (email && conversation.participantEmails?.map((value) => value.toLowerCase()).includes(email))
  );
}

function displayConversation(
  conversation: {
    _id: string;
    name: string;
    title: string;
    status: 'online' | 'offline';
    initials: string;
    quickReplies: string[];
  },
  lastMessage: Array<{
    _id: string;
    sender: 'user' | 'contact';
    authorUserId?: string;
    authorEmail?: string;
    author: string;
    text: string;
    timestampLabel: string;
    attachments?: Array<{ id: string; name: string; size: number; type: string }>;
  }>,
  identity: IdentityLike
) {
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
      sender: messageSenderForViewer(message, conversation, identity),
      author: message.author,
      text: message.text,
      timestamp: message.timestampLabel,
      attachments: message.attachments
    }))
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = (await requireAuthenticatedUser(ctx)) as IdentityLike;
    const orgId = getOrganizationIdFromIdentity(identity);

    const conversations = await ctx.db
      .query('conversations')
      .withIndex('by_updatedAt')
      .order('desc')
      .collect();

    const visible = conversations.filter((conversation) => {
      if (!conversation.participantUserIds?.length && !conversation.participantEmails?.length) {
        return false;
      }

      if (orgId && conversation.orgId && conversation.orgId !== orgId) {
        return false;
      }

      return isParticipant(conversation, identity);
    });

    return Promise.all(
      visible.map(async (conversation) => {
        const lastMessage = await ctx.db
          .query('messages')
          .withIndex('by_conversation', (q) => q.eq('conversationId', conversation._id))
          .order('desc')
          .take(1);

        return displayConversation(conversation, lastMessage, identity);
      })
    );
  }
});

export const getMessages = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const identity = (await requireAuthenticatedUser(ctx)) as IdentityLike;
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation || !isParticipant(conversation, identity)) {
      return [];
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
      .order('asc')
      .collect();

    return messages.map((message) => ({
      id: message._id,
      sender: messageSenderForViewer(message, conversation, identity),
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
    const identity = (await requireAuthenticatedUser(ctx)) as IdentityLike;
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation || !isParticipant(conversation, identity)) return;

    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
  }
});

export const startConversation = mutation({
  args: {
    orgId: v.string(),
    memberUserId: v.string(),
    memberEmail: v.string(),
    memberName: v.string(),
    memberRole: v.string()
  },
  handler: async (ctx, args) => {
    const identity = (await requireAuthenticatedUser(ctx)) as IdentityLike;
    const currentUserId = readString(identity.subject);
    const currentEmail = readEmail(identity);
    const currentOrgId = getOrganizationIdFromIdentity(identity);

    if (!currentUserId) {
      throw new Error('User identity required.');
    }

    if (currentOrgId && currentOrgId !== args.orgId) {
      throw new Error('Active school workspace mismatch.');
    }

    if (args.memberUserId === currentUserId) {
      throw new Error('Choose another staff member to start a chat.');
    }

    const conversations = await ctx.db.query('conversations').collect();
    const existing = conversations.find((conversation) => {
      if (conversation.orgId !== args.orgId) return false;
      const participants = conversation.participantUserIds ?? [];
      return participants.includes(currentUserId) && participants.includes(args.memberUserId);
    });

    if (existing) {
      return { conversationId: existing._id };
    }

    const conversationId = await ctx.db.insert('conversations', {
      orgId: args.orgId,
      participantUserIds: [currentUserId, args.memberUserId].toSorted(),
      participantEmails: [currentEmail, args.memberEmail.trim().toLowerCase()]
        .filter(Boolean)
        .toSorted(),
      name: args.memberName,
      title: args.memberRole,
      status: 'online',
      initials: initialsFor(args.memberName),
      quickReplies: [
        'Thanks — I will check.',
        'Can you send the details?',
        'I will follow up today.'
      ],
      updatedAt: Date.now()
    });

    await ctx.db.insert('messages', {
      conversationId,
      sender: 'contact',
      author: 'Schly',
      text: `Chat started with ${args.memberName}.`,
      timestampLabel: timeLabel(),
      createdAt: Date.now()
    });

    return { conversationId };
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
    const identity = (await requireAuthenticatedUser(ctx)) as IdentityLike;
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation || !isParticipant(conversation, identity)) {
      throw new Error('Conversation not found.');
    }

    const trimmed = args.text.trim();
    if (!trimmed && (!args.attachments || args.attachments.length === 0)) {
      return null;
    }

    const messageId = await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      sender: 'user',
      authorUserId: readString(identity.subject),
      authorEmail: readEmail(identity),
      author: readDisplayName(identity),
      text: trimmed,
      timestampLabel: timeLabel(),
      attachments: args.attachments,
      createdAt: Date.now()
    });

    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
    return messageId;
  }
});
