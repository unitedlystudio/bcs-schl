import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { v } from 'convex/values';

import { requireAuthenticatedUser } from './lib/auth';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const BLOCK_TYPES = [
  'Arrival',
  'Lesson',
  'Break',
  'Lunch',
  'Specialist',
  'Assembly',
  'Dismissal'
] as const;
const OVERRIDE_TYPES = [
  'Cover',
  'Medical',
  'Lunch',
  'Specialist',
  'Room Change',
  'Trip',
  'Absence',
  'General'
] as const;
const OVERRIDE_STATUSES = ['Open', 'Confirmed', 'Resolved'] as const;

type Weekday = (typeof WEEKDAYS)[number];
type BlockType = (typeof BLOCK_TYPES)[number];
type OverrideType = (typeof OVERRIDE_TYPES)[number];
type OverrideStatus = (typeof OVERRIDE_STATUSES)[number];
type Ctx = QueryCtx | MutationCtx;

type TimeSlotView = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  blockType: BlockType;
  sortOrder: number;
  isActive: boolean;
};

type TimetableEntryView = {
  id: string;
  academicYear: string;
  className: string;
  weekday: Weekday;
  timeSlotId: string;
  activityTitle: string;
  area: string;
  leadTeacherId: string | null;
  leadTeacherName: string;
  location: string;
  specialistLabel: string;
  lunchLabel: string;
  themeLabel: string;
  note: string;
  updatedAt: number;
};

function compareLabels(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function sortCopy<T>(values: T[], compare: (left: T, right: T) => number) {
  const next = [...values];
  next.sort(compare);
  return next;
}

function weekdayFromDate(value: string): Weekday {
  const date = new Date(`${value}T00:00:00`);
  const index = date.getDay();
  if (!Number.isFinite(index) || index === 0 || index > 5) {
    return 'Monday';
  }
  return WEEKDAYS[index - 1];
}

function normalizeTime(value?: string) {
  return value?.trim() ?? '';
}

function formatTimeRange(slot: { startTime: string; endTime: string }) {
  return `${slot.startTime}–${slot.endTime}`;
}

function toTimeSlotView(slot: Doc<'operationsTimeSlots'>): TimeSlotView {
  return {
    id: slot._id,
    label: slot.label,
    startTime: slot.startTime,
    endTime: slot.endTime,
    blockType: slot.blockType,
    sortOrder: slot.sortOrder,
    isActive: slot.isActive
  };
}

async function loadTimeSlots(ctx: Ctx) {
  return ctx.db.query('operationsTimeSlots').withIndex('by_sortOrder').order('asc').collect();
}

async function loadTeachersById(ctx: Ctx) {
  const teachers = await ctx.db.query('teachers').withIndex('by_sortName').order('asc').collect();
  return new Map(teachers.map((teacher) => [teacher._id, teacher]));
}

async function loadStudentsById(ctx: Ctx) {
  const students = await ctx.db.query('students').withIndex('by_sortName').order('asc').collect();
  return new Map(students.map((student) => [student._id, student]));
}

async function enrichEntry(
  ctx: Ctx,
  entry: Doc<'classTimetableEntries'>,
  cachedTeachers?: Map<string, Doc<'teachers'>>
): Promise<TimetableEntryView> {
  const teachersById =
    cachedTeachers ?? ((await loadTeachersById(ctx)) as Map<string, Doc<'teachers'>>);
  const leadTeacher = entry.leadTeacherId ? teachersById.get(entry.leadTeacherId) : null;

  return {
    id: entry._id,
    academicYear: entry.academicYear,
    className: entry.className,
    weekday: entry.weekday,
    timeSlotId: entry.timeSlotId,
    activityTitle: entry.activityTitle,
    area: entry.area ?? '',
    leadTeacherId: entry.leadTeacherId ?? null,
    leadTeacherName: leadTeacher?.fullName ?? 'Unassigned',
    location: entry.location ?? '',
    specialistLabel: entry.specialistLabel ?? '',
    lunchLabel: entry.lunchLabel ?? '',
    themeLabel: entry.themeLabel ?? '',
    note: entry.note ?? '',
    updatedAt: entry.updatedAt
  };
}

function normalizeTimeSlot(input: {
  label: string;
  startTime: string;
  endTime: string;
  blockType: BlockType;
  sortOrder: number;
  isActive: boolean;
}) {
  const label = input.label.trim();
  const startTime = normalizeTime(input.startTime);
  const endTime = normalizeTime(input.endTime);

  if (!label) {
    throw new Error('Time slot label is required.');
  }
  if (!startTime || !endTime) {
    throw new Error('Start and end time are required.');
  }
  if (input.sortOrder < 0) {
    throw new Error('Sort order cannot be negative.');
  }

  return {
    label,
    startTime,
    endTime,
    blockType: input.blockType,
    sortOrder: input.sortOrder,
    isActive: input.isActive
  };
}

function normalizeEntry(input: {
  academicYear: string;
  className: string;
  weekday: Weekday;
  timeSlotId: Id<'operationsTimeSlots'>;
  activityTitle: string;
  area?: string;
  leadTeacherId?: Id<'teachers'>;
  location?: string;
  specialistLabel?: string;
  lunchLabel?: string;
  themeLabel?: string;
  note?: string;
}) {
  const academicYear = input.academicYear.trim();
  const className = input.className.trim();
  const activityTitle = input.activityTitle.trim();

  if (!academicYear) {
    throw new Error('Academic year is required.');
  }
  if (!className) {
    throw new Error('Class is required.');
  }
  if (!activityTitle) {
    throw new Error('Activity title is required.');
  }

  return {
    academicYear,
    className,
    weekday: input.weekday,
    timeSlotId: input.timeSlotId,
    activityTitle,
    area: input.area?.trim() ?? '',
    leadTeacherId: input.leadTeacherId,
    location: input.location?.trim() ?? '',
    specialistLabel: input.specialistLabel?.trim() ?? '',
    lunchLabel: input.lunchLabel?.trim() ?? '',
    themeLabel: input.themeLabel?.trim() ?? '',
    note: input.note?.trim() ?? '',
    updatedAt: Date.now()
  };
}

function normalizeOverride(input: {
  overrideDate: string;
  academicYear?: string;
  className?: string;
  timeSlotId?: Id<'operationsTimeSlots'>;
  overrideType: OverrideType;
  status: OverrideStatus;
  teacherId?: Id<'teachers'>;
  studentId?: Id<'students'>;
  title: string;
  summary: string;
}) {
  const overrideDate = input.overrideDate.trim();
  const title = input.title.trim();
  const summary = input.summary.trim();

  if (!overrideDate) {
    throw new Error('Override date is required.');
  }
  if (!title) {
    throw new Error('Override title is required.');
  }
  if (!summary) {
    throw new Error('Override summary is required.');
  }

  return {
    overrideDate,
    academicYear: input.academicYear?.trim() ?? '',
    className: input.className?.trim() ?? '',
    timeSlotId: input.timeSlotId,
    overrideType: input.overrideType,
    status: input.status,
    teacherId: input.teacherId,
    studentId: input.studentId,
    title,
    summary,
    updatedAt: Date.now()
  };
}

export const listFilters = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const [students, teachers, entries, timeSlots] = await Promise.all([
      ctx.db.query('students').withIndex('by_sortName').order('asc').collect(),
      ctx.db.query('teachers').withIndex('by_sortName').order('asc').collect(),
      ctx.db.query('classTimetableEntries').withIndex('by_updatedAt').order('desc').collect(),
      loadTimeSlots(ctx)
    ]);

    const academicYears = new Set<string>();
    const classOptions = new Map<
      string,
      { academicYear: string; className: string; label: string }
    >();

    for (const student of students) {
      const academicYear = student.academicYear?.trim() ?? '';
      if (academicYear) academicYears.add(academicYear);
      const key = `${academicYear}::${student.className}`;
      if (!classOptions.has(key)) {
        classOptions.set(key, {
          academicYear,
          className: student.className,
          label: academicYear ? `${student.className} • ${academicYear}` : student.className
        });
      }
    }

    for (const entry of entries) {
      if (entry.academicYear) academicYears.add(entry.academicYear);
      const key = `${entry.academicYear}::${entry.className}`;
      if (!classOptions.has(key)) {
        classOptions.set(key, {
          academicYear: entry.academicYear,
          className: entry.className,
          label: entry.academicYear ? `${entry.className} • ${entry.academicYear}` : entry.className
        });
      }
    }

    return {
      academicYears: sortCopy(Array.from(academicYears), compareLabels),
      classes: sortCopy(Array.from(classOptions.values()), (left, right) => {
        if (left.academicYear !== right.academicYear) {
          return compareLabels(left.academicYear, right.academicYear);
        }
        return compareLabels(left.className, right.className);
      }),
      teachers: teachers.map((teacher) => ({
        id: teacher._id,
        label: teacher.fullName,
        role: teacher.role,
        academicYear: teacher.academicYear ?? '',
        homeroomClass: teacher.homeroomClass ?? ''
      })),
      students: students.map((student) => ({
        id: student._id,
        label: `${student.fullName} • ${student.className}${student.academicYear ? ` • ${student.academicYear}` : ''}`,
        className: student.className,
        academicYear: student.academicYear ?? '',
        medicalFlag: student.medicalFlag ?? ''
      })),
      timeSlots: timeSlots.map(toTimeSlotView)
    };
  }
});

export const listTimeSlots = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);
    const slots = await loadTimeSlots(ctx);
    return slots.map((slot) => ({
      ...toTimeSlotView(slot),
      timeRangeLabel: formatTimeRange(slot)
    }));
  }
});

export const summary = query({
  args: {
    date: v.optional(v.string()),
    academicYear: v.optional(v.string()),
    className: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const date = args.date?.trim() || new Date().toISOString().slice(0, 10);
    const [timeSlots, entries, overrides, students] = await Promise.all([
      loadTimeSlots(ctx),
      ctx.db.query('classTimetableEntries').withIndex('by_updatedAt').order('desc').collect(),
      ctx.db
        .query('operationsOverrides')
        .withIndex('by_date', (q) => q.eq('overrideDate', date))
        .collect(),
      ctx.db.query('students').withIndex('by_sortName').order('asc').collect()
    ]);

    const filteredEntries = entries.filter((entry) => {
      if (args.academicYear && entry.academicYear !== args.academicYear) return false;
      if (args.className && entry.className !== args.className) return false;
      return true;
    });
    const filteredOverrides = overrides.filter((override) => {
      if (
        args.academicYear &&
        override.academicYear &&
        override.academicYear !== args.academicYear
      ) {
        return false;
      }
      if (args.className && override.className && override.className !== args.className) {
        return false;
      }
      return true;
    });
    const filteredStudents = students.filter((student) => {
      if (args.academicYear && student.academicYear !== args.academicYear) return false;
      if (args.className && student.className !== args.className) return false;
      return true;
    });

    const activeClassKeys = new Set(
      filteredEntries.map((entry) => `${entry.academicYear}::${entry.className}`)
    );

    return {
      timeSlots: timeSlots.filter((slot) => slot.isActive).length,
      activeClasses: activeClassKeys.size,
      timetableBlocks: filteredEntries.length,
      specialistBlocks: filteredEntries.filter((entry) => Boolean(entry.specialistLabel)).length,
      openOverrides: filteredOverrides.filter((override) => override.status !== 'Resolved').length,
      medicalFlags: filteredStudents.filter((student) => Boolean(student.medicalFlag?.trim()))
        .length
    };
  }
});

export const getClassWeek = query({
  args: {
    academicYear: v.string(),
    className: v.string()
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const [timeSlots, teachersById, entries] = await Promise.all([
      loadTimeSlots(ctx),
      loadTeachersById(ctx),
      ctx.db
        .query('classTimetableEntries')
        .withIndex('by_class', (q) =>
          q.eq('academicYear', args.academicYear).eq('className', args.className)
        )
        .order('desc')
        .collect()
    ]);

    const enrichedEntries = await Promise.all(
      entries.map((entry) => enrichEntry(ctx, entry, teachersById as Map<string, Doc<'teachers'>>))
    );

    const entryByWeekdaySlot = new Map<string, TimetableEntryView>();
    for (const entry of enrichedEntries) {
      entryByWeekdaySlot.set(`${entry.weekday}::${entry.timeSlotId}`, entry);
    }

    return {
      academicYear: args.academicYear,
      className: args.className,
      weekdays: WEEKDAYS,
      timeSlots: timeSlots.map((slot) => ({
        ...toTimeSlotView(slot),
        timeRangeLabel: formatTimeRange(slot),
        entries: Object.fromEntries(
          WEEKDAYS.map((weekday) => [
            weekday,
            entryByWeekdaySlot.get(`${weekday}::${slot._id}`) ?? null
          ])
        ) as Record<Weekday, TimetableEntryView | null>
      }))
    };
  }
});

export const getEntryById = query({
  args: { entryId: v.id('classTimetableEntries') },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry) return null;
    return enrichEntry(ctx, entry);
  }
});

export const getOverrideById = query({
  args: { overrideId: v.id('operationsOverrides') },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const override = await ctx.db.get(args.overrideId);
    if (!override) return null;

    const [teachersById, studentsById, timeSlots] = await Promise.all([
      loadTeachersById(ctx),
      loadStudentsById(ctx),
      loadTimeSlots(ctx)
    ]);
    const timeSlot = override.timeSlotId
      ? timeSlots.find((slot) => slot._id === override.timeSlotId)
      : null;
    const teacher = override.teacherId ? teachersById.get(override.teacherId) : null;
    const student = override.studentId ? studentsById.get(override.studentId) : null;

    return {
      id: override._id,
      overrideDate: override.overrideDate,
      academicYear: override.academicYear ?? '',
      className: override.className ?? '',
      timeSlotId: override.timeSlotId ?? null,
      timeSlotLabel: timeSlot ? `${timeSlot.label} • ${formatTimeRange(timeSlot)}` : '',
      overrideType: override.overrideType,
      status: override.status,
      teacherId: override.teacherId ?? null,
      teacherName: teacher?.fullName ?? '',
      studentId: override.studentId ?? null,
      studentName: student?.fullName ?? '',
      title: override.title,
      summary: override.summary,
      updatedAt: override.updatedAt
    };
  }
});

export const getDayBoard = query({
  args: {
    date: v.string(),
    academicYear: v.optional(v.string()),
    className: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const [timeSlots, teachersById, studentsById, overrides] = await Promise.all([
      loadTimeSlots(ctx),
      loadTeachersById(ctx),
      loadStudentsById(ctx),
      ctx.db
        .query('operationsOverrides')
        .withIndex('by_date', (q) => q.eq('overrideDate', args.date))
        .collect()
    ]);
    const weekday = weekdayFromDate(args.date);

    const dailyEntries =
      args.academicYear && args.className
        ? await ctx.db
            .query('classTimetableEntries')
            .withIndex('by_class', (q) =>
              q.eq('academicYear', args.academicYear!).eq('className', args.className!)
            )
            .order('desc')
            .collect()
        : [];
    const filteredEntries = dailyEntries.filter((entry) => entry.weekday === weekday);
    const slotById = new Map(timeSlots.map((slot) => [slot._id, slot]));

    const blocks = await Promise.all(
      filteredEntries.map(async (entry) => {
        const enriched = await enrichEntry(
          ctx,
          entry,
          teachersById as Map<string, Doc<'teachers'>>
        );
        const slot = slotById.get(entry.timeSlotId);
        return {
          ...enriched,
          timeSlotLabel: slot?.label ?? 'Unknown slot',
          timeRangeLabel: slot ? formatTimeRange(slot) : ''
        };
      })
    );
    blocks.sort((left, right) => {
      const leftSlot = timeSlots.find((slot) => slot._id === left.timeSlotId)?.sortOrder ?? 0;
      const rightSlot = timeSlots.find((slot) => slot._id === right.timeSlotId)?.sortOrder ?? 0;
      return leftSlot - rightSlot;
    });

    const filteredOverrides = overrides.filter((override) => {
      if (
        args.academicYear &&
        override.academicYear &&
        override.academicYear !== args.academicYear
      ) {
        return false;
      }
      if (args.className && override.className && override.className !== args.className) {
        return false;
      }
      return true;
    });

    const enrichedOverrides = filteredOverrides.map((override) => {
      const slot = override.timeSlotId ? slotById.get(override.timeSlotId) : null;
      const teacher = override.teacherId ? teachersById.get(override.teacherId) : null;
      const student = override.studentId ? studentsById.get(override.studentId) : null;
      return {
        id: override._id,
        overrideDate: override.overrideDate,
        academicYear: override.academicYear ?? '',
        className: override.className ?? '',
        timeSlotId: override.timeSlotId ?? null,
        timeSlotLabel: slot ? `${slot.label} • ${formatTimeRange(slot)}` : 'Whole day',
        overrideType: override.overrideType,
        status: override.status,
        teacherId: override.teacherId ?? null,
        teacherName: teacher?.fullName ?? '',
        studentId: override.studentId ?? null,
        studentName: student?.fullName ?? '',
        title: override.title,
        summary: override.summary,
        updatedAt: override.updatedAt
      };
    });
    enrichedOverrides.sort((left, right) => right.updatedAt - left.updatedAt);

    const medicalFlags = args.className
      ? Array.from(studentsById.values())
          .filter((student) => {
            if (student.className !== args.className) return false;
            if (args.academicYear && student.academicYear !== args.academicYear) return false;
            return Boolean(student.medicalFlag?.trim());
          })
          .map((student) => ({
            studentId: student._id,
            studentName: student.fullName,
            className: student.className,
            academicYear: student.academicYear ?? '',
            medicalFlag: student.medicalFlag ?? ''
          }))
      : [];

    return {
      date: args.date,
      weekday,
      blocks,
      overrides: enrichedOverrides,
      medicalFlags
    };
  }
});

export const upsertTimeSlot = mutation({
  args: {
    timeSlotId: v.optional(v.id('operationsTimeSlots')),
    label: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    blockType: v.union(...BLOCK_TYPES.map((item) => v.literal(item))),
    sortOrder: v.number(),
    isActive: v.boolean()
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const payload = normalizeTimeSlot(args);

    if (args.timeSlotId) {
      const existing = await ctx.db.get(args.timeSlotId);
      if (!existing) throw new Error('Time slot not found.');
      await ctx.db.patch(args.timeSlotId, payload);
      return { timeSlotId: args.timeSlotId };
    }

    const timeSlotId = await ctx.db.insert('operationsTimeSlots', payload);
    return { timeSlotId };
  }
});

export const upsertClassEntry = mutation({
  args: {
    entryId: v.optional(v.id('classTimetableEntries')),
    academicYear: v.string(),
    className: v.string(),
    weekday: v.union(...WEEKDAYS.map((item) => v.literal(item))),
    timeSlotId: v.id('operationsTimeSlots'),
    activityTitle: v.string(),
    area: v.optional(v.string()),
    leadTeacherId: v.optional(v.id('teachers')),
    location: v.optional(v.string()),
    specialistLabel: v.optional(v.string()),
    lunchLabel: v.optional(v.string()),
    themeLabel: v.optional(v.string()),
    note: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const payload = normalizeEntry(args);

    if (args.entryId) {
      const existing = await ctx.db.get(args.entryId);
      if (!existing) throw new Error('Timetable entry not found.');
      await ctx.db.patch(args.entryId, payload);
      return { entryId: args.entryId };
    }

    const duplicate = await ctx.db
      .query('classTimetableEntries')
      .withIndex('by_class', (q) =>
        q.eq('academicYear', payload.academicYear).eq('className', payload.className)
      )
      .collect();
    const conflict = duplicate.find(
      (entry) => entry.weekday === payload.weekday && entry.timeSlotId === payload.timeSlotId
    );
    if (conflict) {
      throw new Error('A timetable block already exists for that class, weekday, and time slot.');
    }

    const entryId = await ctx.db.insert('classTimetableEntries', payload);
    return { entryId };
  }
});

export const deleteClassEntry = mutation({
  args: { entryId: v.id('classTimetableEntries') },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const existing = await ctx.db.get(args.entryId);
    if (!existing) throw new Error('Timetable entry not found.');
    await ctx.db.delete(args.entryId);
    return { ok: true };
  }
});

export const createOverride = mutation({
  args: {
    overrideDate: v.string(),
    academicYear: v.optional(v.string()),
    className: v.optional(v.string()),
    timeSlotId: v.optional(v.id('operationsTimeSlots')),
    overrideType: v.union(...OVERRIDE_TYPES.map((item) => v.literal(item))),
    status: v.union(...OVERRIDE_STATUSES.map((item) => v.literal(item))),
    teacherId: v.optional(v.id('teachers')),
    studentId: v.optional(v.id('students')),
    title: v.string(),
    summary: v.string()
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const overrideId = await ctx.db.insert('operationsOverrides', normalizeOverride(args));
    return { overrideId };
  }
});

export const updateOverride = mutation({
  args: {
    overrideId: v.id('operationsOverrides'),
    overrideDate: v.string(),
    academicYear: v.optional(v.string()),
    className: v.optional(v.string()),
    timeSlotId: v.optional(v.id('operationsTimeSlots')),
    overrideType: v.union(...OVERRIDE_TYPES.map((item) => v.literal(item))),
    status: v.union(...OVERRIDE_STATUSES.map((item) => v.literal(item))),
    teacherId: v.optional(v.id('teachers')),
    studentId: v.optional(v.id('students')),
    title: v.string(),
    summary: v.string()
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const existing = await ctx.db.get(args.overrideId);
    if (!existing) throw new Error('Override not found.');
    await ctx.db.patch(args.overrideId, normalizeOverride(args));
    return { overrideId: args.overrideId };
  }
});

export const resolveOverride = mutation({
  args: { overrideId: v.id('operationsOverrides') },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const existing = await ctx.db.get(args.overrideId);
    if (!existing) throw new Error('Override not found.');
    await ctx.db.patch(args.overrideId, {
      status: 'Resolved',
      updatedAt: Date.now()
    });
    return { overrideId: args.overrideId };
  }
});
