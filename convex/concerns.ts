import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { requirePermission } from './lib/auth';

const CONCERN_CATEGORIES = [
  'Learning Support',
  'Behaviour',
  'Attendance',
  'Family',
  'Medical',
  'Safeguarding'
] as const;
const CONCERN_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
const CONCERN_STATUSES = ['Open', 'Monitoring', 'Escalated', 'Resolved'] as const;
const CONCERN_VISIBILITY = ['Standard', 'Restricted'] as const;

function isSafeguarding(concern: Pick<Doc<'concernCases'>, 'category' | 'visibility'>) {
  return concern.category === 'Safeguarding' || concern.visibility === 'Restricted';
}

async function enforceSafeguarding(
  ctx: QueryCtx | MutationCtx,
  concern: Pick<Doc<'concernCases'>, 'category' | 'visibility'>
): Promise<boolean> {
  if (!isSafeguarding(concern)) return true;
  try {
    await requirePermission(ctx, 'org:safeguarding:manage');
    return true;
  } catch {
    return false;
  }
}

function matchesSearch(
  concern: {
    title: string;
    category: string;
    severity: string;
    status: string;
    visibility: string;
    summary: string;
    studentName: string;
    assignedTeacherName: string;
  },
  search?: string
) {
  if (!search) {
    return true;
  }

  const needle = search.toLowerCase();
  return [
    concern.title,
    concern.category,
    concern.severity,
    concern.status,
    concern.visibility,
    concern.summary,
    concern.studentName,
    concern.assignedTeacherName
  ].some((value) => value.toLowerCase().includes(needle));
}

function buildSortKey(title: string, updatedAt: number) {
  return `${updatedAt}::${title.trim().toLowerCase()}`;
}

function mapCase(args: {
  caseId: string;
  title: string;
  category: (typeof CONCERN_CATEGORIES)[number];
  severity: (typeof CONCERN_SEVERITIES)[number];
  status: (typeof CONCERN_STATUSES)[number];
  visibility: (typeof CONCERN_VISIBILITY)[number];
  summary: string;
  nextReviewDate?: string;
  updatedAt: number;
  studentId: string;
  studentName: string;
  studentClassName: string;
  studentAcademicYear: string;
  assignedTeacherId?: string;
  assignedTeacherName: string;
}) {
  return {
    id: args.caseId,
    title: args.title,
    category: args.category,
    severity: args.severity,
    status: args.status,
    visibility: args.visibility,
    summary: args.summary,
    nextReviewDate: args.nextReviewDate ?? '',
    updatedAt: args.updatedAt,
    studentId: args.studentId,
    studentName: args.studentName,
    studentClassName: args.studentClassName,
    studentAcademicYear: args.studentAcademicYear,
    assignedTeacherId: args.assignedTeacherId ?? null,
    assignedTeacherName: args.assignedTeacherName
  };
}

function isConcernRecord(
  value: ReturnType<typeof mapCase> | null
): value is ReturnType<typeof mapCase> {
  return value !== null;
}

async function enrichConcern(ctx: QueryCtx | MutationCtx, concern: Doc<'concernCases'>) {
  const student = await ctx.db.get(concern.studentId);
  if (!student || student.schoolId !== concern.schoolId) {
    return null;
  }

  const assignedTeacher = concern.assignedTeacherId
    ? await ctx.db.get(concern.assignedTeacherId)
    : null;
  if (assignedTeacher && assignedTeacher.schoolId !== concern.schoolId) return null;

  return mapCase({
    caseId: concern._id,
    title: concern.title,
    category: concern.category,
    severity: concern.severity,
    status: concern.status,
    visibility: concern.visibility,
    summary: concern.summary,
    nextReviewDate: concern.nextReviewDate,
    updatedAt: concern.updatedAt,
    studentId: student._id,
    studentName: student.fullName,
    studentClassName: student.className,
    studentAcademicYear: student.academicYear ?? '',
    assignedTeacherId: assignedTeacher?._id,
    assignedTeacherName: assignedTeacher?.fullName ?? 'Unassigned'
  });
}

function normalizeConcern(input: {
  studentId: Id<'students'>;
  title: string;
  category: (typeof CONCERN_CATEGORIES)[number];
  severity: (typeof CONCERN_SEVERITIES)[number];
  status: (typeof CONCERN_STATUSES)[number];
  visibility: (typeof CONCERN_VISIBILITY)[number];
  assignedTeacherId?: Id<'teachers'>;
  summary: string;
  nextReviewDate?: string;
}) {
  const title = input.title.trim();
  const summary = input.summary.trim();
  const nextReviewDate = input.nextReviewDate?.trim() ?? '';
  const updatedAt = Date.now();

  if (!title) {
    throw new Error('Concern title is required.');
  }

  if (!summary) {
    throw new Error('Concern summary is required.');
  }

  return {
    studentId: input.studentId,
    title,
    category: input.category,
    severity: input.severity,
    status: input.status,
    visibility: input.visibility,
    assignedTeacherId: input.assignedTeacherId,
    summary,
    nextReviewDate,
    updatedAt,
    sortKey: buildSortKey(title, updatedAt)
  };
}

export const list = query({
  args: {
    search: v.optional(v.string()),
    studentId: v.optional(v.id('students'))
  },
  handler: async (ctx, args) => {
    const identity = await requirePermission(ctx, 'org:concerns:read');

    let concerns = await ctx.db
      .query('concernCases')
      .withIndex('by_school_updatedAt', (q) => q.eq('schoolId', identity.schoolId))
      .order('desc')
      .collect();

    if (args.studentId) {
      concerns = concerns.filter((concern) => concern.studentId === args.studentId);
    }

    const visible = (
      await Promise.all(
        concerns.map(async (concern) =>
          (await enforceSafeguarding(ctx, concern)) ? concern : null
        )
      )
    ).filter((concern): concern is Doc<'concernCases'> => concern !== null);
    const enriched = (
      await Promise.all(visible.map((concern) => enrichConcern(ctx, concern)))
    ).filter(isConcernRecord);

    return enriched.filter((concern) => matchesSearch(concern, args.search));
  }
});

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requirePermission(ctx, 'org:concerns:read');

    const concerns = await ctx.db
      .query('concernCases')
      .withIndex('by_school_updatedAt', (q) => q.eq('schoolId', identity.schoolId))
      .order('desc')
      .collect();

    const visible = (
      await Promise.all(
        concerns.map(async (concern) =>
          (await enforceSafeguarding(ctx, concern)) ? concern : null
        )
      )
    ).filter((concern): concern is Doc<'concernCases'> => concern !== null);
    return {
      total: visible.length,
      open: visible.filter((concern) => concern.status === 'Open').length,
      monitoring: visible.filter((concern) => concern.status === 'Monitoring').length,
      escalated: visible.filter((concern) => concern.status === 'Escalated').length,
      restricted: visible.filter((concern) => concern.visibility === 'Restricted').length
    };
  }
});

export const recentForStudent = query({
  args: { studentId: v.id('students') },
  handler: async (ctx, args) => {
    const identity = await requirePermission(ctx, 'org:concerns:read');
    const student = await ctx.db.get(args.studentId);
    if (!student || student.schoolId !== identity.schoolId) return [];

    const concerns = await ctx.db
      .query('concernCases')
      .withIndex('by_school_student', (q) =>
        q.eq('schoolId', identity.schoolId).eq('studentId', args.studentId)
      )
      .order('desc')
      .take(5);

    const visible = (
      await Promise.all(
        concerns.map(async (concern) =>
          (await enforceSafeguarding(ctx, concern)) ? concern : null
        )
      )
    ).filter((concern): concern is Doc<'concernCases'> => concern !== null);
    const enriched = await Promise.all(visible.map((concern) => enrichConcern(ctx, concern)));
    return enriched.filter(isConcernRecord);
  }
});

export const getById = query({
  args: { caseId: v.id('concernCases') },
  handler: async (ctx, args) => {
    const identity = await requirePermission(ctx, 'org:concerns:read');

    const concern = await ctx.db.get(args.caseId);
    if (
      !concern ||
      concern.schoolId !== identity.schoolId ||
      !(await enforceSafeguarding(ctx, concern))
    ) {
      return null;
    }

    const mapped = await enrichConcern(ctx, concern);
    if (!mapped) {
      return null;
    }

    const updates = await ctx.db
      .query('concernCaseUpdates')
      .withIndex('by_school_case', (q) =>
        q.eq('schoolId', identity.schoolId).eq('caseId', args.caseId)
      )
      .order('desc')
      .collect();

    return {
      ...mapped,
      updates: updates.map((update) => ({
        id: update._id,
        note: update.note,
        authorLabel: update.authorLabel,
        createdAt: update.createdAt
      }))
    };
  }
});

export const create = mutation({
  args: {
    studentId: v.id('students'),
    title: v.string(),
    category: v.union(...CONCERN_CATEGORIES.map((item) => v.literal(item))),
    severity: v.union(...CONCERN_SEVERITIES.map((item) => v.literal(item))),
    status: v.union(...CONCERN_STATUSES.map((item) => v.literal(item))),
    visibility: v.union(...CONCERN_VISIBILITY.map((item) => v.literal(item))),
    assignedTeacherId: v.optional(v.id('teachers')),
    summary: v.string(),
    nextReviewDate: v.optional(v.string()),
    initialUpdate: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await requirePermission(ctx, 'org:concerns:write');
    if (!(await enforceSafeguarding(ctx, args))) throw new ConvexError('FORBIDDEN');
    const student = await ctx.db.get(args.studentId);
    if (!student || student.schoolId !== identity.schoolId) throw new ConvexError('NOT_FOUND');
    if (args.assignedTeacherId) {
      const teacher = await ctx.db.get(args.assignedTeacherId);
      if (!teacher || teacher.schoolId !== identity.schoolId) throw new ConvexError('NOT_FOUND');
    }

    const caseId = await ctx.db.insert('concernCases', {
      schoolId: identity.schoolId,
      ...normalizeConcern(args)
    });

    const initialUpdate = args.initialUpdate?.trim();
    if (initialUpdate) {
      await ctx.db.insert('concernCaseUpdates', {
        schoolId: identity.schoolId,
        caseId,
        note: initialUpdate,
        authorLabel: 'Initial entry',
        createdAt: Date.now()
      });
    }

    return { caseId };
  }
});

export const update = mutation({
  args: {
    caseId: v.id('concernCases'),
    studentId: v.id('students'),
    title: v.string(),
    category: v.union(...CONCERN_CATEGORIES.map((item) => v.literal(item))),
    severity: v.union(...CONCERN_SEVERITIES.map((item) => v.literal(item))),
    status: v.union(...CONCERN_STATUSES.map((item) => v.literal(item))),
    visibility: v.union(...CONCERN_VISIBILITY.map((item) => v.literal(item))),
    assignedTeacherId: v.optional(v.id('teachers')),
    summary: v.string(),
    nextReviewDate: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await requirePermission(ctx, 'org:concerns:write');

    const existing = await ctx.db.get(args.caseId);
    if (!existing || existing.schoolId !== identity.schoolId) {
      throw new Error('Concern case not found.');
    }

    if (!(await enforceSafeguarding(ctx, existing)) || !(await enforceSafeguarding(ctx, args)))
      throw new ConvexError('FORBIDDEN');
    const student = await ctx.db.get(args.studentId);
    const teacher = args.assignedTeacherId ? await ctx.db.get(args.assignedTeacherId) : null;
    if (
      !student ||
      student.schoolId !== identity.schoolId ||
      (args.assignedTeacherId && (!teacher || teacher.schoolId !== identity.schoolId))
    )
      throw new ConvexError('NOT_FOUND');
    await ctx.db.patch(args.caseId, normalizeConcern(args));
    return { caseId: args.caseId };
  }
});

export const addUpdate = mutation({
  args: {
    caseId: v.id('concernCases'),
    note: v.string(),
    authorLabel: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await requirePermission(ctx, 'org:concerns:write');

    const concern = await ctx.db.get(args.caseId);
    if (!concern || concern.schoolId !== identity.schoolId) {
      throw new Error('Concern case not found.');
    }

    if (!(await enforceSafeguarding(ctx, concern))) throw new ConvexError('FORBIDDEN');
    const note = args.note.trim();
    if (!note) {
      throw new Error('Update note is required.');
    }

    const createdAt = Date.now();
    await ctx.db.insert('concernCaseUpdates', {
      schoolId: identity.schoolId,
      caseId: args.caseId,
      note,
      authorLabel: args.authorLabel?.trim() || 'Schly operator',
      createdAt
    });
    await ctx.db.patch(args.caseId, {
      updatedAt: createdAt,
      sortKey: buildSortKey(concern.title, createdAt)
    });

    return { caseId: args.caseId };
  }
});
