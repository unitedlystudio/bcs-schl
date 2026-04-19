import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuthenticatedUser } from './lib/auth';

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

export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    let students = await ctx.db.query('students').withIndex('by_sortName').order('asc').collect();

    if (args.search) {
      const needle = args.search.toLowerCase();
      students = students.filter((student) =>
        [
          student.preferredName,
          student.fullName,
          student.className,
          student.guardianName,
          student.nisn
        ].some((value) => value.toLowerCase().includes(needle))
      );
    }

    return students.map((student) => ({
      id: student._id,
      preferredName: student.preferredName,
      fullName: student.fullName,
      sex: student.sex,
      className: student.className,
      dateOfBirth: student.dateOfBirth,
      dateJoined: student.dateJoined,
      nisn: student.nisn,
      religion: student.religion,
      status: student.status,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      medicalFlag: student.medicalFlag,
      notesSummary: student.notesSummary
    }));
  }
});

export const getById = query({
  args: { studentId: v.id('students') },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const student = await ctx.db.get(args.studentId);
    if (!student) return null;

    return {
      id: student._id,
      preferredName: student.preferredName,
      fullName: student.fullName,
      sex: student.sex,
      className: student.className,
      dateOfBirth: student.dateOfBirth,
      dateJoined: student.dateJoined,
      nisn: student.nisn,
      religion: student.religion,
      status: student.status,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      medicalFlag: student.medicalFlag,
      notesSummary: student.notesSummary
    };
  }
});

export const create = mutation({
  args: {
    preferredName: v.optional(v.string()),
    fullName: v.string(),
    sex: v.union(v.literal('M'), v.literal('F'), v.literal('Unknown')),
    className: v.string(),
    dateOfBirth: v.optional(v.string()),
    dateJoined: v.string(),
    nisn: v.optional(v.string()),
    religion: v.optional(v.string()),
    status: v.union(v.literal('Active'), v.literal('Pending'), v.literal('Archived')),
    guardianName: v.optional(v.string()),
    guardianPhone: v.optional(v.string()),
    medicalFlag: v.optional(v.string()),
    notesSummary: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const fullName = args.fullName.trim();
    const className = args.className.trim();
    const dateJoined = args.dateJoined.trim();

    if (!fullName) {
      throw new Error('Full name is required.');
    }

    if (!className) {
      throw new Error('Class is required.');
    }

    if (!dateJoined) {
      throw new Error('Date joined is required.');
    }

    const preferredName = args.preferredName?.trim() || fullName.split(' ')[0] || fullName;
    const studentId = await ctx.db.insert('students', {
      preferredName,
      fullName,
      sex: args.sex,
      className,
      dateOfBirth: args.dateOfBirth?.trim() ?? '',
      dateJoined: args.dateJoined.trim(),
      nisn: args.nisn?.trim() ?? '',
      religion: args.religion?.trim() ?? '',
      status: args.status,
      guardianName: args.guardianName?.trim() ?? '',
      guardianPhone: args.guardianPhone?.trim() ?? '',
      medicalFlag: args.medicalFlag?.trim() ?? '',
      notesSummary: args.notesSummary?.trim() ?? '',
      sortName: fullName
    });

    return { studentId };
  }
});

export const listClassNames = query({
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
