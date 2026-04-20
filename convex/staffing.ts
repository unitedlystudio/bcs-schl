import { mutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';

import { requireAuthenticatedUser } from './lib/auth';

const LEAVE_TYPES = [
  'Annual',
  'Sick',
  'Emergency',
  'Personal',
  'Training',
  'Unpaid',
  'Other'
] as const;
const LEAVE_STATUSES = ['Requested', 'Approved', 'Rejected', 'Cancelled'] as const;
const COVER_STATUSES = ['Open', 'Assigned', 'Confirmed', 'Completed'] as const;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

type LeaveType = (typeof LEAVE_TYPES)[number];
type LeaveStatus = (typeof LEAVE_STATUSES)[number];
type CoverStatus = (typeof COVER_STATUSES)[number];
type Weekday = (typeof WEEKDAYS)[number];
type Ctx = QueryCtx | MutationCtx;

type CoverAssignmentView = {
  id: string;
  leaveRequestId: string;
  coverDate: string;
  className: string;
  timeSlotLabel: string;
  primaryTeacherId: string;
  primaryTeacherName: string;
  coverTeacherId: string | null;
  coverTeacherName: string;
  status: CoverStatus;
  note: string;
  updatedAt: number;
};

type LeaveRequestView = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherPreferredName: string;
  teacherRole: 'Teacher' | 'Homeroom Teacher' | 'Teaching Assistant';
  teacherAcademicYear: string;
  teacherHomeroomClass: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason: string;
  notesSummary: string;
  requestedBy: string;
  updatedAt: number;
  coverAssignments: CoverAssignmentView[];
  coverCounts: Record<CoverStatus, number>;
};

function compareLabels(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function sortCopy<T>(values: T[], compare: (left: T, right: T) => number) {
  const next = [...values];
  next.sort(compare);
  return next;
}

function parseLocalDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function weekdayFromDate(value: string): Weekday | null {
  const date = parseLocalDate(value);
  const index = date.getDay();
  if (!Number.isFinite(index) || index === 0 || index > 5) {
    return null;
  }
  return WEEKDAYS[index - 1];
}

function buildDateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid leave date range.');
  }
  if (start > end) {
    throw new Error('End date must be the same as or after start date.');
  }

  const cursor = new Date(start);
  const endTime = end.getTime();
  while (cursor.getTime() <= endTime) {
    dates.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function normalizeLeaveRequest(input: {
  teacherId: Id<'teachers'>;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason: string;
  notesSummary?: string;
  requestedBy: string;
}) {
  const startDate = input.startDate.trim();
  const endDate = input.endDate.trim();
  const reason = input.reason.trim();
  const requestedBy = input.requestedBy.trim();

  if (!startDate || !endDate) {
    throw new Error('Start date and end date are required.');
  }
  if (!reason) {
    throw new Error('Leave reason is required.');
  }
  if (!requestedBy) {
    throw new Error('Requested by is required.');
  }

  buildDateRange(startDate, endDate);

  return {
    teacherId: input.teacherId,
    leaveType: input.leaveType,
    startDate,
    endDate,
    status: input.status,
    reason,
    notesSummary: input.notesSummary?.trim() ?? '',
    requestedBy,
    updatedAt: Date.now()
  };
}

async function loadTeachersById(ctx: Ctx) {
  const teachers = await ctx.db.query('teachers').withIndex('by_sortName').order('asc').collect();
  return new Map(teachers.map((teacher) => [teacher._id, teacher]));
}

async function loadCoverAssignmentsForLeave(ctx: Ctx, leaveRequestId: Id<'staffLeaveRequests'>) {
  return ctx.db
    .query('staffCoverAssignments')
    .withIndex('by_leaveRequest', (query) => query.eq('leaveRequestId', leaveRequestId))
    .collect();
}

function mapCoverAssignment(
  assignment: Doc<'staffCoverAssignments'>,
  teachersById: Map<string, Doc<'teachers'>>
): CoverAssignmentView {
  const primaryTeacher = teachersById.get(assignment.primaryTeacherId);
  const coverTeacher = assignment.coverTeacherId
    ? teachersById.get(assignment.coverTeacherId)
    : null;

  return {
    id: assignment._id,
    leaveRequestId: assignment.leaveRequestId,
    coverDate: assignment.coverDate,
    className: assignment.className ?? '',
    timeSlotLabel: assignment.timeSlotLabel ?? '',
    primaryTeacherId: assignment.primaryTeacherId,
    primaryTeacherName: primaryTeacher?.fullName ?? 'Unknown teacher',
    coverTeacherId: assignment.coverTeacherId ?? null,
    coverTeacherName: coverTeacher?.fullName ?? 'Unassigned',
    status: assignment.status,
    note: assignment.note ?? '',
    updatedAt: assignment.updatedAt
  };
}

async function mapLeaveRequest(
  ctx: Ctx,
  leaveRequest: Doc<'staffLeaveRequests'>,
  teachersById?: Map<string, Doc<'teachers'>>
): Promise<LeaveRequestView> {
  const resolvedTeachersById =
    teachersById ?? ((await loadTeachersById(ctx)) as Map<string, Doc<'teachers'>>);
  const teacher = resolvedTeachersById.get(leaveRequest.teacherId);
  const coverAssignments = await loadCoverAssignmentsForLeave(ctx, leaveRequest._id);
  const mappedCoverAssignments = sortCopy(
    coverAssignments.map((assignment) => mapCoverAssignment(assignment, resolvedTeachersById)),
    (left, right) => {
      if (left.coverDate !== right.coverDate) return compareLabels(left.coverDate, right.coverDate);
      return compareLabels(left.timeSlotLabel, right.timeSlotLabel);
    }
  );

  return {
    id: leaveRequest._id,
    teacherId: leaveRequest.teacherId,
    teacherName: teacher?.fullName ?? 'Unknown teacher',
    teacherPreferredName: teacher?.preferredName ?? 'Unknown',
    teacherRole: teacher?.role ?? 'Teacher',
    teacherAcademicYear: teacher?.academicYear ?? '',
    teacherHomeroomClass: teacher?.homeroomClass ?? '',
    leaveType: leaveRequest.leaveType,
    startDate: leaveRequest.startDate,
    endDate: leaveRequest.endDate,
    status: leaveRequest.status,
    reason: leaveRequest.reason,
    notesSummary: leaveRequest.notesSummary ?? '',
    requestedBy: leaveRequest.requestedBy,
    updatedAt: leaveRequest.updatedAt,
    coverAssignments: mappedCoverAssignments,
    coverCounts: {
      Open: mappedCoverAssignments.filter((assignment) => assignment.status === 'Open').length,
      Assigned: mappedCoverAssignments.filter((assignment) => assignment.status === 'Assigned')
        .length,
      Confirmed: mappedCoverAssignments.filter((assignment) => assignment.status === 'Confirmed')
        .length,
      Completed: mappedCoverAssignments.filter((assignment) => assignment.status === 'Completed')
        .length
    }
  };
}

async function clearCoverAssignmentsForLeave(
  ctx: MutationCtx,
  leaveRequestId: Id<'staffLeaveRequests'>
) {
  const existingAssignments = await loadCoverAssignmentsForLeave(ctx, leaveRequestId);
  await Promise.all(existingAssignments.map((assignment) => ctx.db.delete(assignment._id)));
}

async function regenerateCoverAssignments(
  ctx: MutationCtx,
  leaveRequest: Doc<'staffLeaveRequests'>
) {
  const teachersById = await loadTeachersById(ctx);
  const teacher = teachersById.get(leaveRequest.teacherId);
  if (!teacher) {
    throw new Error('Teacher not found for leave request.');
  }

  const [existingAssignments, timeSlots, timetableEntries] = await Promise.all([
    loadCoverAssignmentsForLeave(ctx, leaveRequest._id),
    ctx.db.query('operationsTimeSlots').withIndex('by_sortOrder').order('asc').collect(),
    ctx.db.query('classTimetableEntries').withIndex('by_updatedAt').order('desc').collect()
  ]);

  const slotLabelById = new Map(timeSlots.map((slot) => [slot._id, slot.label]));
  const existingByKey = new Map(
    existingAssignments.map((assignment) => [
      `${assignment.coverDate}::${assignment.className ?? ''}::${assignment.timeSlotLabel ?? ''}`,
      assignment
    ])
  );
  const retainedAssignmentIds = new Set<string>();
  const activeAcademicYear = teacher.academicYear?.trim() ?? '';
  const dates = buildDateRange(leaveRequest.startDate, leaveRequest.endDate);

  for (const date of dates) {
    const weekday = weekdayFromDate(date);
    if (!weekday) continue;

    const matches = timetableEntries.filter(
      (entry) => entry.leadTeacherId === leaveRequest.teacherId && entry.weekday === weekday
    );
    const yearScopedMatches = activeAcademicYear
      ? matches.filter((entry) => entry.academicYear === activeAcademicYear)
      : matches;
    const effectiveMatches = yearScopedMatches.length > 0 ? yearScopedMatches : matches;

    for (const entry of effectiveMatches) {
      const className = entry.className;
      const timeSlotLabel = slotLabelById.get(entry.timeSlotId) ?? '';
      const key = `${date}::${className}::${timeSlotLabel}`;
      const existing = existingByKey.get(key);

      if (existing) {
        retainedAssignmentIds.add(existing._id);
        await ctx.db.patch(existing._id, {
          primaryTeacherId: leaveRequest.teacherId,
          className,
          timeSlotLabel,
          coverDate: date,
          note: existing.note?.trim() ? existing.note : entry.activityTitle,
          updatedAt: Date.now()
        });
        continue;
      }

      await ctx.db.insert('staffCoverAssignments', {
        leaveRequestId: leaveRequest._id,
        coverDate: date,
        className,
        timeSlotLabel,
        primaryTeacherId: leaveRequest.teacherId,
        coverTeacherId: undefined,
        status: 'Open',
        note: entry.activityTitle,
        updatedAt: Date.now()
      });
    }
  }

  await Promise.all(
    existingAssignments
      .filter((assignment) => !retainedAssignmentIds.has(assignment._id))
      .map((assignment) => ctx.db.delete(assignment._id))
  );
}

export const listFilters = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const teachers = await ctx.db.query('teachers').withIndex('by_sortName').order('asc').collect();

    return {
      teachers: teachers.map((teacher) => ({
        id: teacher._id,
        label: teacher.fullName,
        preferredName: teacher.preferredName,
        role: teacher.role,
        status: teacher.status,
        academicYear: teacher.academicYear ?? '',
        homeroomClass: teacher.homeroomClass ?? ''
      })),
      leaveTypes: [...LEAVE_TYPES],
      leaveStatuses: [...LEAVE_STATUSES],
      coverStatuses: [...COVER_STATUSES]
    };
  }
});

export const summary = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const [leaveRequests, coverAssignments] = await Promise.all([
      ctx.db.query('staffLeaveRequests').withIndex('by_updatedAt').order('desc').collect(),
      ctx.db.query('staffCoverAssignments').withIndex('by_updatedAt').order('desc').collect()
    ]);

    const today = toIsoDate(new Date());

    return {
      leaveRequests: leaveRequests.length,
      approvedUpcoming: leaveRequests.filter(
        (request) => request.status === 'Approved' && request.endDate >= today
      ).length,
      todayOnLeave: leaveRequests.filter(
        (request) =>
          request.status === 'Approved' && request.startDate <= today && request.endDate >= today
      ).length,
      openCoverSlots: coverAssignments.filter((assignment) => assignment.status === 'Open').length,
      assignedCoverSlots: coverAssignments.filter((assignment) => assignment.status !== 'Open')
        .length
    };
  }
});

export const list = query({
  args: {
    search: v.optional(v.string()),
    teacherId: v.optional(v.id('teachers')),
    status: v.optional(
      v.union(
        v.literal('Requested'),
        v.literal('Approved'),
        v.literal('Rejected'),
        v.literal('Cancelled')
      )
    ),
    coverStatus: v.optional(
      v.union(
        v.literal('Open'),
        v.literal('Assigned'),
        v.literal('Confirmed'),
        v.literal('Completed')
      )
    ),
    date: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const teachersById = await loadTeachersById(ctx);
    let leaveRequests = await ctx.db
      .query('staffLeaveRequests')
      .withIndex('by_startDate')
      .order('desc')
      .collect();
    const search = args.search?.trim().toLowerCase() ?? '';

    if (args.teacherId) {
      leaveRequests = leaveRequests.filter((request) => request.teacherId === args.teacherId);
    }
    if (args.status) {
      leaveRequests = leaveRequests.filter((request) => request.status === args.status);
    }

    const mapped = await Promise.all(
      leaveRequests.map((leaveRequest) => mapLeaveRequest(ctx, leaveRequest, teachersById))
    );

    return mapped.filter((leaveRequest) => {
      if (
        args.coverStatus &&
        !leaveRequest.coverAssignments.some((assignment) => assignment.status === args.coverStatus)
      ) {
        return false;
      }
      if (
        args.date &&
        !leaveRequest.coverAssignments.some((assignment) => assignment.coverDate === args.date)
      ) {
        return false;
      }
      if (!search) {
        return true;
      }

      return [
        leaveRequest.teacherName,
        leaveRequest.teacherPreferredName,
        leaveRequest.leaveType,
        leaveRequest.reason,
        leaveRequest.notesSummary,
        leaveRequest.requestedBy,
        ...leaveRequest.coverAssignments.flatMap((assignment) => [
          assignment.className,
          assignment.timeSlotLabel,
          assignment.coverTeacherName,
          assignment.note
        ])
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }
});

export const getById = query({
  args: { leaveRequestId: v.id('staffLeaveRequests') },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const leaveRequest = await ctx.db.get(args.leaveRequestId);
    if (!leaveRequest) return null;

    return mapLeaveRequest(ctx, leaveRequest);
  }
});

export const listDailyCoverBoard = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const teachersById = await loadTeachersById(ctx);
    const coverAssignments = await ctx.db
      .query('staffCoverAssignments')
      .withIndex('by_coverDate', (query) => query.eq('coverDate', args.date))
      .collect();

    return sortCopy(
      coverAssignments.map((assignment) => mapCoverAssignment(assignment, teachersById)),
      (left, right) => {
        if (left.className !== right.className)
          return compareLabels(left.className, right.className);
        return compareLabels(left.timeSlotLabel, right.timeSlotLabel);
      }
    );
  }
});

export const upsertLeaveRequest = mutation({
  args: {
    leaveRequestId: v.optional(v.id('staffLeaveRequests')),
    teacherId: v.id('teachers'),
    leaveType: v.union(
      v.literal('Annual'),
      v.literal('Sick'),
      v.literal('Emergency'),
      v.literal('Personal'),
      v.literal('Training'),
      v.literal('Unpaid'),
      v.literal('Other')
    ),
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(
      v.literal('Requested'),
      v.literal('Approved'),
      v.literal('Rejected'),
      v.literal('Cancelled')
    ),
    reason: v.string(),
    notesSummary: v.optional(v.string()),
    requestedBy: v.string()
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const teacher = await ctx.db.get(args.teacherId);
    if (!teacher) {
      throw new Error('Teacher not found.');
    }

    const normalized = normalizeLeaveRequest(args);
    const leaveRequestId =
      args.leaveRequestId ?? (await ctx.db.insert('staffLeaveRequests', normalized));

    if (args.leaveRequestId) {
      const existing = await ctx.db.get(args.leaveRequestId);
      if (!existing) {
        throw new Error('Leave request not found.');
      }
      await ctx.db.patch(args.leaveRequestId, normalized);
    }

    const leaveRequest = await ctx.db.get(leaveRequestId);
    if (!leaveRequest) {
      throw new Error('Leave request not found after save.');
    }

    if (leaveRequest.status === 'Approved') {
      await regenerateCoverAssignments(ctx, leaveRequest);
    } else {
      await clearCoverAssignmentsForLeave(ctx, leaveRequest._id);
    }

    return { leaveRequestId };
  }
});

export const setLeaveStatus = mutation({
  args: {
    leaveRequestId: v.id('staffLeaveRequests'),
    status: v.union(
      v.literal('Requested'),
      v.literal('Approved'),
      v.literal('Rejected'),
      v.literal('Cancelled')
    )
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const leaveRequest = await ctx.db.get(args.leaveRequestId);
    if (!leaveRequest) {
      throw new Error('Leave request not found.');
    }

    await ctx.db.patch(args.leaveRequestId, {
      status: args.status,
      updatedAt: Date.now()
    });

    const updated = await ctx.db.get(args.leaveRequestId);
    if (!updated) {
      throw new Error('Leave request not found after update.');
    }

    if (args.status === 'Approved') {
      await regenerateCoverAssignments(ctx, updated);
    } else {
      await clearCoverAssignmentsForLeave(ctx, args.leaveRequestId);
    }

    return { leaveRequestId: args.leaveRequestId };
  }
});

export const assignCoverTeacher = mutation({
  args: {
    coverAssignmentId: v.id('staffCoverAssignments'),
    coverTeacherId: v.optional(v.id('teachers')),
    note: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const assignment = await ctx.db.get(args.coverAssignmentId);
    if (!assignment) {
      throw new Error('Cover assignment not found.');
    }

    if (args.coverTeacherId) {
      const teacher = await ctx.db.get(args.coverTeacherId);
      if (!teacher) {
        throw new Error('Cover teacher not found.');
      }
      if (args.coverTeacherId === assignment.primaryTeacherId) {
        throw new Error('Primary teacher cannot cover their own leave assignment.');
      }
    }

    await ctx.db.patch(args.coverAssignmentId, {
      coverTeacherId: args.coverTeacherId,
      note: args.note?.trim() ?? assignment.note ?? '',
      status: args.coverTeacherId ? 'Assigned' : 'Open',
      updatedAt: Date.now()
    });

    return { coverAssignmentId: args.coverAssignmentId };
  }
});

export const updateCoverAssignment = mutation({
  args: {
    coverAssignmentId: v.id('staffCoverAssignments'),
    coverTeacherId: v.optional(v.id('teachers')),
    status: v.union(
      v.literal('Open'),
      v.literal('Assigned'),
      v.literal('Confirmed'),
      v.literal('Completed')
    ),
    note: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const assignment = await ctx.db.get(args.coverAssignmentId);
    if (!assignment) {
      throw new Error('Cover assignment not found.');
    }

    if (args.coverTeacherId) {
      const teacher = await ctx.db.get(args.coverTeacherId);
      if (!teacher) {
        throw new Error('Cover teacher not found.');
      }
      if (args.coverTeacherId === assignment.primaryTeacherId) {
        throw new Error('Primary teacher cannot cover their own leave assignment.');
      }
    }

    if (
      (args.status === 'Assigned' || args.status === 'Confirmed' || args.status === 'Completed') &&
      !args.coverTeacherId
    ) {
      throw new Error('Assign a cover teacher before moving beyond Open.');
    }

    await ctx.db.patch(args.coverAssignmentId, {
      coverTeacherId: args.coverTeacherId,
      note: args.note?.trim() ?? assignment.note ?? '',
      status: args.coverTeacherId ? args.status : 'Open',
      updatedAt: Date.now()
    });

    return { coverAssignmentId: args.coverAssignmentId };
  }
});

export const setCoverStatus = mutation({
  args: {
    coverAssignmentId: v.id('staffCoverAssignments'),
    status: v.union(
      v.literal('Open'),
      v.literal('Assigned'),
      v.literal('Confirmed'),
      v.literal('Completed')
    )
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const assignment = await ctx.db.get(args.coverAssignmentId);
    if (!assignment) {
      throw new Error('Cover assignment not found.');
    }

    if (
      (args.status === 'Assigned' || args.status === 'Confirmed' || args.status === 'Completed') &&
      !assignment.coverTeacherId
    ) {
      throw new Error('Assign a cover teacher before moving beyond Open.');
    }

    await ctx.db.patch(args.coverAssignmentId, {
      status: args.status,
      updatedAt: Date.now()
    });

    return { coverAssignmentId: args.coverAssignmentId };
  }
});
