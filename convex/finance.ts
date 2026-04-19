import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Id, Doc } from './_generated/dataModel';
import { v } from 'convex/values';

import { requireAuthenticatedUser } from './lib/auth';

const BILLING_STATUSES = ['Current', 'Overdue', 'Scholarship', 'Custom'] as const;
const SCHOLARSHIP_TYPES = [
  'Partial Scholarship',
  'Full Scholarship',
  'Sibling Discount',
  'Hardship Support',
  'Negotiated Custom'
] as const;
const CHARGE_CATEGORIES = ['Tuition', 'Registration', 'Meal Plan', 'Transport', 'Other'] as const;
const CHARGE_STATUSES = ['Pending', 'Paid', 'Overdue', 'Waived'] as const;
const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Card', 'Wallet', 'Scholarship Credit'] as const;

function matchesSearch(
  item: {
    studentName: string;
    className: string;
    academicYear: string;
    billingStatus: string;
    scholarshipType: string;
    paymentPlan: string;
    notesSummary: string;
  },
  search?: string
) {
  if (!search) return true;
  const needle = search.toLowerCase();
  return [
    item.studentName,
    item.className,
    item.academicYear,
    item.billingStatus,
    item.scholarshipType,
    item.paymentPlan,
    item.notesSummary
  ].some((value) => value.toLowerCase().includes(needle));
}

function normalizeProfile(input: {
  studentId: Id<'students'>;
  baseMonthlyFee: number;
  billingStatus: (typeof BILLING_STATUSES)[number];
  scholarshipType?: (typeof SCHOLARSHIP_TYPES)[number];
  scholarshipPercent?: number;
  customMonthlyFee?: number;
  arrearsBalance: number;
  paymentPlan?: string;
  notesSummary?: string;
}) {
  if (input.baseMonthlyFee < 0) {
    throw new Error('Base monthly fee cannot be negative.');
  }

  if (input.arrearsBalance < 0) {
    throw new Error('Arrears balance cannot be negative.');
  }

  return {
    studentId: input.studentId,
    baseMonthlyFee: input.baseMonthlyFee,
    billingStatus: input.billingStatus,
    scholarshipType: input.scholarshipType,
    scholarshipPercent: input.scholarshipPercent,
    customMonthlyFee: input.customMonthlyFee,
    arrearsBalance: input.arrearsBalance,
    paymentPlan: input.paymentPlan?.trim() ?? '',
    notesSummary: input.notesSummary?.trim() ?? '',
    updatedAt: Date.now()
  };
}

function normalizeCharge(input: {
  billingProfileId: Id<'studentBillingProfiles'>;
  title: string;
  category: (typeof CHARGE_CATEGORIES)[number];
  amount: number;
  chargeDate: string;
  dueDate: string;
  status: (typeof CHARGE_STATUSES)[number];
}) {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Charge title is required.');
  }
  if (input.amount < 0) {
    throw new Error('Charge amount cannot be negative.');
  }

  return {
    billingProfileId: input.billingProfileId,
    title,
    category: input.category,
    amount: input.amount,
    chargeDate: input.chargeDate,
    dueDate: input.dueDate,
    status: input.status,
    updatedAt: Date.now()
  };
}

function normalizePayment(input: {
  billingProfileId: Id<'studentBillingProfiles'>;
  amount: number;
  paidAt: string;
  method: (typeof PAYMENT_METHODS)[number];
  reference?: string;
  note?: string;
}) {
  if (input.amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  return {
    billingProfileId: input.billingProfileId,
    amount: input.amount,
    paidAt: input.paidAt,
    method: input.method,
    reference: input.reference?.trim() ?? '',
    note: input.note?.trim() ?? '',
    createdAt: Date.now()
  };
}

type EnrichedProfile = {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  academicYear: string;
  status: string;
  billingStatus: (typeof BILLING_STATUSES)[number];
  scholarshipType: string;
  scholarshipPercent: number;
  baseMonthlyFee: number;
  effectiveMonthlyFee: number;
  customMonthlyFee: number;
  arrearsBalance: number;
  paymentPlan: string;
  notesSummary: string;
  totalOutstanding: number;
  chargesCount: number;
  recentPaymentAmount: number;
  updatedAt: number;
};

type FinanceProfileDetail = EnrichedProfile & {
  charges: Array<{
    id: string;
    title: string;
    category: (typeof CHARGE_CATEGORIES)[number];
    amount: number;
    chargeDate: string;
    dueDate: string;
    status: (typeof CHARGE_STATUSES)[number];
    updatedAt: number;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paidAt: string;
    method: (typeof PAYMENT_METHODS)[number];
    reference: string;
    note: string;
    createdAt: number;
  }>;
};

async function enrichProfile(
  ctx: QueryCtx | MutationCtx,
  profile: Doc<'studentBillingProfiles'>
): Promise<EnrichedProfile | null> {
  const student = await ctx.db.get(profile.studentId);
  if (!student) return null;

  const charges = await ctx.db
    .query('financeCharges')
    .withIndex('by_profile', (q) => q.eq('billingProfileId', profile._id))
    .order('desc')
    .collect();
  const payments = await ctx.db
    .query('financePayments')
    .withIndex('by_profile', (q) => q.eq('billingProfileId', profile._id))
    .order('desc')
    .collect();

  const unpaidCharges = charges.filter(
    (charge) => charge.status === 'Pending' || charge.status === 'Overdue'
  );
  const totalOutstanding =
    unpaidCharges.reduce((sum, charge) => sum + charge.amount, 0) + profile.arrearsBalance;
  const effectiveMonthlyFee =
    profile.customMonthlyFee ??
    Math.round(profile.baseMonthlyFee * (1 - (profile.scholarshipPercent ?? 0) / 100));

  return {
    id: profile._id,
    studentId: student._id,
    studentName: student.fullName,
    className: student.className,
    academicYear: student.academicYear ?? '',
    status: student.status,
    billingStatus: profile.billingStatus,
    scholarshipType: profile.scholarshipType ?? '',
    scholarshipPercent: profile.scholarshipPercent ?? 0,
    baseMonthlyFee: profile.baseMonthlyFee,
    effectiveMonthlyFee,
    customMonthlyFee: profile.customMonthlyFee ?? 0,
    arrearsBalance: profile.arrearsBalance,
    paymentPlan: profile.paymentPlan ?? '',
    notesSummary: profile.notesSummary ?? '',
    totalOutstanding,
    chargesCount: charges.length,
    recentPaymentAmount: payments[0]?.amount ?? 0,
    updatedAt: profile.updatedAt
  };
}

function isProfile(value: EnrichedProfile | null): value is EnrichedProfile {
  return value !== null;
}

export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const profiles = await ctx.db
      .query('studentBillingProfiles')
      .withIndex('by_updatedAt')
      .order('desc')
      .collect();

    const enriched = (
      await Promise.all(profiles.map((profile) => enrichProfile(ctx, profile)))
    ).filter(isProfile);
    return enriched.filter((profile) => matchesSearch(profile, args.search));
  }
});

export const summary = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const profiles = await ctx.db
      .query('studentBillingProfiles')
      .withIndex('by_updatedAt')
      .order('desc')
      .collect();
    const charges = await ctx.db
      .query('financeCharges')
      .withIndex('by_updatedAt')
      .order('desc')
      .collect();
    const payments = await ctx.db
      .query('financePayments')
      .withIndex('by_createdAt')
      .order('desc')
      .collect();

    const outstandingCharges = charges
      .filter((charge) => charge.status === 'Pending' || charge.status === 'Overdue')
      .reduce((sum, charge) => sum + charge.amount, 0);
    const arrearsBalance = profiles.reduce((sum, profile) => sum + profile.arrearsBalance, 0);
    const collectedThisMonth = payments
      .filter((payment) => payment.paidAt.slice(0, 7) === new Date().toISOString().slice(0, 7))
      .reduce((sum, payment) => sum + payment.amount, 0);

    return {
      profiles: profiles.length,
      overdueProfiles: profiles.filter((profile) => profile.billingStatus === 'Overdue').length,
      scholarshipProfiles: profiles.filter((profile) => profile.billingStatus === 'Scholarship')
        .length,
      totalOutstanding: outstandingCharges + arrearsBalance,
      collectedThisMonth
    };
  }
});

async function loadProfileDetail(
  ctx: QueryCtx | MutationCtx,
  billingProfileId: Id<'studentBillingProfiles'>
): Promise<FinanceProfileDetail | null> {
  const profile = await ctx.db.get(billingProfileId);
  if (!profile) return null;

  const enriched = await enrichProfile(ctx, profile);
  if (!enriched) return null;

  const charges = await ctx.db
    .query('financeCharges')
    .withIndex('by_profile', (q) => q.eq('billingProfileId', billingProfileId))
    .order('desc')
    .collect();
  const payments = await ctx.db
    .query('financePayments')
    .withIndex('by_profile', (q) => q.eq('billingProfileId', billingProfileId))
    .order('desc')
    .collect();

  return {
    ...enriched,
    charges: charges.map((charge) => ({
      id: charge._id,
      title: charge.title,
      category: charge.category,
      amount: charge.amount,
      chargeDate: charge.chargeDate,
      dueDate: charge.dueDate,
      status: charge.status,
      updatedAt: charge.updatedAt
    })),
    payments: payments.map((payment) => ({
      id: payment._id,
      amount: payment.amount,
      paidAt: payment.paidAt,
      method: payment.method,
      reference: payment.reference ?? '',
      note: payment.note ?? '',
      createdAt: payment.createdAt
    }))
  };
}

export const getByProfileId = query({
  args: { billingProfileId: v.id('studentBillingProfiles') },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    return await loadProfileDetail(ctx, args.billingProfileId);
  }
});

export const getByStudentId = query({
  args: { studentId: v.id('students') },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const profile = await ctx.db
      .query('studentBillingProfiles')
      .withIndex('by_student', (q) => q.eq('studentId', args.studentId))
      .order('desc')
      .first();
    if (!profile) return null;
    return await loadProfileDetail(ctx, profile._id);
  }
});

export const createProfile = mutation({
  args: {
    studentId: v.id('students'),
    baseMonthlyFee: v.number(),
    billingStatus: v.union(...BILLING_STATUSES.map((item) => v.literal(item))),
    scholarshipType: v.optional(v.union(...SCHOLARSHIP_TYPES.map((item) => v.literal(item)))),
    scholarshipPercent: v.optional(v.number()),
    customMonthlyFee: v.optional(v.number()),
    arrearsBalance: v.number(),
    paymentPlan: v.optional(v.string()),
    notesSummary: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const existing = await ctx.db
      .query('studentBillingProfiles')
      .withIndex('by_student', (q) => q.eq('studentId', args.studentId))
      .first();
    if (existing) {
      throw new Error('Billing profile already exists for this student.');
    }
    const billingProfileId = await ctx.db.insert('studentBillingProfiles', normalizeProfile(args));
    return { billingProfileId };
  }
});

export const updateProfile = mutation({
  args: {
    billingProfileId: v.id('studentBillingProfiles'),
    studentId: v.id('students'),
    baseMonthlyFee: v.number(),
    billingStatus: v.union(...BILLING_STATUSES.map((item) => v.literal(item))),
    scholarshipType: v.optional(v.union(...SCHOLARSHIP_TYPES.map((item) => v.literal(item)))),
    scholarshipPercent: v.optional(v.number()),
    customMonthlyFee: v.optional(v.number()),
    arrearsBalance: v.number(),
    paymentPlan: v.optional(v.string()),
    notesSummary: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const existing = await ctx.db.get(args.billingProfileId);
    if (!existing) throw new Error('Billing profile not found.');
    await ctx.db.patch(args.billingProfileId, normalizeProfile(args));
    return { billingProfileId: args.billingProfileId };
  }
});

export const addCharge = mutation({
  args: {
    billingProfileId: v.id('studentBillingProfiles'),
    title: v.string(),
    category: v.union(...CHARGE_CATEGORIES.map((item) => v.literal(item))),
    amount: v.number(),
    chargeDate: v.string(),
    dueDate: v.string(),
    status: v.union(...CHARGE_STATUSES.map((item) => v.literal(item)))
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const existing = await ctx.db.get(args.billingProfileId);
    if (!existing) throw new Error('Billing profile not found.');
    const chargeId = await ctx.db.insert('financeCharges', normalizeCharge(args));
    await ctx.db.patch(args.billingProfileId, { updatedAt: Date.now() });
    return { chargeId };
  }
});

export const addPayment = mutation({
  args: {
    billingProfileId: v.id('studentBillingProfiles'),
    amount: v.number(),
    paidAt: v.string(),
    method: v.union(...PAYMENT_METHODS.map((item) => v.literal(item))),
    reference: v.optional(v.string()),
    note: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const existing = await ctx.db.get(args.billingProfileId);
    if (!existing) throw new Error('Billing profile not found.');
    const paymentId = await ctx.db.insert('financePayments', normalizePayment(args));
    await ctx.db.patch(args.billingProfileId, { updatedAt: Date.now() });
    return { paymentId };
  }
});
