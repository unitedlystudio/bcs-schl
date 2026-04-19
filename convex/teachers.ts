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

function normalizeTeacher(input: {
  fullName: string;
  preferredName?: string;
  role: 'Teacher' | 'Homeroom Teacher' | 'Teaching Assistant';
  status: 'Active' | 'On Leave';
  academicYear?: string;
  homeroomClass?: string;
  email?: string;
  phone?: string;
}) {
  const fullName = input.fullName.trim();

  if (!fullName) {
    throw new Error('Teacher full name is required.');
  }

  return {
    fullName,
    preferredName: input.preferredName?.trim() || fullName.split(' ')[0] || fullName,
    role: input.role,
    status: input.status,
    academicYear: input.academicYear?.trim() ?? '',
    homeroomClass: input.homeroomClass?.trim() ?? '',
    email: input.email?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    sortName: fullName
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

export const getById = query({
  args: { teacherId: v.id('teachers') },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const teacher = await ctx.db.get(args.teacherId);
    if (!teacher) return null;

    return mapTeacher(teacher);
  }
});

export const listFilterOptions = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const teachers = await ctx.db.query('teachers').withIndex('by_sortName').order('asc').collect();
    const academicYears: string[] = [];
    const homeroomClasses: string[] = [];

    for (const teacher of teachers) {
      const year = teacher.academicYear ?? '';
      const homeroomClass = teacher.homeroomClass ?? '';

      if (year && !academicYears.includes(year)) {
        academicYears.push(year);
      }

      if (homeroomClass && !homeroomClasses.includes(homeroomClass)) {
        homeroomClasses.push(homeroomClass);
      }
    }

    return {
      academicYears: academicYears.reduce<string[]>((acc, year) => insertSorted(acc, year), []),
      homeroomClasses: homeroomClasses.reduce<string[]>(
        (acc, className) => insertSorted(acc, className),
        []
      )
    };
  }
});

export const create = mutation({
  args: {
    fullName: v.string(),
    preferredName: v.optional(v.string()),
    role: v.union(
      v.literal('Teacher'),
      v.literal('Homeroom Teacher'),
      v.literal('Teaching Assistant')
    ),
    status: v.union(v.literal('Active'), v.literal('On Leave')),
    academicYear: v.optional(v.string()),
    homeroomClass: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const teacherId = await ctx.db.insert('teachers', normalizeTeacher(args));
    return { teacherId };
  }
});

export const update = mutation({
  args: {
    teacherId: v.id('teachers'),
    fullName: v.string(),
    preferredName: v.optional(v.string()),
    role: v.union(
      v.literal('Teacher'),
      v.literal('Homeroom Teacher'),
      v.literal('Teaching Assistant')
    ),
    status: v.union(v.literal('Active'), v.literal('On Leave')),
    academicYear: v.optional(v.string()),
    homeroomClass: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const existing = await ctx.db.get(args.teacherId);
    if (!existing) {
      throw new Error('Teacher not found.');
    }

    await ctx.db.patch(args.teacherId, normalizeTeacher(args));
    return { teacherId: args.teacherId };
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
