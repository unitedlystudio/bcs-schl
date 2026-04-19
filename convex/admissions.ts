import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuthenticatedUser } from './lib/auth';

const ADMISSIONS_STAGES = [
  'New',
  'Contacted',
  'Tour Scheduled',
  'Application in Progress',
  'Decision Pending',
  'Enrolled',
  'Closed'
] as const;

const ADMISSIONS_STATUSES = ['Active', 'Waiting', 'Won', 'Lost'] as const;

function matchesSearch(
  enquiry: {
    studentName: string;
    familyName: string;
    classInterest: string;
    guardianName: string;
    guardianPhone: string;
    stage: string;
    status: string;
    source: string;
  },
  search?: string
) {
  if (!search) {
    return true;
  }

  const needle = search.toLowerCase();
  return [
    enquiry.studentName,
    enquiry.familyName,
    enquiry.classInterest,
    enquiry.guardianName,
    enquiry.guardianPhone,
    enquiry.stage,
    enquiry.status,
    enquiry.source
  ].some((value) => value.toLowerCase().includes(needle));
}

function normalizeEnquiry(input: {
  studentName: string;
  familyName?: string;
  classInterest?: string;
  guardianName?: string;
  guardianPhone?: string;
  source?: string;
  enquiryDate: string;
  stage: (typeof ADMISSIONS_STAGES)[number];
  status: (typeof ADMISSIONS_STATUSES)[number];
  notesSummary?: string;
}) {
  const studentName = input.studentName.trim();
  const enquiryDate = input.enquiryDate.trim();

  if (!studentName) {
    throw new Error('Student name is required.');
  }

  if (!enquiryDate) {
    throw new Error('Enquiry date is required.');
  }

  return {
    studentName,
    familyName: input.familyName?.trim() ?? '',
    classInterest: input.classInterest?.trim() ?? '',
    guardianName: input.guardianName?.trim() ?? '',
    guardianPhone: input.guardianPhone?.trim() ?? '',
    source: input.source?.trim() ?? '',
    enquiryDate,
    stage: input.stage,
    status: input.status,
    notesSummary: input.notesSummary?.trim() ?? '',
    sortName: studentName,
    updatedAt: Date.now()
  };
}

export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    let enquiries = await ctx.db
      .query('admissionsEnquiries')
      .withIndex('by_updatedAt')
      .order('desc')
      .collect();

    enquiries = enquiries.filter((enquiry) => matchesSearch(enquiry, args.search));

    return enquiries.map((enquiry) => ({
      id: enquiry._id,
      studentName: enquiry.studentName,
      familyName: enquiry.familyName,
      classInterest: enquiry.classInterest,
      guardianName: enquiry.guardianName,
      guardianPhone: enquiry.guardianPhone,
      source: enquiry.source,
      enquiryDate: enquiry.enquiryDate,
      stage: enquiry.stage,
      status: enquiry.status,
      notesSummary: enquiry.notesSummary
    }));
  }
});

export const board = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    let enquiries = await ctx.db
      .query('admissionsEnquiries')
      .withIndex('by_updatedAt')
      .order('desc')
      .collect();

    enquiries = enquiries.filter((enquiry) => matchesSearch(enquiry, args.search));

    const columns = ADMISSIONS_STAGES.map((stage) => {
      const items = enquiries
        .filter((enquiry) => enquiry.stage === stage)
        .slice(0, 5)
        .map((enquiry) => ({
          id: enquiry._id,
          studentName: enquiry.studentName,
          familyName: enquiry.familyName,
          classInterest: enquiry.classInterest,
          guardianName: enquiry.guardianName,
          status: enquiry.status,
          enquiryDate: enquiry.enquiryDate
        }));

      return {
        stage,
        count: enquiries.filter((enquiry) => enquiry.stage === stage).length,
        items
      };
    });

    return {
      total: enquiries.length,
      active: enquiries.filter((enquiry) => enquiry.status === 'Active').length,
      waiting: enquiries.filter((enquiry) => enquiry.status === 'Waiting').length,
      won: enquiries.filter((enquiry) => enquiry.status === 'Won').length,
      lost: enquiries.filter((enquiry) => enquiry.status === 'Lost').length,
      columns
    };
  }
});

export const recent = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const enquiries = await ctx.db
      .query('admissionsEnquiries')
      .withIndex('by_updatedAt')
      .order('desc')
      .take(5);

    return enquiries.map((enquiry) => ({
      id: enquiry._id,
      studentName: enquiry.studentName,
      familyName: enquiry.familyName,
      classInterest: enquiry.classInterest,
      guardianName: enquiry.guardianName,
      status: enquiry.status,
      stage: enquiry.stage,
      enquiryDate: enquiry.enquiryDate
    }));
  }
});

export const getById = query({
  args: { enquiryId: v.id('admissionsEnquiries') },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const enquiry = await ctx.db.get(args.enquiryId);
    if (!enquiry) {
      return null;
    }

    return {
      id: enquiry._id,
      studentName: enquiry.studentName,
      familyName: enquiry.familyName,
      classInterest: enquiry.classInterest,
      guardianName: enquiry.guardianName,
      guardianPhone: enquiry.guardianPhone,
      source: enquiry.source,
      enquiryDate: enquiry.enquiryDate,
      stage: enquiry.stage,
      status: enquiry.status,
      notesSummary: enquiry.notesSummary
    };
  }
});

export const create = mutation({
  args: {
    studentName: v.string(),
    familyName: v.optional(v.string()),
    classInterest: v.optional(v.string()),
    guardianName: v.optional(v.string()),
    guardianPhone: v.optional(v.string()),
    source: v.optional(v.string()),
    enquiryDate: v.string(),
    stage: v.union(
      v.literal('New'),
      v.literal('Contacted'),
      v.literal('Tour Scheduled'),
      v.literal('Application in Progress'),
      v.literal('Decision Pending'),
      v.literal('Enrolled'),
      v.literal('Closed')
    ),
    status: v.union(v.literal('Active'), v.literal('Waiting'), v.literal('Won'), v.literal('Lost')),
    notesSummary: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const enquiryId = await ctx.db.insert('admissionsEnquiries', normalizeEnquiry(args));
    return { enquiryId };
  }
});

export const update = mutation({
  args: {
    enquiryId: v.id('admissionsEnquiries'),
    studentName: v.string(),
    familyName: v.optional(v.string()),
    classInterest: v.optional(v.string()),
    guardianName: v.optional(v.string()),
    guardianPhone: v.optional(v.string()),
    source: v.optional(v.string()),
    enquiryDate: v.string(),
    stage: v.union(
      v.literal('New'),
      v.literal('Contacted'),
      v.literal('Tour Scheduled'),
      v.literal('Application in Progress'),
      v.literal('Decision Pending'),
      v.literal('Enrolled'),
      v.literal('Closed')
    ),
    status: v.union(v.literal('Active'), v.literal('Waiting'), v.literal('Won'), v.literal('Lost')),
    notesSummary: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const existing = await ctx.db.get(args.enquiryId);
    if (!existing) {
      throw new Error('Admissions enquiry not found.');
    }

    const normalized = normalizeEnquiry(args);
    await ctx.db.patch(args.enquiryId, normalized);
    return { enquiryId: args.enquiryId };
  }
});
