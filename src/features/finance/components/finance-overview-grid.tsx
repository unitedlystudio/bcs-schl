'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';

import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { Button } from '@/components/ui/button';
import type { Option } from '@/types/data-table';
import { getFinanceGridColumns, type FinanceGridRow } from './finance-grid-columns';

function compareLabels(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function buildOptions(entries: Array<{ label: string; value: string; count: number }>): Option[] {
  return entries
    .reduce<Array<{ label: string; value: string; count: number }>>((sorted, entry) => {
      const insertAt = sorted.findIndex((current) => compareLabels(current.label, entry.label) > 0);

      if (insertAt === -1) {
        sorted.push(entry);
      } else {
        sorted.splice(insertAt, 0, entry);
      }

      return sorted;
    }, [])
    .map((entry) => ({
      label: entry.label,
      value: entry.value,
      count: entry.count
    }));
}

export function FinanceOverviewGrid({
  rows,
  onAddProfile,
  canManageProfiles = true
}: {
  rows: FinanceGridRow[];
  onAddProfile: () => void;
  canManageProfiles?: boolean;
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'totalOutstanding', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 12 });

  const classOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.className, (counts.get(row.className) ?? 0) + 1);
    }
    return buildOptions(
      Array.from(counts.entries()).map(([value, count]) => ({ label: value, value, count }))
    );
  }, [rows]);

  const academicYearOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(
        row.academicYear || 'Unassigned',
        (counts.get(row.academicYear || 'Unassigned') ?? 0) + 1
      );
    }
    return buildOptions(
      Array.from(counts.entries()).map(([value, count]) => ({ label: value, value, count }))
    );
  }, [rows]);

  const billingStatusOptions = useMemo(
    () =>
      buildOptions(
        ['Current', 'Overdue', 'Scholarship', 'Custom'].map((value) => ({
          label: value,
          value,
          count: rows.filter((row) => row.billingStatus === value).length
        }))
      ),
    [rows]
  );

  const columns = useMemo(
    () => getFinanceGridColumns({ classOptions, academicYearOptions, billingStatusOptions }),
    [classOptions, academicYearOptions, billingStatusOptions]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: (updaterOrValue) => {
      setColumnFilters((previous) => {
        const next =
          typeof updaterOrValue === 'function' ? updaterOrValue(previous) : updaterOrValue;
        setPagination((current) => ({ ...current, pageIndex: 0 }));
        return next;
      });
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues()
  });

  return (
    <DataTable
      table={table}
      onRowClick={(row) => router.push(`/dashboard/billing/${row.original.studentId}`)}
      rowClassName='group'
    >
      <DataTableToolbar table={table}>
        {canManageProfiles ? <ButtonRow onAddProfile={onAddProfile} /> : null}
      </DataTableToolbar>
    </DataTable>
  );
}

function ButtonRow({ onAddProfile }: { onAddProfile: () => void }) {
  return (
    <Button type='button' variant='outline' size='sm' onClick={onAddProfile}>
      Add billing profile
    </Button>
  );
}
