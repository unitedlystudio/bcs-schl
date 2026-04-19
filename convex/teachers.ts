import { query } from './_generated/server';
import { requireAuthenticatedUser } from './lib/auth';

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const teachers = await ctx.db.query('teachers').withIndex('by_sortName').order('asc').collect();

    return teachers.map((teacher) => ({
      id: teacher._id,
      fullName: teacher.fullName,
      preferredName: teacher.preferredName,
      role: teacher.role,
      status: teacher.status,
      academicYear: teacher.academicYear ?? '',
      homeroomClass: teacher.homeroomClass ?? '',
      email: teacher.email ?? '',
      phone: teacher.phone ?? ''
    }));
  }
});
