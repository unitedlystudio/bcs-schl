import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { requireAuthenticatedUser } from './lib/auth';

const ATTENDANCE_STATUSES = ['Present', 'Late', 'Absent', 'Excused'] as const;

type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
type SessionCtx = MutationCtx | QueryCtx;

function buildSortKey(sessionDate: string, className: string) {
  return `${sessionDate}::${className.toLowerCase()}`;
}

function compareLabels(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function insertSorted(values: string[], value: string) {
  const next = [...values];
  const insertAt = next.findIndex((item) => compareLabels(value, item) < 0);

  if (insertAt === -1) {
    next.push(value);
  } else {
    next.splice(insertAt, 0, value);
  }

  return next;
}

function getRankingTime(updatedAt: number | undefined, creationTime: number) {
  return updatedAt ?? creationTime;
}

function pickCanonicalSession<T extends { updatedAt: number; _creationTime: number }>(
  sessions: T[]
) {
  let canonical: T | null = null;
  let canonicalTime = -1;

  for (const session of sessions) {
    const rankingTime = getRankingTime(session.updatedAt, session._creationTime);
    if (!canonical || rankingTime > canonicalTime) {
      canonical = session;
      canonicalTime = rankingTime;
    }
  }

  return canonical;
}

function selectLatestRecordsByStudent<
  T extends { studentId: string; updatedAt: number; _creationTime: number }
>(records: T[]) {
  const latestByStudent = new Map<string, T>();

  for (const record of records) {
    const existing = latestByStudent.get(record.studentId);
    const rankingTime = getRankingTime(record.updatedAt, record._creationTime);
    const existingTime = existing ? getRankingTime(existing.updatedAt, existing._creationTime) : -1;

    if (!existing || rankingTime > existingTime) {
      latestByStudent.set(record.studentId, record);
    }
  }

  return latestByStudent;
}

async function listSessionsForClassDate(ctx: SessionCtx, className: string, sessionDate: string) {
  return ctx.db
    .query('attendanceSessions')
    .withIndex('by_classAndDate', (query) =>
      query.eq('className', className).eq('sessionDate', sessionDate)
    )
    .collect();
}

async function getCanonicalSession(ctx: SessionCtx, className: string, sessionDate: string) {
  const sessions = await listSessionsForClassDate(ctx, className, sessionDate);
  return pickCanonicalSession(sessions);
}

async function collapseSessionStudentRecords(
  ctx: MutationCtx,
  sessionId: string,
  studentId: string,
  fallback?: { status: AttendanceStatus; note?: string; updatedAt: number }
) {
  const records = await ctx.db
    .query('attendanceRecords')
    .withIndex('by_session_student', (query) =>
      query.eq('sessionId', sessionId as never).eq('studentId', studentId as never)
    )
    .collect();

  let canonicalRecord: (typeof records)[number] | null = null;
  let canonicalRecordTime = -1;
  const duplicates: typeof records = [];

  for (const record of records) {
    const rankingTime = record.updatedAt ?? record._creationTime;

    if (!canonicalRecord || rankingTime > canonicalRecordTime) {
      if (canonicalRecord) {
        duplicates.push(canonicalRecord);
      }
      canonicalRecord = record;
      canonicalRecordTime = rankingTime;
    } else {
      duplicates.push(record);
    }
  }

  if (!canonicalRecord && fallback) {
    const createdId = await ctx.db.insert('attendanceRecords', {
      sessionId: sessionId as never,
      studentId: studentId as never,
      status: fallback.status,
      note: fallback.note ?? '',
      updatedAt: fallback.updatedAt
    });

    return ctx.db.get(createdId);
  }

  if (!canonicalRecord) {
    return null;
  }

  for (const duplicate of duplicates) {
    await ctx.db.delete(duplicate._id);
  }

  if (fallback && fallback.updatedAt >= canonicalRecordTime) {
    await ctx.db.patch(canonicalRecord._id, {
      status: fallback.status,
      note: fallback.note ?? '',
      updatedAt: fallback.updatedAt
    });
    return ctx.db.get(canonicalRecord._id);
  }

  return canonicalRecord;
}

async function ensureCanonicalSession(
  ctx: MutationCtx,
  className: string,
  sessionDate: string,
  updatedAt: number
) {
  let sessions = await listSessionsForClassDate(ctx, className, sessionDate);

  if (sessions.length === 0) {
    await ctx.db.insert('attendanceSessions', {
      className,
      sessionDate,
      status: 'In progress',
      notesSummary: '',
      sortKey: buildSortKey(sessionDate, className),
      updatedAt
    });
    sessions = await listSessionsForClassDate(ctx, className, sessionDate);
  }

  const canonicalSession = pickCanonicalSession(sessions);
  if (!canonicalSession) {
    throw new Error('Attendance session could not be created.');
  }

  for (const duplicateSession of sessions.slice(1)) {
    const duplicateRecords = await ctx.db
      .query('attendanceRecords')
      .withIndex('by_session', (query) => query.eq('sessionId', duplicateSession._id))
      .collect();

    for (const record of duplicateRecords) {
      await collapseSessionStudentRecords(ctx, canonicalSession._id, record.studentId, {
        status: record.status,
        note: record.note,
        updatedAt: record.updatedAt
      });
      await ctx.db.delete(record._id);
    }

    await ctx.db.delete(duplicateSession._id);
  }

  return canonicalSession;
}

export const listClasses = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const students = await ctx.db.query('students').withIndex('by_sortName').order('asc').collect();
    return students.reduce<string[]>((acc, student) => {
      if (acc.includes(student.className)) {
        return acc;
      }

      return insertSorted(acc, student.className);
    }, []);
  }
});

export const getSession = query({
  args: {
    className: v.string(),
    sessionDate: v.string()
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const [students, session] = await Promise.all([
      ctx.db
        .query('students')
        .withIndex('by_className', (query) => query.eq('className', args.className))
        .collect(),
      getCanonicalSession(ctx, args.className, args.sessionDate)
    ]);

    const attendanceRecords = session
      ? await ctx.db
          .query('attendanceRecords')
          .withIndex('by_session', (query) => query.eq('sessionId', session._id))
          .collect()
      : [];

    const recordsByStudent = selectLatestRecordsByStudent(attendanceRecords);

    const records = students.map((student) => {
      const record = recordsByStudent.get(student._id);
      return {
        studentId: student._id,
        preferredName: student.preferredName,
        fullName: student.fullName,
        guardianName: student.guardianName,
        medicalFlag: student.medicalFlag,
        status: (record?.status ?? 'Unmarked') as AttendanceStatus | 'Unmarked',
        note: record?.note ?? ''
      };
    });

    const summary = {
      totalStudents: records.length,
      present: records.filter((record) => record.status === 'Present').length,
      late: records.filter((record) => record.status === 'Late').length,
      absent: records.filter((record) => record.status === 'Absent').length,
      excused: records.filter((record) => record.status === 'Excused').length,
      unmarked: records.filter((record) => record.status === 'Unmarked').length
    };

    return {
      className: args.className,
      sessionDate: args.sessionDate,
      sessionId: session?._id ?? null,
      sessionStatus: session?.status ?? 'Draft',
      records,
      summary
    };
  }
});

export const recentSessions = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const sessions = await ctx.db
      .query('attendanceSessions')
      .withIndex('by_updatedAt')
      .order('desc')
      .take(6);

    return Promise.all(
      sessions.map(async (session) => {
        const records = await ctx.db
          .query('attendanceRecords')
          .withIndex('by_session', (query) => query.eq('sessionId', session._id))
          .collect();

        const latestRecords = Array.from(selectLatestRecordsByStudent(records).values());

        return {
          id: session._id,
          className: session.className,
          sessionDate: session.sessionDate,
          status: session.status,
          markedCount: latestRecords.length,
          absentCount: latestRecords.filter((record) => record.status === 'Absent').length,
          lateCount: latestRecords.filter((record) => record.status === 'Late').length
        };
      })
    );
  }
});

export const setStudentStatus = mutation({
  args: {
    className: v.string(),
    sessionDate: v.string(),
    studentId: v.id('students'),
    status: v.union(
      v.literal('Present'),
      v.literal('Late'),
      v.literal('Absent'),
      v.literal('Excused')
    ),
    note: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const student = await ctx.db.get(args.studentId);
    if (!student) {
      throw new Error('Student not found.');
    }

    if (student.className !== args.className) {
      throw new Error('Student does not belong to the selected class.');
    }

    const now = Date.now();
    const session = await ensureCanonicalSession(ctx, args.className, args.sessionDate, now);

    await collapseSessionStudentRecords(ctx, session._id, args.studentId, {
      status: args.status,
      note: args.note,
      updatedAt: now
    });

    const [classStudents, allSessionRecords] = await Promise.all([
      ctx.db
        .query('students')
        .withIndex('by_className', (query) => query.eq('className', args.className))
        .collect(),
      ctx.db
        .query('attendanceRecords')
        .withIndex('by_session', (query) => query.eq('sessionId', session._id))
        .collect()
    ]);

    const validStudentIds = new Set(classStudents.map((classStudent) => classStudent._id));
    const markedStudentIds = new Set(
      allSessionRecords
        .filter((record) => validStudentIds.has(record.studentId))
        .map((record) => record.studentId)
    );

    const nextStatus =
      classStudents.length > 0 && markedStudentIds.size >= classStudents.length
        ? 'Completed'
        : 'In progress';

    await ctx.db.patch(session._id, {
      status: nextStatus,
      updatedAt: now
    });

    return { ok: true };
  }
});
