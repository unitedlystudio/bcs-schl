import { query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuthenticatedUser } from './lib/auth';

const splitFilter = (value?: string) =>
  value
    ? String(value)
        .split(/[.,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

export const list = query({
  args: {
    page: v.number(),
    limit: v.number(),
    categories: v.optional(v.string()),
    statuses: v.optional(v.string()),
    search: v.optional(v.string()),
    sort: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const categoryFilters = splitFilter(args.categories);
    const statusFilters = splitFilter(args.statuses);

    let records = await ctx.db
      .query('accessRecords')
      .withIndex('by_sortOrder')
      .order('asc')
      .collect();

    if (categoryFilters.length > 0) {
      records = records.filter((record) => categoryFilters.includes(record.category));
    }

    if (statusFilters.length > 0) {
      records = records.filter((record) => statusFilters.includes(record.status));
    }

    if (args.search) {
      const needle = args.search.toLowerCase();
      records = records.filter((record) =>
        [
          record.platform,
          record.category,
          record.fullName,
          record.username,
          record.adminsAccess,
          record.recoveryNumber
        ].some((value) => value.toLowerCase().includes(needle))
      );
    }

    if (args.sort) {
      try {
        const sortItems = JSON.parse(args.sort) as { id: string; desc: boolean }[];
        const firstSort = sortItems[0];

        if (firstSort) {
          // oxlint-disable-next-line unicorn/no-array-sort
          records = [...records].sort((a, b) => {
            const left = String(a[firstSort.id as keyof typeof a] ?? '');
            const right = String(b[firstSort.id as keyof typeof b] ?? '');
            const comparison = left.localeCompare(right, undefined, {
              numeric: true,
              sensitivity: 'base'
            });
            return firstSort.desc ? -comparison : comparison;
          });
        }
      } catch {
        // Ignore invalid sort payloads and keep default order.
      }
    }

    const offset = (args.page - 1) * args.limit;
    const paged = records.slice(offset, offset + args.limit);

    return {
      success: true,
      time: new Date().toISOString(),
      message: 'Platform Access records fetched successfully.',
      total_records: records.length,
      offset,
      limit: args.limit,
      records: paged.map((record) => ({
        id: record._id,
        category: record.category,
        platform: record.platform,
        fullName: record.fullName,
        loginUrl: record.loginUrl,
        username: record.username,
        password: record.password,
        listingUrl: record.listingUrl,
        adminsAccess: record.adminsAccess,
        recoveryNumber: record.recoveryNumber,
        status: record.status
      }))
    };
  }
});
