import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  conversations: defineTable({
    name: v.string(),
    title: v.string(),
    status: v.union(v.literal('online'), v.literal('offline')),
    initials: v.string(),
    quickReplies: v.array(v.string()),
    updatedAt: v.number()
  }).index('by_updatedAt', ['updatedAt']),

  messages: defineTable({
    conversationId: v.id('conversations'),
    sender: v.union(v.literal('user'), v.literal('contact')),
    author: v.string(),
    text: v.string(),
    timestampLabel: v.string(),
    attachments: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          size: v.number(),
          type: v.string()
        })
      )
    ),
    createdAt: v.number()
  }).index('by_conversation', ['conversationId', 'createdAt']),

  inboxItems: defineTable({
    title: v.string(),
    body: v.string(),
    status: v.union(v.literal('unread'), v.literal('read'), v.literal('archived')),
    createdAt: v.string(),
    actions: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          type: v.union(
            v.literal('redirect'),
            v.literal('api_call'),
            v.literal('workflow'),
            v.literal('modal')
          ),
          style: v.optional(
            v.union(v.literal('primary'), v.literal('danger'), v.literal('default'))
          ),
          executed: v.optional(v.boolean())
        })
      )
    )
  })
    .index('by_createdAt', ['createdAt'])
    .index('by_status', ['status', 'createdAt']),

  accessRecords: defineTable({
    category: v.union(
      v.literal('Business Suite'),
      v.literal('Subscriptions'),
      v.literal('Social Media')
    ),
    platform: v.string(),
    fullName: v.string(),
    loginUrl: v.string(),
    username: v.string(),
    password: v.string(),
    listingUrl: v.string(),
    adminsAccess: v.string(),
    recoveryNumber: v.string(),
    status: v.union(v.literal('Needs setup'), v.literal('Partial'), v.literal('Ready')),
    sortOrder: v.number()
  })
    .index('by_sortOrder', ['sortOrder'])
    .index('by_category', ['category', 'sortOrder'])
    .index('by_status', ['status', 'sortOrder']),

  students: defineTable({
    preferredName: v.string(),
    fullName: v.string(),
    sex: v.union(v.literal('M'), v.literal('F'), v.literal('Unknown')),
    className: v.string(),
    dateOfBirth: v.string(),
    dateJoined: v.string(),
    nisn: v.string(),
    religion: v.string(),
    status: v.union(v.literal('Active'), v.literal('Pending'), v.literal('Archived')),
    guardianName: v.string(),
    guardianPhone: v.string(),
    medicalFlag: v.optional(v.string()),
    notesSummary: v.optional(v.string()),
    sortName: v.string()
  })
    .index('by_sortName', ['sortName'])
    .index('by_className', ['className', 'sortName'])
    .index('by_status', ['status', 'sortName'])
});
