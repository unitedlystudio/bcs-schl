import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Id, Doc } from './_generated/dataModel';
import { v } from 'convex/values';

import { requireFinanceReadUser, requireFinanceWriteUser } from './lib/auth';

const BILLING_STATUSES = ['Current', 'Overdue', 'Scholarship', 'Custom'] as const;
const SCHOLARSHIP_TYPES = [
  'Partial Scholarship',
  'Full Scholarship',
  'Sibling Discount',
  'Hardship Support',
  'Negotiated Custom'
] as const;
const BILLING_ITEM_CATEGORIES = [
  'Lunch Plan',
  'Extra Lesson',
  'Extracurricular',
  'Transport',
  'Other'
] as const;
const BILLING_ITEM_BEHAVIORS = ['Included', 'Charged', 'Available'] as const;
const CHARGE_CATEGORIES = [
  'Tuition',
  'Registration',
  'Lunch Plan',
  'Extra Lesson',
  'Extracurricular',
  'Transport',
  'Other'
] as const;
const CHARGE_STATUSES = ['Pending', 'Paid', 'Overdue', 'Waived'] as const;
const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Card', 'Wallet', 'Scholarship Credit'] as const;
const COLLECTION_STAGES = [
  'No follow-up',
  'Reminder queued',
  'In contact',
  'Promise to pay',
  'Escalated'
] as const;
const REMINDER_CHANNELS = ['Email', 'WhatsApp', 'Phone', 'In person', 'Not set'] as const;

type BillingItemCategory = (typeof BILLING_ITEM_CATEGORIES)[number];
type BillingItemBehavior = (typeof BILLING_ITEM_BEHAVIORS)[number];
type BillingItemInput = {
  id: string;
  label: string;
  category: BillingItemCategory;
  billingBehavior: BillingItemBehavior;
  monthlyAmount: number;
  notes?: string;
  sortOrder: number;
};

type BillingItemView = BillingItemInput & {
  notes: string;
};

type ReminderLogView = {
  id: string;
  reminderDate: string;
  channel: (typeof REMINDER_CHANNELS)[number];
  collectionStage: (typeof COLLECTION_STAGES)[number];
  outcome: string;
  nextActionDate: string;
  authorLabel: string;
  createdAt: number;
};

function compareReminderRecency(
  left: { reminderDate?: string; createdAt?: number },
  right: { reminderDate?: string; createdAt?: number }
) {
  const dateCompare = (right.reminderDate ?? '').localeCompare(left.reminderDate ?? '');
  if (dateCompare !== 0) return dateCompare;
  return (right.createdAt ?? 0) - (left.createdAt ?? 0);
}

function isDateOnlyString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function assertDateOnlyString(value: string, label: string) {
  if (!isDateOnlyString(value)) {
    throw new Error(`${label} must be a valid date in YYYY-MM-DD format.`);
  }
}

function matchesSearch(
  item: {
    studentName: string;
    className: string;
    academicYear: string;
    billingStatus: string;
    scholarshipType: string;
    paymentPlan: string;
    collectionStage: string;
    reminderChannel: string;
    notesSummary: string;
    billingItemsSummary: string;
    familyLabel: string;
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
    item.collectionStage,
    item.reminderChannel,
    item.notesSummary,
    item.billingItemsSummary,
    item.familyLabel
  ].some((value) => value.toLowerCase().includes(needle));
}

function normalizeBillingItems(items?: BillingItemInput[]) {
  return (items ?? []).reduce<BillingItemView[]>((sorted, item, index) => {
    const label = item.label.trim();
    if (!label) {
      throw new Error('Billing item label is required.');
    }
    if (item.monthlyAmount < 0) {
      throw new Error('Billing item amount cannot be negative.');
    }

    const normalized = {
      id: item.id.trim() || `item-${index + 1}`,
      label,
      category: item.category,
      billingBehavior: item.billingBehavior,
      monthlyAmount: item.monthlyAmount,
      notes: item.notes?.trim() ?? '',
      sortOrder: item.sortOrder
    };

    const insertAt = sorted.findIndex((current) => current.sortOrder > normalized.sortOrder);
    if (insertAt === -1) {
      sorted.push(normalized);
    } else {
      sorted.splice(insertAt, 0, normalized);
    }

    return sorted;
  }, []);
}

function summarizeBillingItems(items: BillingItemView[]) {
  const charged = items.filter((item) => item.billingBehavior === 'Charged');
  const included = items.filter((item) => item.billingBehavior === 'Included');
  const labels = [...charged, ...included].map((item) => item.label);
  return labels.join(' • ');
}

function normalizeProfile(input: {
  studentId: Id<'students'>;
  familyAccountId?: Id<'financeFamilyAccounts'>;
  baseMonthlyFee: number;
  billingStatus: (typeof BILLING_STATUSES)[number];
  scholarshipType?: (typeof SCHOLARSHIP_TYPES)[number];
  scholarshipPercent?: number;
  customMonthlyFee?: number;
  arrearsBalance: number;
  paymentPlan?: string;
  familyLabel?: string;
  collectionStage?: (typeof COLLECTION_STAGES)[number];
  reminderChannel?: (typeof REMINDER_CHANNELS)[number];
  lastReminderDate?: string;
  nextActionDate?: string;
  billingItems?: BillingItemInput[];
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
    familyAccountId: input.familyAccountId,
    baseMonthlyFee: input.baseMonthlyFee,
    billingStatus: input.billingStatus,
    scholarshipType: input.scholarshipType,
    scholarshipPercent: input.scholarshipPercent,
    customMonthlyFee: input.customMonthlyFee,
    arrearsBalance: input.arrearsBalance,
    paymentPlan: input.paymentPlan?.trim() ?? '',
    familyLabel: input.familyLabel?.trim() ?? '',
    collectionStage: input.collectionStage ?? 'No follow-up',
    reminderChannel: input.reminderChannel ?? 'Not set',
    lastReminderDate: input.lastReminderDate?.trim() ?? '',
    nextActionDate: input.nextActionDate?.trim() ?? '',
    billingItems: normalizeBillingItems(input.billingItems),
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
  billingCycleLabel?: string;
  status: (typeof CHARGE_STATUSES)[number];
}) {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Charge title is required.');
  }
  if (input.amount < 0) {
    throw new Error('Charge amount cannot be negative.');
  }

  const cycleLabel = deriveChargeCycleLabel(input.billingCycleLabel, input.chargeDate);

  return {
    billingProfileId: input.billingProfileId,
    title,
    category: input.category,
    amount: input.amount,
    chargeDate: input.chargeDate,
    dueDate: input.dueDate,
    billingCycleLabel: cycleLabel,
    billingCycleKey: deriveChargeCycleKey(input.chargeDate),
    status: input.status,
    updatedAt: Date.now()
  };
}

function deriveChargeCycleKey(chargeDate: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(chargeDate)) {
    return chargeDate.slice(0, 7);
  }
  return 'one-off';
}

function deriveChargeCycleLabel(billingCycleLabel: string | undefined, chargeDate: string) {
  const explicitLabel = billingCycleLabel?.trim();
  if (explicitLabel) return explicitLabel;

  if (/^\d{4}-\d{2}-\d{2}$/.test(chargeDate)) {
    const [year, month] = chargeDate.split('-');
    const monthIndex = Number(month) - 1;
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    const monthLabel = monthNames[monthIndex];
    if (monthLabel) {
      return `${monthLabel} ${year}`;
    }
  }

  return 'One-off / manual';
}

function calculateEffectiveBaseFee(profile: Doc<'studentBillingProfiles'>) {
  return (
    profile.customMonthlyFee ??
    Math.round(profile.baseMonthlyFee * (1 - (profile.scholarshipPercent ?? 0) / 100))
  );
}

function buildRecurringChargesForProfile(
  profile: Doc<'studentBillingProfiles'>,
  cycleDate: string,
  dueDate: string,
  billingCycleLabel?: string
) {
  const billingItems = normalizeBillingItems(
    profile.billingItems as BillingItemInput[] | undefined
  );
  const effectiveBaseFee = calculateEffectiveBaseFee(profile);
  const charges: Array<{
    title: string;
    category: (typeof CHARGE_CATEGORIES)[number];
    amount: number;
    chargeDate: string;
    dueDate: string;
    billingCycleLabel?: string;
    status: (typeof CHARGE_STATUSES)[number];
  }> = [];

  if (effectiveBaseFee > 0) {
    charges.push({
      title: 'Tuition',
      category: 'Tuition',
      amount: effectiveBaseFee,
      chargeDate: cycleDate,
      dueDate,
      billingCycleLabel,
      status: 'Pending'
    });
  }

  for (const item of billingItems) {
    if (item.billingBehavior !== 'Charged' || item.monthlyAmount <= 0) continue;
    charges.push({
      title: item.label,
      category: item.category,
      amount: item.monthlyAmount,
      chargeDate: cycleDate,
      dueDate,
      billingCycleLabel,
      status: 'Pending'
    });
  }

  return charges;
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

async function ensureFamilyAccount(
  ctx: MutationCtx,
  studentId: Id<'students'>,
  familyLabel?: string,
  existingProfile?: Doc<'studentBillingProfiles'> | null
): Promise<Id<'financeFamilyAccounts'> | undefined> {
  const accountLabel = familyLabel?.trim() ?? '';
  if (!accountLabel) return undefined;

  const student = await ctx.db.get(studentId);
  if (!student) {
    throw new Error('Student not found for finance family account.');
  }

  const payload = {
    accountLabel,
    primaryGuardianName: student.guardianName.trim(),
    primaryGuardianPhone: student.guardianPhone.trim(),
    updatedAt: Date.now()
  };

  if (existingProfile?.familyAccountId) {
    const existingAccount = await ctx.db.get(existingProfile.familyAccountId);
    if (existingAccount) {
      const linkedProfiles = await ctx.db
        .query('studentBillingProfiles')
        .withIndex('by_familyAccount', (q) =>
          q.eq('familyAccountId', existingProfile.familyAccountId)
        )
        .collect();
      if (existingAccount.accountLabel === accountLabel || linkedProfiles.length <= 1) {
        await ctx.db.patch(existingAccount._id, payload);
        return existingAccount._id;
      }
    }
  }

  const existingByLabel = await ctx.db
    .query('financeFamilyAccounts')
    .withIndex('by_label', (q) => q.eq('accountLabel', accountLabel))
    .order('desc')
    .first();
  if (existingByLabel) {
    await ctx.db.patch(existingByLabel._id, payload);
    return existingByLabel._id;
  }

  return await ctx.db.insert('financeFamilyAccounts', payload);
}

type FamilyAccountMember = {
  profileId: string;
  studentId: string;
  studentName: string;
  className: string;
  academicYear: string;
  billingStatus: (typeof BILLING_STATUSES)[number];
  totalOutstanding: number;
  effectiveMonthlyFee: number;
  nextActionDate: string;
};

type FamilyAccountSummary = {
  id: string;
  accountLabel: string;
  primaryGuardianName: string;
  primaryGuardianPhone: string;
  studentCount: number;
  totalOutstanding: number;
  monthlyRunRate: number;
  collectionStage: (typeof COLLECTION_STAGES)[number];
  nextActionDate: string;
  members: FamilyAccountMember[];
};

async function buildFamilyAccountSummary(
  ctx: QueryCtx | MutationCtx,
  familyAccountId: Id<'financeFamilyAccounts'>
): Promise<FamilyAccountSummary | null> {
  const account = await ctx.db.get(familyAccountId);
  if (!account) return null;

  const profiles = await ctx.db
    .query('studentBillingProfiles')
    .withIndex('by_familyAccount', (q) => q.eq('familyAccountId', familyAccountId))
    .order('desc')
    .collect();
  const enrichedProfiles = (
    await Promise.all(profiles.map((profile) => enrichProfile(ctx, profile)))
  ).filter(isProfile);

  const members = enrichedProfiles.map((profile) => ({
    profileId: profile.id,
    studentId: profile.studentId,
    studentName: profile.studentName,
    className: profile.className,
    academicYear: profile.academicYear,
    billingStatus: profile.billingStatus,
    totalOutstanding: profile.totalOutstanding,
    effectiveMonthlyFee: profile.effectiveMonthlyFee,
    nextActionDate: profile.nextActionDate
  }));

  const collectionStage = members.some((member) => member.billingStatus === 'Overdue')
    ? 'Escalated'
    : enrichedProfiles.some((profile) => profile.collectionStage === 'Escalated')
      ? 'Escalated'
      : enrichedProfiles.some((profile) => profile.collectionStage === 'Promise to pay')
        ? 'Promise to pay'
        : enrichedProfiles.some((profile) => profile.collectionStage === 'In contact')
          ? 'In contact'
          : enrichedProfiles.some((profile) => profile.collectionStage === 'Reminder queued')
            ? 'Reminder queued'
            : 'No follow-up';

  const nextActionDates = members.map((member) => member.nextActionDate).filter(Boolean);
  // eslint-disable-next-line unicorn/no-array-sort
  nextActionDates.sort((left, right) => left.localeCompare(right));
  const nextActionDate = nextActionDates[0] ?? '';

  return {
    id: account._id,
    accountLabel: account.accountLabel,
    primaryGuardianName: account.primaryGuardianName,
    primaryGuardianPhone: account.primaryGuardianPhone,
    studentCount: members.length,
    totalOutstanding: enrichedProfiles.reduce((sum, profile) => sum + profile.totalOutstanding, 0),
    monthlyRunRate: enrichedProfiles.reduce((sum, profile) => sum + profile.effectiveMonthlyFee, 0),
    collectionStage,
    nextActionDate,
    members
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
  familyAccountId: string;
  familyLabel: string;
  familyPrimaryGuardianName: string;
  familyPrimaryGuardianPhone: string;
  familyStudentCount: number;
  collectionStage: (typeof COLLECTION_STAGES)[number];
  reminderChannel: (typeof REMINDER_CHANNELS)[number];
  lastReminderDate: string;
  nextActionDate: string;
  billingItems: BillingItemView[];
  billingItemsSummary: string;
  billedAddOnCount: number;
  billedAddOnMonthlyTotal: number;
  notesSummary: string;
  totalOutstanding: number;
  chargesCount: number;
  recentPaymentAmount: number;
  recentPaymentDate: string;
  reminderCount: number;
  recentReminderDate: string;
  recentReminderOutcome: string;
  updatedAt: number;
};

type FinanceProfileDetail = EnrichedProfile & {
  familyAccount: FamilyAccountSummary | null;
  relatedProfiles: FamilyAccountMember[];
  charges: Array<{
    id: string;
    title: string;
    category: (typeof CHARGE_CATEGORIES)[number];
    amount: number;
    chargeDate: string;
    dueDate: string;
    billingCycleLabel: string;
    billingCycleKey: string;
    status: (typeof CHARGE_STATUSES)[number];
    appliedAmount: number;
    balanceRemaining: number;
    settlementLabel: string;
    applicationCount: number;
    updatedAt: number;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paidAt: string;
    method: (typeof PAYMENT_METHODS)[number];
    reference: string;
    note: string;
    appliedAmount: number;
    unappliedAmount: number;
    appliedChargeCount: number;
    settlementLabel: string;
    applications: Array<{
      id: string;
      chargeId: string;
      chargeTitle: string;
      chargeDueDate: string;
      chargeStatus: (typeof CHARGE_STATUSES)[number];
      amount: number;
    }>;
    createdAt: number;
  }>;
  reminders: ReminderLogView[];
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
  const reminders = await ctx.db
    .query('financeReminderLogs')
    .withIndex('by_profile', (q) => q.eq('billingProfileId', profile._id))
    .order('desc')
    .collect();
  const applications = await ctx.db
    .query('financePaymentApplications')
    .withIndex('by_profile', (q) => q.eq('billingProfileId', profile._id))
    .collect();
  const appliedByChargeId = new Map<string, number>();
  for (const application of applications) {
    appliedByChargeId.set(
      application.chargeId,
      (appliedByChargeId.get(application.chargeId) ?? 0) + application.amount
    );
  }
  const familyAccount = profile.familyAccountId ? await ctx.db.get(profile.familyAccountId) : null;
  const familyProfiles = profile.familyAccountId
    ? await ctx.db
        .query('studentBillingProfiles')
        .withIndex('by_familyAccount', (q) => q.eq('familyAccountId', profile.familyAccountId))
        .collect()
    : [];
  // eslint-disable-next-line unicorn/no-array-sort
  const latestReminder = [...reminders].sort(compareReminderRecency)[0];

  const unpaidCharges = charges.filter(
    (charge) => charge.status !== 'Waived' && charge.status !== 'Paid'
  );
  const totalOutstanding =
    unpaidCharges.reduce(
      (sum, charge) => sum + Math.max(charge.amount - (appliedByChargeId.get(charge._id) ?? 0), 0),
      0
    ) + profile.arrearsBalance;

  const billingItems = normalizeBillingItems(
    profile.billingItems as BillingItemInput[] | undefined
  );
  const billedAddOns = billingItems.filter((item) => item.billingBehavior === 'Charged');
  const billedAddOnMonthlyTotal = billedAddOns.reduce((sum, item) => sum + item.monthlyAmount, 0);

  const effectiveBaseFee =
    profile.customMonthlyFee ??
    Math.round(profile.baseMonthlyFee * (1 - (profile.scholarshipPercent ?? 0) / 100));
  const effectiveMonthlyFee = effectiveBaseFee + billedAddOnMonthlyTotal;

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
    familyAccountId: profile.familyAccountId ?? '',
    familyLabel: familyAccount?.accountLabel ?? profile.familyLabel ?? '',
    familyPrimaryGuardianName: familyAccount?.primaryGuardianName ?? student.guardianName,
    familyPrimaryGuardianPhone: familyAccount?.primaryGuardianPhone ?? student.guardianPhone,
    familyStudentCount: familyProfiles.length || 1,
    collectionStage: profile.collectionStage ?? 'No follow-up',
    reminderChannel: profile.reminderChannel ?? 'Not set',
    lastReminderDate: profile.lastReminderDate ?? '',
    nextActionDate: profile.nextActionDate ?? '',
    billingItems,
    billingItemsSummary: summarizeBillingItems(billingItems),
    billedAddOnCount: billedAddOns.length,
    billedAddOnMonthlyTotal,
    notesSummary: profile.notesSummary ?? '',
    totalOutstanding,
    chargesCount: charges.length,
    recentPaymentAmount: payments[0]?.amount ?? 0,
    recentPaymentDate: payments[0]?.paidAt ?? '',
    reminderCount: reminders.length,
    recentReminderDate: latestReminder?.reminderDate ?? '',
    recentReminderOutcome: latestReminder?.outcome ?? '',
    updatedAt: profile.updatedAt
  };
}

function isProfile(value: EnrichedProfile | null): value is EnrichedProfile {
  return value !== null;
}

export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireFinanceReadUser(ctx);

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
    await requireFinanceReadUser(ctx);

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
    const applications = await ctx.db
      .query('financePaymentApplications')
      .withIndex('by_appliedAt')
      .order('desc')
      .collect();
    const familyAccounts = await ctx.db
      .query('financeFamilyAccounts')
      .withIndex('by_updatedAt')
      .order('desc')
      .collect();
    const payments = await ctx.db
      .query('financePayments')
      .withIndex('by_createdAt')
      .order('desc')
      .collect();

    const appliedByChargeId = new Map<string, number>();
    for (const application of applications) {
      appliedByChargeId.set(
        application.chargeId,
        (appliedByChargeId.get(application.chargeId) ?? 0) + application.amount
      );
    }
    const outstandingCharges = charges
      .filter((charge) => charge.status !== 'Waived' && charge.status !== 'Paid')
      .reduce(
        (sum, charge) =>
          sum + Math.max(charge.amount - (appliedByChargeId.get(charge._id) ?? 0), 0),
        0
      );
    const arrearsBalance = profiles.reduce((sum, profile) => sum + profile.arrearsBalance, 0);
    const collectedThisMonth = payments
      .filter((payment) => payment.paidAt.slice(0, 7) === new Date().toISOString().slice(0, 7))
      .reduce((sum, payment) => sum + payment.amount, 0);

    return {
      profiles: profiles.length,
      familyAccounts: familyAccounts.length,
      overdueProfiles: profiles.filter((profile) => profile.billingStatus === 'Overdue').length,
      scholarshipProfiles: profiles.filter((profile) => profile.billingStatus === 'Scholarship')
        .length,
      reminderQueuedProfiles: profiles.filter(
        (profile) => (profile.collectionStage ?? 'No follow-up') === 'Reminder queued'
      ).length,
      escalatedProfiles: profiles.filter(
        (profile) => (profile.collectionStage ?? 'No follow-up') === 'Escalated'
      ).length,
      totalOutstanding: outstandingCharges + arrearsBalance,
      collectedThisMonth
    };
  }
});

export const familyAccountsOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireFinanceReadUser(ctx);

    const accounts = await ctx.db
      .query('financeFamilyAccounts')
      .withIndex('by_updatedAt')
      .order('desc')
      .collect();
    return (
      await Promise.all(accounts.map((account) => buildFamilyAccountSummary(ctx, account._id)))
    ).filter((account): account is NonNullable<typeof account> => account !== null);
  }
});

export const ledgerActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireFinanceReadUser(ctx);

    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 12), 50));
    const profiles = await ctx.db
      .query('studentBillingProfiles')
      .withIndex('by_updatedAt')
      .order('desc')
      .collect();

    const studentByProfileId = new Map<
      string,
      { studentName: string; className: string; academicYear: string }
    >();

    for (const profile of profiles) {
      const student = await ctx.db.get(profile.studentId);
      if (!student) continue;
      studentByProfileId.set(profile._id, {
        studentName: student.fullName,
        className: student.className,
        academicYear: student.academicYear ?? ''
      });
    }

    const charges = (
      await ctx.db.query('financeCharges').withIndex('by_updatedAt').order('desc').collect()
    )
      .map((charge) => {
        const student = studentByProfileId.get(charge.billingProfileId);
        if (!student) return null;
        return {
          id: charge._id,
          billingProfileId: charge.billingProfileId,
          studentName: student.studentName,
          className: student.className,
          academicYear: student.academicYear,
          title: charge.title,
          category: charge.category,
          amount: charge.amount,
          chargeDate: charge.chargeDate,
          dueDate: charge.dueDate,
          billingCycleLabel:
            charge.billingCycleLabel ?? deriveChargeCycleLabel(undefined, charge.chargeDate),
          status: charge.status,
          updatedAt: charge.updatedAt
        };
      })
      .filter((charge): charge is NonNullable<typeof charge> => charge !== null)
      .slice(0, limit);

    const payments = (
      await ctx.db.query('financePayments').withIndex('by_createdAt').order('desc').collect()
    )
      .map((payment) => {
        const student = studentByProfileId.get(payment.billingProfileId);
        if (!student) return null;
        return {
          id: payment._id,
          billingProfileId: payment.billingProfileId,
          studentName: student.studentName,
          className: student.className,
          academicYear: student.academicYear,
          amount: payment.amount,
          paidAt: payment.paidAt,
          method: payment.method,
          reference: payment.reference ?? '',
          note: payment.note ?? '',
          createdAt: payment.createdAt
        };
      })
      .filter((payment): payment is NonNullable<typeof payment> => payment !== null)
      .slice(0, limit);

    const reminderLogs = await ctx.db
      .query('financeReminderLogs')
      .withIndex('by_createdAt')
      .order('desc')
      .collect();
    const reminders = [...reminderLogs]
      // oxlint-disable-next-line unicorn/no-array-sort
      .sort(compareReminderRecency)
      .map((reminder) => {
        const student = studentByProfileId.get(reminder.billingProfileId);
        if (!student) return null;
        return {
          id: reminder._id,
          billingProfileId: reminder.billingProfileId,
          studentName: student.studentName,
          className: student.className,
          academicYear: student.academicYear,
          reminderDate: reminder.reminderDate,
          channel: reminder.channel,
          collectionStage: reminder.collectionStage,
          outcome: reminder.outcome,
          nextActionDate: reminder.nextActionDate ?? '',
          authorLabel: reminder.authorLabel,
          createdAt: reminder.createdAt
        };
      })
      .filter((reminder): reminder is NonNullable<typeof reminder> => reminder !== null)
      .slice(0, limit);

    return {
      charges,
      payments,
      reminders
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
  const reminders = await ctx.db
    .query('financeReminderLogs')
    .withIndex('by_profile', (q) => q.eq('billingProfileId', billingProfileId))
    .order('desc')
    .collect();
  const applications = await ctx.db
    .query('financePaymentApplications')
    .withIndex('by_profile', (q) => q.eq('billingProfileId', billingProfileId))
    .collect();
  const appliedByChargeId = new Map<string, number>();
  const appliedByPaymentId = new Map<string, number>();
  const chargeCountByPaymentId = new Map<string, number>();
  for (const application of applications) {
    appliedByChargeId.set(
      application.chargeId,
      (appliedByChargeId.get(application.chargeId) ?? 0) + application.amount
    );
    appliedByPaymentId.set(
      application.paymentId,
      (appliedByPaymentId.get(application.paymentId) ?? 0) + application.amount
    );
    chargeCountByPaymentId.set(
      application.paymentId,
      (chargeCountByPaymentId.get(application.paymentId) ?? 0) + 1
    );
  }
  // eslint-disable-next-line unicorn/no-array-sort
  const sortedReminders = [...reminders].sort(compareReminderRecency);
  const familyAccount = enriched.familyAccountId
    ? await buildFamilyAccountSummary(ctx, enriched.familyAccountId as Id<'financeFamilyAccounts'>)
    : null;

  const applicationsByPaymentId = new Map<string, typeof applications>();
  for (const application of applications) {
    const list = applicationsByPaymentId.get(application.paymentId) ?? [];
    list.push(application);
    applicationsByPaymentId.set(application.paymentId, list);
  }

  const chargeViews = charges.map((charge) => {
    const derivedAppliedAmount = appliedByChargeId.get(charge._id) ?? 0;
    const appliedAmount =
      charge.status === 'Paid'
        ? Math.max(derivedAppliedAmount, charge.amount)
        : derivedAppliedAmount;
    const balanceRemaining =
      charge.status === 'Paid' ? 0 : Math.max(charge.amount - appliedAmount, 0);

    return {
      id: charge._id,
      title: charge.title,
      category: charge.category,
      amount: charge.amount,
      chargeDate: charge.chargeDate,
      dueDate: charge.dueDate,
      billingCycleLabel:
        charge.billingCycleLabel ?? deriveChargeCycleLabel(undefined, charge.chargeDate),
      billingCycleKey: charge.billingCycleKey ?? deriveChargeCycleKey(charge.chargeDate),
      status: charge.status,
      appliedAmount,
      balanceRemaining,
      settlementLabel:
        charge.status === 'Paid'
          ? 'Settled'
          : balanceRemaining <= 0
            ? 'Settled'
            : appliedAmount > 0
              ? 'Partially settled'
              : 'Open',
      applicationCount: applications.filter((application) => application.chargeId === charge._id)
        .length,
      updatedAt: charge.updatedAt
    };
  });
  const chargeViewById = new Map(chargeViews.map((charge) => [charge.id, charge]));

  return {
    ...enriched,
    familyAccount,
    relatedProfiles:
      familyAccount?.members.filter((member) => member.studentId !== enriched.studentId) ?? [],
    charges: chargeViews,
    payments: payments.map((payment) => {
      const appliedAmount = appliedByPaymentId.get(payment._id) ?? 0;
      const unappliedAmount = Math.max(payment.amount - appliedAmount, 0);
      const paymentApplications = (applicationsByPaymentId.get(payment._id) ?? [])
        .map((application) => {
          const charge = chargeViewById.get(application.chargeId);
          if (!charge) return null;

          return {
            id: application._id,
            chargeId: application.chargeId,
            chargeTitle: charge.title,
            chargeDueDate: charge.dueDate,
            chargeStatus: charge.status,
            amount: application.amount
          };
        })
        .filter(
          (application): application is NonNullable<typeof application> => application !== null
        )
        // eslint-disable-next-line unicorn/no-array-sort
        .sort(
          (left, right) =>
            left.chargeDueDate.localeCompare(right.chargeDueDate) ||
            left.chargeTitle.localeCompare(right.chargeTitle)
        );

      return {
        id: payment._id,
        amount: payment.amount,
        paidAt: payment.paidAt,
        method: payment.method,
        reference: payment.reference ?? '',
        note: payment.note ?? '',
        appliedAmount,
        unappliedAmount,
        appliedChargeCount: chargeCountByPaymentId.get(payment._id) ?? 0,
        settlementLabel:
          appliedAmount <= 0
            ? 'Unapplied'
            : unappliedAmount <= 0
              ? 'Fully settled'
              : 'Partially settled',
        applications: paymentApplications,
        createdAt: payment.createdAt
      };
    }),
    reminders: sortedReminders.map((reminder) => ({
      id: reminder._id,
      reminderDate: reminder.reminderDate,
      channel: reminder.channel,
      collectionStage: reminder.collectionStage,
      outcome: reminder.outcome,
      nextActionDate: reminder.nextActionDate ?? '',
      authorLabel: reminder.authorLabel,
      createdAt: reminder.createdAt
    }))
  };
}

export const getByProfileId = query({
  args: { billingProfileId: v.id('studentBillingProfiles') },
  handler: async (ctx, args) => {
    await requireFinanceReadUser(ctx);
    return await loadProfileDetail(ctx, args.billingProfileId);
  }
});

export const getByStudentId = query({
  args: { studentId: v.id('students') },
  handler: async (ctx, args) => {
    await requireFinanceReadUser(ctx);
    const profile = await ctx.db
      .query('studentBillingProfiles')
      .withIndex('by_student', (q) => q.eq('studentId', args.studentId))
      .order('desc')
      .first();
    if (!profile) return null;
    return await loadProfileDetail(ctx, profile._id);
  }
});

const familyPaymentAllocationValidator = v.object({
  billingProfileId: v.id('studentBillingProfiles'),
  amount: v.number()
});

const billingItemValidator = v.object({
  id: v.string(),
  label: v.string(),
  category: v.union(...BILLING_ITEM_CATEGORIES.map((item) => v.literal(item))),
  billingBehavior: v.union(...BILLING_ITEM_BEHAVIORS.map((item) => v.literal(item))),
  monthlyAmount: v.number(),
  notes: v.optional(v.string()),
  sortOrder: v.number()
});

const collectionStageValidator = v.union(...COLLECTION_STAGES.map((item) => v.literal(item)));
const reminderChannelValidator = v.union(...REMINDER_CHANNELS.map((item) => v.literal(item)));

async function applyPaymentToCharges(
  ctx: MutationCtx,
  billingProfileId: Id<'studentBillingProfiles'>,
  paymentId: Id<'financePayments'>,
  amount: number
) {
  const charges = await ctx.db
    .query('financeCharges')
    .withIndex('by_profile', (q) => q.eq('billingProfileId', billingProfileId))
    .collect();
  const applications = await ctx.db
    .query('financePaymentApplications')
    .withIndex('by_profile', (q) => q.eq('billingProfileId', billingProfileId))
    .collect();

  const appliedByChargeId = new Map<string, number>();
  for (const application of applications) {
    appliedByChargeId.set(
      application.chargeId,
      (appliedByChargeId.get(application.chargeId) ?? 0) + application.amount
    );
  }

  // eslint-disable-next-line unicorn/no-array-sort
  const orderedCharges = [...charges].sort(
    (left, right) =>
      left.dueDate.localeCompare(right.dueDate) || left.chargeDate.localeCompare(right.chargeDate)
  );

  let remaining = amount;
  const timestamp = Date.now();

  for (const charge of orderedCharges) {
    if (charge.status === 'Waived' || charge.status === 'Paid') continue;
    const alreadyApplied = appliedByChargeId.get(charge._id) ?? 0;
    const balanceRemaining = Math.max(charge.amount - alreadyApplied, 0);
    if (balanceRemaining <= 0) continue;
    if (remaining <= 0) break;

    const appliedAmount = Math.min(remaining, balanceRemaining);
    await ctx.db.insert('financePaymentApplications', {
      billingProfileId,
      paymentId,
      chargeId: charge._id,
      amount: appliedAmount,
      appliedAt: timestamp
    });

    remaining -= appliedAmount;
  }

  await syncChargeStatuses(ctx, billingProfileId, timestamp);
}

async function syncChargeStatuses(
  ctx: MutationCtx,
  billingProfileId: Id<'studentBillingProfiles'>,
  timestamp = Date.now()
) {
  const charges = await ctx.db
    .query('financeCharges')
    .withIndex('by_profile', (q) => q.eq('billingProfileId', billingProfileId))
    .collect();
  const applications = await ctx.db
    .query('financePaymentApplications')
    .withIndex('by_profile', (q) => q.eq('billingProfileId', billingProfileId))
    .collect();

  const appliedByChargeId = new Map<string, number>();
  for (const application of applications) {
    appliedByChargeId.set(
      application.chargeId,
      (appliedByChargeId.get(application.chargeId) ?? 0) + application.amount
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const charge of charges) {
    if (charge.status === 'Waived') continue;

    const appliedAmount = appliedByChargeId.get(charge._id) ?? 0;
    const nextStatus: (typeof CHARGE_STATUSES)[number] =
      appliedAmount >= charge.amount ? 'Paid' : charge.dueDate < today ? 'Overdue' : 'Pending';

    if (charge.status !== nextStatus) {
      await ctx.db.patch(charge._id, {
        status: nextStatus,
        updatedAt: timestamp
      });
    }
  }
}

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
    familyLabel: v.optional(v.string()),
    collectionStage: v.optional(collectionStageValidator),
    reminderChannel: v.optional(reminderChannelValidator),
    lastReminderDate: v.optional(v.string()),
    nextActionDate: v.optional(v.string()),
    billingItems: v.optional(v.array(billingItemValidator)),
    notesSummary: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireFinanceWriteUser(ctx);
    const existing = await ctx.db
      .query('studentBillingProfiles')
      .withIndex('by_student', (q) => q.eq('studentId', args.studentId))
      .first();
    if (existing) {
      throw new Error('Billing profile already exists for this student.');
    }
    const familyAccountId = await ensureFamilyAccount(ctx, args.studentId, args.familyLabel);
    const billingProfileId = await ctx.db.insert(
      'studentBillingProfiles',
      normalizeProfile({ ...args, familyAccountId })
    );
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
    familyLabel: v.optional(v.string()),
    collectionStage: v.optional(collectionStageValidator),
    reminderChannel: v.optional(reminderChannelValidator),
    lastReminderDate: v.optional(v.string()),
    nextActionDate: v.optional(v.string()),
    billingItems: v.optional(v.array(billingItemValidator)),
    notesSummary: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireFinanceWriteUser(ctx);
    const existing = await ctx.db.get(args.billingProfileId);
    if (!existing) throw new Error('Billing profile not found.');
    if (existing.studentId !== args.studentId) {
      throw new Error('Changing the student on an existing billing profile is not allowed.');
    }
    const familyAccountId = await ensureFamilyAccount(
      ctx,
      args.studentId,
      args.familyLabel,
      existing
    );
    await ctx.db.patch(args.billingProfileId, normalizeProfile({ ...args, familyAccountId }));
    return { billingProfileId: args.billingProfileId };
  }
});

export const generateBillingCycleCharges = mutation({
  args: {
    cycleDate: v.string(),
    dueDate: v.string(),
    billingCycleLabel: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireFinanceWriteUser(ctx);

    const profiles = await ctx.db
      .query('studentBillingProfiles')
      .withIndex('by_updatedAt')
      .order('desc')
      .collect();

    const cycleKey = deriveChargeCycleKey(args.cycleDate);
    const generatedChargeIds: Id<'financeCharges'>[] = [];
    let processedProfiles = 0;
    let skippedProfiles = 0;
    let duplicateCharges = 0;

    for (const profile of profiles) {
      const student = await ctx.db.get(profile.studentId);
      if (!student || student.status !== 'Active') {
        skippedProfiles += 1;
        continue;
      }

      const existingCharges = await ctx.db
        .query('financeCharges')
        .withIndex('by_profile', (q) => q.eq('billingProfileId', profile._id))
        .collect();
      const existingCycleTitles = new Set(
        existingCharges
          .filter(
            (charge) =>
              (charge.billingCycleKey ?? deriveChargeCycleKey(charge.chargeDate)) === cycleKey
          )
          .map((charge) => charge.title.trim().toLowerCase())
      );

      const nextCharges = buildRecurringChargesForProfile(
        profile,
        args.cycleDate,
        args.dueDate,
        args.billingCycleLabel
      );
      if (nextCharges.length === 0) {
        skippedProfiles += 1;
        continue;
      }

      let generatedForProfile = 0;
      for (const charge of nextCharges) {
        const dedupeKey = charge.title.trim().toLowerCase();
        if (existingCycleTitles.has(dedupeKey)) {
          duplicateCharges += 1;
          continue;
        }

        const chargeId = await ctx.db.insert(
          'financeCharges',
          normalizeCharge({
            billingProfileId: profile._id,
            title: charge.title,
            category: charge.category,
            amount: charge.amount,
            chargeDate: charge.chargeDate,
            dueDate: charge.dueDate,
            billingCycleLabel: charge.billingCycleLabel,
            status: charge.status
          })
        );
        generatedChargeIds.push(chargeId);
        existingCycleTitles.add(dedupeKey);
        generatedForProfile += 1;
      }

      if (generatedForProfile > 0) {
        processedProfiles += 1;
        await ctx.db.patch(profile._id, { updatedAt: Date.now() });
      } else {
        skippedProfiles += 1;
      }
    }

    return {
      cycleKey,
      billingCycleLabel: deriveChargeCycleLabel(args.billingCycleLabel, args.cycleDate),
      generatedChargeCount: generatedChargeIds.length,
      processedProfiles,
      skippedProfiles,
      duplicateCharges,
      generatedChargeIds
    };
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
    billingCycleLabel: v.optional(v.string()),
    status: v.union(...CHARGE_STATUSES.map((item) => v.literal(item)))
  },
  handler: async (ctx, args) => {
    await requireFinanceWriteUser(ctx);
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
    await requireFinanceWriteUser(ctx);
    const existing = await ctx.db.get(args.billingProfileId);
    if (!existing) throw new Error('Billing profile not found.');
    const paymentId = await ctx.db.insert('financePayments', normalizePayment(args));
    await applyPaymentToCharges(ctx, args.billingProfileId, paymentId, args.amount);
    await ctx.db.patch(args.billingProfileId, { updatedAt: Date.now() });
    return { paymentId };
  }
});

export const allocateFamilyPayment = mutation({
  args: {
    familyAccountId: v.id('financeFamilyAccounts'),
    paidAt: v.string(),
    method: v.union(...PAYMENT_METHODS.map((item) => v.literal(item))),
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
    allocations: v.array(familyPaymentAllocationValidator)
  },
  handler: async (ctx, args) => {
    await requireFinanceWriteUser(ctx);

    const familyAccount = await ctx.db.get(args.familyAccountId);
    if (!familyAccount) {
      throw new Error('Family account not found.');
    }

    const allocations = args.allocations.filter((allocation) => allocation.amount > 0);
    if (allocations.length === 0) {
      throw new Error('At least one positive family payment allocation is required.');
    }

    const uniqueProfileIds = new Set(allocations.map((allocation) => allocation.billingProfileId));
    if (uniqueProfileIds.size !== allocations.length) {
      throw new Error('Each student can only receive one allocation per family payment.');
    }

    const totalAmount = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    if (totalAmount <= 0) {
      throw new Error('Family payment total must be greater than zero.');
    }

    const timestamp = Date.now();
    const paymentIds: Id<'financePayments'>[] = [];

    for (const allocation of allocations) {
      const profile = await ctx.db.get(allocation.billingProfileId);
      if (!profile) {
        throw new Error('Allocated billing profile not found.');
      }
      if (profile.familyAccountId !== args.familyAccountId) {
        throw new Error('All allocations must belong to the selected family account.');
      }

      const paymentId = await ctx.db.insert(
        'financePayments',
        normalizePayment({
          billingProfileId: allocation.billingProfileId,
          amount: allocation.amount,
          paidAt: args.paidAt,
          method: args.method,
          reference: args.reference,
          note: [args.note?.trim() ?? '', `Family account: ${familyAccount.accountLabel}`]
            .filter(Boolean)
            .join(' • ')
        })
      );
      paymentIds.push(paymentId);
      await applyPaymentToCharges(ctx, allocation.billingProfileId, paymentId, allocation.amount);
      await ctx.db.patch(allocation.billingProfileId, { updatedAt: timestamp });
    }

    return {
      paymentIds,
      allocationCount: allocations.length,
      totalAmount
    };
  }
});

export const reallocatePaymentApplications = mutation({
  args: {
    paymentId: v.id('financePayments'),
    allocations: v.array(
      v.object({
        chargeId: v.id('financeCharges'),
        amount: v.number()
      })
    )
  },
  handler: async (ctx, args) => {
    await requireFinanceWriteUser(ctx);

    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      throw new Error('Payment not found.');
    }

    const normalizedAllocations = args.allocations
      .map((allocation) => ({
        chargeId: allocation.chargeId,
        amount: allocation.amount
      }))
      .filter((allocation) => allocation.amount > 0);

    const uniqueChargeIds = new Set(normalizedAllocations.map((allocation) => allocation.chargeId));
    if (uniqueChargeIds.size !== normalizedAllocations.length) {
      throw new Error('Each charge can only appear once in a payment settlement.');
    }

    const totalAllocated = normalizedAllocations.reduce(
      (sum, allocation) => sum + allocation.amount,
      0
    );
    if (totalAllocated > payment.amount) {
      throw new Error('Allocated amount cannot exceed the payment total.');
    }

    const profileCharges = await ctx.db
      .query('financeCharges')
      .withIndex('by_profile', (q) => q.eq('billingProfileId', payment.billingProfileId))
      .collect();
    const chargeById = new Map(profileCharges.map((charge) => [charge._id, charge]));

    const profileApplications = await ctx.db
      .query('financePaymentApplications')
      .withIndex('by_profile', (q) => q.eq('billingProfileId', payment.billingProfileId))
      .collect();
    const currentPaymentApplications = profileApplications.filter(
      (application) => application.paymentId === args.paymentId
    );

    const existingAllocationByChargeId = new Map<string, number>();
    for (const application of currentPaymentApplications) {
      existingAllocationByChargeId.set(
        application.chargeId,
        (existingAllocationByChargeId.get(application.chargeId) ?? 0) + application.amount
      );
    }

    const otherAppliedByChargeId = new Map<string, number>();
    for (const application of profileApplications) {
      if (application.paymentId === args.paymentId) continue;
      otherAppliedByChargeId.set(
        application.chargeId,
        (otherAppliedByChargeId.get(application.chargeId) ?? 0) + application.amount
      );
    }

    for (const allocation of normalizedAllocations) {
      const charge = chargeById.get(allocation.chargeId);
      if (!charge) {
        throw new Error('All selected charges must belong to the same student billing profile.');
      }
      if (charge.status === 'Waived') {
        throw new Error('Waived charges cannot receive payment settlement allocations.');
      }

      const availableCapacity = Math.max(
        charge.amount - (otherAppliedByChargeId.get(charge._id) ?? 0),
        0
      );
      if (allocation.amount > availableCapacity) {
        throw new Error(`Settlement for ${charge.title} exceeds the remaining charge balance.`);
      }
    }

    const timestamp = Date.now();
    for (const application of currentPaymentApplications) {
      await ctx.db.delete(application._id);
    }

    for (const allocation of normalizedAllocations) {
      await ctx.db.insert('financePaymentApplications', {
        billingProfileId: payment.billingProfileId,
        paymentId: args.paymentId,
        chargeId: allocation.chargeId,
        amount: allocation.amount,
        appliedAt: timestamp
      });
    }

    await syncChargeStatuses(ctx, payment.billingProfileId, timestamp);
    await ctx.db.patch(payment.billingProfileId, { updatedAt: timestamp });

    return {
      paymentId: args.paymentId,
      allocatedAmount: totalAllocated,
      unappliedAmount: Math.max(payment.amount - totalAllocated, 0),
      changedChargeCount: new Set([
        ...Array.from(existingAllocationByChargeId.keys()),
        ...normalizedAllocations.map((allocation) => allocation.chargeId)
      ]).size
    };
  }
});

export const addReminderLog = mutation({
  args: {
    billingProfileId: v.id('studentBillingProfiles'),
    reminderDate: v.string(),
    channel: reminderChannelValidator,
    collectionStage: collectionStageValidator,
    outcome: v.string(),
    nextActionDate: v.optional(v.string()),
    authorLabel: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireFinanceWriteUser(ctx);
    const existing = await ctx.db.get(args.billingProfileId);
    if (!existing) throw new Error('Billing profile not found.');

    assertDateOnlyString(args.reminderDate, 'Reminder date');

    const outcome = args.outcome.trim();
    if (!outcome) {
      throw new Error('Reminder outcome is required.');
    }

    const timestamp = Date.now();
    const nextActionDate = args.nextActionDate?.trim() ?? '';
    if (args.collectionStage === 'Promise to pay' && !nextActionDate) {
      throw new Error('Promise to pay reminders require a next action date.');
    }
    if (nextActionDate) {
      assertDateOnlyString(nextActionDate, 'Next action date');
    }

    const reminderId = await ctx.db.insert('financeReminderLogs', {
      billingProfileId: args.billingProfileId,
      reminderDate: args.reminderDate,
      channel: args.channel,
      collectionStage: args.collectionStage,
      outcome,
      nextActionDate,
      authorLabel: args.authorLabel?.trim() || 'Accounts operator',
      createdAt: timestamp
    });

    const shouldPromoteReminder = args.reminderDate >= (existing.lastReminderDate ?? '');
    await ctx.db.patch(args.billingProfileId, {
      ...(shouldPromoteReminder
        ? {
            reminderChannel: args.channel,
            collectionStage: args.collectionStage,
            lastReminderDate: args.reminderDate,
            nextActionDate
          }
        : {}),
      updatedAt: timestamp
    });

    return { reminderId };
  }
});

export const addReminderLogBatch = mutation({
  args: {
    billingProfileIds: v.array(v.id('studentBillingProfiles')),
    reminderDate: v.string(),
    channel: reminderChannelValidator,
    collectionStage: v.optional(collectionStageValidator),
    outcome: v.string(),
    nextActionDate: v.optional(v.string()),
    clearNextActionDate: v.optional(v.boolean()),
    authorLabel: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireFinanceWriteUser(ctx);

    assertDateOnlyString(args.reminderDate, 'Reminder date');

    const normalizedProfileIds = Array.from(
      new Set(args.billingProfileIds.map((id) => id.toString()))
    );
    if (normalizedProfileIds.length === 0) {
      throw new Error('Select at least one billing profile.');
    }

    const outcome = args.outcome.trim();
    if (!outcome) {
      throw new Error('Reminder outcome is required.');
    }

    const trimmedNextActionDate = args.nextActionDate?.trim();
    if (
      args.collectionStage === 'Promise to pay' &&
      (!trimmedNextActionDate || args.clearNextActionDate)
    ) {
      throw new Error('Promise to pay reminders require a next action date.');
    }
    if (trimmedNextActionDate) {
      assertDateOnlyString(trimmedNextActionDate, 'Next action date');
    }

    const timestamp = Date.now();
    const reminderIds = [] as Array<Id<'financeReminderLogs'>>;

    for (const billingProfileId of normalizedProfileIds) {
      const profileId = billingProfileId as Id<'studentBillingProfiles'>;
      const existing = await ctx.db.get(profileId);
      if (!existing) {
        throw new Error('One or more billing profiles could not be found.');
      }

      const resolvedCollectionStage =
        args.collectionStage ?? existing.collectionStage ?? 'No follow-up';
      const resolvedNextActionDate = args.clearNextActionDate
        ? ''
        : (trimmedNextActionDate ?? existing.nextActionDate ?? '');

      if (resolvedCollectionStage === 'Promise to pay' && !resolvedNextActionDate) {
        throw new Error('Promise to pay reminders require a next action date.');
      }

      const reminderId = await ctx.db.insert('financeReminderLogs', {
        billingProfileId: profileId,
        reminderDate: args.reminderDate,
        channel: args.channel,
        collectionStage: resolvedCollectionStage,
        outcome,
        nextActionDate: resolvedNextActionDate,
        authorLabel: args.authorLabel?.trim() || 'Accounts operator',
        createdAt: timestamp
      });

      reminderIds.push(reminderId);

      const shouldPromoteReminder = args.reminderDate >= (existing.lastReminderDate ?? '');
      await ctx.db.patch(profileId, {
        ...(shouldPromoteReminder
          ? {
              reminderChannel: args.channel,
              ...(args.collectionStage ? { collectionStage: resolvedCollectionStage } : {}),
              lastReminderDate: args.reminderDate,
              ...(args.clearNextActionDate || trimmedNextActionDate !== undefined
                ? { nextActionDate: resolvedNextActionDate }
                : {})
            }
          : {}),
        updatedAt: timestamp
      });
    }

    return {
      reminderIds,
      updatedProfileCount: normalizedProfileIds.length
    };
  }
});
