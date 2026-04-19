import { query } from './_generated/server';
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

export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    let enquiries = await ctx.db
      .query('admissionsEnquiries')
      .withIndex('by_updatedAt')
      .order('desc')
      .collect();

    if (args.search) {
      const needle = args.search.toLowerCase();
      enquiries = enquiries.filter((enquiry) =>
        [
          enquiry.studentName,
          enquiry.familyName,
          enquiry.classInterest,
          enquiry.guardianName,
          enquiry.guardianPhone,
          enquiry.stage,
          enquiry.status,
          enquiry.source
        ].some((value) => value.toLowerCase().includes(needle))
      );
    }

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

    if (args.search) {
      const needle = args.search.toLowerCase();
      enquiries = enquiries.filter((enquiry) =>
        [
          enquiry.studentName,
          enquiry.familyName,
          enquiry.classInterest,
          enquiry.guardianName,
          enquiry.guardianPhone,
          enquiry.stage,
          enquiry.status,
          enquiry.source
        ].some((value) => value.toLowerCase().includes(needle))
      );
    }

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
