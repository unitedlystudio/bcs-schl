import { query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuthenticatedUser } from './lib/auth';

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
