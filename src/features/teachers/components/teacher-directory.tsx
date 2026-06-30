'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Option } from '@/types/data-table';
import { api } from '../../../../convex/_generated/api';
import { AddTeacherButton, TeacherFormSheet } from './teacher-form-sheet';
import { getTeacherGridColumns, type TeacherGridRow } from './teacher-grid-columns';

function compareLabels(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function buildOptions(entries: Array<{ label: string; value: string; count: number }>): Option[] {
  return entries
    .filter((entry) => entry.value)
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

function countByValue(rows: TeacherGridRow[], key: keyof TeacherGridRow) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[key] ?? '').trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return buildOptions(
    Array.from(counts.entries()).map(([value, count]) => ({ label: value, value, count }))
  );
}

export default function TeacherDirectory() {
  const teachersQuery = useQuery(api.teachers.list, {});
  const [sorting, setSorting] = useState<SortingState>([{ id: 'teacher', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  const rows = useMemo<TeacherGridRow[]>(() => teachersQuery ?? [], [teachersQuery]);

  const roleOptions = useMemo(() => countByValue(rows, 'role'), [rows]);
  const academicYearOptions = useMemo(() => countByValue(rows, 'academicYear'), [rows]);
  const homeroomOptions = useMemo(() => countByValue(rows, 'homeroomClass'), [rows]);
  const statusOptions = useMemo(() => countByValue(rows, 'status'), [rows]);

  const openEditor = useCallback((teacherId: string | null) => {
    setEditingTeacherId(teacherId);
    setSheetOpen(true);
  }, []);

  const columns = useMemo(
    () =>
      getTeacherGridColumns({
        roleOptions,
        academicYearOptions,
        homeroomOptions,
        statusOptions,
        onEdit: (row) => openEditor(row.id)
      }),
    [roleOptions, academicYearOptions, homeroomOptions, statusOptions, openEditor]
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

  const filteredRows = table.getFilteredRowModel().rows;
  const activeTeachers = rows.filter((row) => row.status === 'Active').length;
  const onLeaveTeachers = rows.filter((row) => row.status === 'On Leave').length;
  const coveredAcademicYears = new Set(rows.map((row) => row.academicYear).filter(Boolean)).size;
  const hasFilters = columnFilters.length > 0;
  const isLoading = teachersQuery === undefined;

  if (isLoading) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Loading editable teacher records...
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>Teacher directory</CardTitle>
          <CardDescription>
            Edit teacher ownership, academic-year coverage, and homeroom assignments directly from
            the grid. Tap a row or use Edit to open the assignment panel.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          <div className='flex flex-wrap gap-2 text-sm text-muted-foreground'>
            <Badge variant='secondary'>{rows.length} teacher records</Badge>
            <Badge variant='outline'>{activeTeachers} active</Badge>
            <Badge variant='outline'>{onLeaveTeachers} on leave</Badge>
            <Badge variant='outline'>{coveredAcademicYears} academic years in coverage</Badge>
          </div>
          <div className='text-sm text-muted-foreground'>
            On desktop and mobile the editor opens as a right-side panel, keeping the grid context
            visible while you update the teacher record.
          </div>
          <div>
            <AddTeacherButton onClick={() => openEditor(null)} />
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-start gap-2 p-6'>
            <div className='font-medium'>No teacher records found yet.</div>
            <div className='text-sm text-muted-foreground'>
              Add teachers here to manage homeroom ownership and class/year coverage from the grid.
            </div>
            <AddTeacherButton onClick={() => openEditor(null)} />
          </CardContent>
        </Card>
      ) : (
        <Card className='flex flex-1 flex-col'>
          <CardContent className='flex flex-1 flex-col p-4'>
            <DataTable table={table} onRowClick={(row) => openEditor(row.original.id)}>
              <DataTableToolbar table={table}>
                <div className='hidden text-xs text-muted-foreground xl:block'>
                  {hasFilters
                    ? 'Filters applied. Reset any filter to widen the editable teacher directory.'
                    : 'Select any teacher row to edit assignment details.'}
                </div>
                <AddTeacherButton onClick={() => openEditor(null)} />
              </DataTableToolbar>
            </DataTable>
            {filteredRows.length === 0 ? (
              <div className='mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed p-3 text-sm text-muted-foreground'>
                <span>No teacher records match the current directory filters.</span>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => table.resetColumnFilters()}
                >
                  Reset filters
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
      <TeacherFormSheet open={sheetOpen} onOpenChange={setSheetOpen} teacherId={editingTeacherId} />
    </div>
  );
}
