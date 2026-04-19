'use client';

import { api } from '../../../../../convex/_generated/api';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { getSortingStateParser } from '@/lib/parsers';
import { useQuery } from 'convex/react';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useMemo } from 'react';
import { columns } from './columns';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

export function AccessTable() {
  const [params] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    name: parseAsString,
    category: parseAsString,
    status: parseAsString,
    sort: getSortingStateParser(columnIds).withDefault([])
  });

  const filters = useMemo(
    () => ({
      page: params.page,
      limit: params.perPage,
      ...(params.name && { search: params.name }),
      ...(params.category && { categories: params.category }),
      ...(params.status && { statuses: params.status }),
      ...(params.sort.length > 0 && { sort: JSON.stringify(params.sort) })
    }),
    [params.category, params.name, params.page, params.perPage, params.sort, params.status]
  );

  const data = useQuery(api.access.list, filters);

  const tableData = data?.records ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.total_records / params.perPage)) : 1;

  const { table } = useDataTable({
    data: tableData,
    columns,
    pageCount,
    shallow: true,
    debounceMs: 300
  });

  if (!data) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Loading platform access records...
      </div>
    );
  }

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
