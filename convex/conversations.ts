import { mutation, query, type QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { requirePermission } from './lib/auth';

type IdentityLike = Awaited<ReturnType<typeof requirePermission>> & Record<string, unknown>;

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

type StoredAttachment = {
  id: string;
  storageId?: Id<'_storage'>;
  name: string;
  size: number;
  type: string;
};

async function attachmentViews(ctx: QueryCtx, attachments?: StoredAttachment[]) {
  if (!attachments) return undefined;

  return Promise.all(
    attachments.map(async (attachment) => ({
      ...attachment,
      url: attachment.storageId ? await ctx.storage.getUrl(attachment.storageId) : undefined
    }))
  );
}

async function displayConversation(
  ctx: QueryCtx,
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
    attachments?: StoredAttachment[];
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
    messages: await Promise.all(
      lastMessage.map(async (message) => ({
        id: message._id,
        sender: messageSenderForViewer(message, conversation, identity),
        author: message.author,
        authorUserId: message.authorUserId,
        authorEmail: message.authorEmail,
        text: message.text,
        timestamp: message.timestampLabel,
        attachments: await attachmentViews(ctx, message.attachments)
      }))
    )
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = (await requirePermission(ctx, 'org:chat:read')) as IdentityLike;

    const conversations = await ctx.db
      .query('conversations')
      .withIndex('by_school_updatedAt', (q) => q.eq('schoolId', identity.schoolId as never))
      .order('desc')
      .collect();

    const visible = conversations.filter((conversation) => {
      if (!conversation.participantUserIds?.length && !conversation.participantEmails?.length) {
        return false;
      }

      return isParticipant(conversation, identity);
    });

    return Promise.all(
      visible.map(async (conversation) => {
        const lastMessage = await ctx.db
          .query('messages')
          .withIndex('by_school_conversation', (q) =>
            q.eq('schoolId', identity.schoolId as never).eq('conversationId', conversation._id)
          )
          .order('desc')
          .take(1);

        return displayConversation(ctx, conversation, lastMessage, identity);
      })
    );
  }
});

export const getMessages = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const identity = (await requirePermission(ctx, 'org:chat:read')) as IdentityLike;
    const conversation = await ctx.db.get(args.conversationId);

    if (
      !conversation ||
      conversation.schoolId !== identity.schoolId ||
      !isParticipant(conversation, identity)
    ) {
      return [];
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_school_conversation', (q) =>
        q.eq('schoolId', identity.schoolId as never).eq('conversationId', args.conversationId)
      )
      .order('asc')
      .collect();

    return Promise.all(
      messages.map(async (message) => ({
        id: message._id,
        sender: messageSenderForViewer(message, conversation, identity),
        author: message.author,
        authorUserId: message.authorUserId,
        authorEmail: message.authorEmail,
        text: message.text,
        timestamp: message.timestampLabel,
        attachments: await attachmentViews(ctx, message.attachments)
      }))
    );
  }
});

export const markRead = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const identity = (await requirePermission(ctx, 'org:chat:write')) as IdentityLike;
    const conversation = await ctx.db.get(args.conversationId);

    if (
      !conversation ||
      conversation.schoolId !== identity.schoolId ||
      !isParticipant(conversation, identity)
    )
      return;

    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
  }
});

export const generateAttachmentUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, 'org:chat:write');
    return ctx.storage.generateUploadUrl();
  }
});

export const startConversation = mutation({
  args: {
    memberUserId: v.id('appUsers')
  },
  handler: async (ctx, args) => {
    const identity = (await requirePermission(ctx, 'org:chat:write')) as IdentityLike;
    const currentUserId = readString(identity.subject);
    const currentEmail = readEmail(identity);

    if (!currentUserId) {
      throw new Error('User identity required.');
    }

    const member = await ctx.db.get(args.memberUserId);
    if (
      !member ||
      member.schoolId !== identity.schoolId ||
      member.status !== 'active' ||
      member.authUserId === currentUserId
    ) {
      throw new Error('Choose another staff member to start a chat.');
    }
    const memberRoles = await ctx.db
      .query('userRoles')
      .withIndex('by_user', (q) => q.eq('userId', member._id))
      .collect();
    if (memberRoles.length === 0) throw new Error('Staff member is not active.');
    const memberRole = await ctx.db.get(memberRoles[0].roleId);

    const conversations = await ctx.db
      .query('conversations')
      .withIndex('by_school_updatedAt', (q) => q.eq('schoolId', identity.schoolId as never))
      .collect();
    const existing = conversations.find((conversation) => {
      const participants = conversation.participantUserIds ?? [];
      return participants.includes(currentUserId) && participants.includes(member.authUserId);
    });

    if (existing) {
      return { conversationId: existing._id };
    }

    const conversationId = await ctx.db.insert('conversations', {
      schoolId: identity.schoolId as never,
      participantUserIds: [currentUserId, member.authUserId].toSorted(),
      participantEmails: [currentEmail, member.normalizedEmail].filter(Boolean).toSorted(),
      name: member.name ?? member.email,
      title: memberRole?.name ?? 'Staff',
      status: 'online',
      initials: initialsFor(member.name ?? member.email),
      quickReplies: [
        'Thanks — I will check.',
        'Can you send the details?',
        'I will follow up today.'
      ],
      updatedAt: Date.now()
    });

    await ctx.db.insert('messages', {
      schoolId: identity.schoolId as never,
      conversationId,
      sender: 'contact',
      author: 'Schly',
      text: `Chat started with ${member.name ?? member.email}.`,
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
    authorUserId: v.optional(v.string()),
    authorEmail: v.optional(v.string()),
    authorName: v.optional(v.string()),
    attachments: v.optional(
      v.array(
        v.object({
          id: v.string(),
          storageId: v.optional(v.id('_storage')),
          name: v.string(),
          size: v.number(),
          type: v.string()
        })
      )
    )
  },
  handler: async (ctx, args) => {
    const identity = (await requirePermission(ctx, 'org:chat:write')) as IdentityLike;
    const conversation = await ctx.db.get(args.conversationId);

    if (
      !conversation ||
      conversation.schoolId !== identity.schoolId ||
      !isParticipant(conversation, identity)
    ) {
      throw new Error('Conversation not found.');
    }

    const trimmed = args.text.trim();
    if (!trimmed && (!args.attachments || args.attachments.length === 0)) {
      return null;
    }

    const messageId = await ctx.db.insert('messages', {
      schoolId: identity.schoolId as never,
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
