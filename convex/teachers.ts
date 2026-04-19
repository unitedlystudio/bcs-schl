import { query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuthenticatedUser } from './lib/auth';

function mapTeacher(teacher: {
  _id: string;
  fullName: string;
  preferredName: string;
  role: 'Teacher' | 'Homeroom Teacher' | 'Teaching Assistant';
  status: 'Active' | 'On Leave';
  academicYear?: string;
  homeroomClass?: string;
  email?: string;
  phone?: string;
}) {
  return {
    id: teacher._id,
    fullName: teacher.fullName,
    preferredName: teacher.preferredName,
    role: teacher.role,
    status: teacher.status,
    academicYear: teacher.academicYear ?? '',
    homeroomClass: teacher.homeroomClass ?? '',
    email: teacher.email ?? '',
    phone: teacher.phone ?? ''
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const teachers = await ctx.db.query('teachers').withIndex('by_sortName').order('asc').collect();
    return teachers.map(mapTeacher);
  }
});

export const listForDirectory = query({
  args: {
    academicYear: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    let teachers = await ctx.db.query('teachers').withIndex('by_sortName').order('asc').collect();

    if (args.academicYear) {
      teachers = teachers.filter((teacher) => (teacher.academicYear ?? '') === args.academicYear);
    }

    return teachers.map(mapTeacher);
  }
});
