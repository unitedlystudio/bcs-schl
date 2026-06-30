'use client';

import { useMemo, useState } from 'react';
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
import { useQuery } from 'convex/react';

import { api } from '../../../../convex/_generated/api';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Option } from '@/types/data-table';
import { AddTeacherButton, TeacherFormSheet } from './teacher-form-sheet';
import { getTeacherGridColumns, type TeacherGridRow } from './teacher-grid-columns';

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

export default function TeacherDirectory() {
  const teachersQuery = useQuery(api.teachers.list, {});
  const [sorting, setSorting] = useState<SortingState>([{ id: 'teacher', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(null);

  const rows = useMemo<TeacherGridRow[]>(
    () => (teachersQuery ?? []).map((teacher) => ({ ...teacher })),
    [teachersQuery]
  );

  const roleOptions = useMemo(
    () =>
      buildOptions([
        {
          label: 'Teacher',
          value: 'Teacher',
          count: rows.filter((row) => row.role === 'Teacher').length
        },
        {
          label: 'Homeroom Teacher',
          value: 'Homeroom Teacher',
          count: rows.filter((row) => row.role === 'Homeroom Teacher').length
        },
        {
          label: 'Teaching Assistant',
          value: 'Teaching Assistant',
          count: rows.filter((row) => row.role === 'Teaching Assistant').length
        }
      ]),
    [rows]
  );

  const academicYearOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.academicYear) continue;
      counts.set(row.academicYear, (counts.get(row.academicYear) ?? 0) + 1);
    }

    return buildOptions(
      Array.from(counts.entries()).map(([value, count]) => ({ label: value, value, count }))
    );
  }, [rows]);

  const homeroomOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.homeroomClass) continue;
      counts.set(row.homeroomClass, (counts.get(row.homeroomClass) ?? 0) + 1);
    }

    return buildOptions(
      Array.from(counts.entries()).map(([value, count]) => ({ label: value, value, count }))
    );
  }, [rows]);

  const statusOptions = useMemo(
    () =>
      buildOptions([
        {
          label: 'Active',
          value: 'Active',
          count: rows.filter((row) => row.status === 'Active').length
        },
        {
          label: 'On Leave',
          value: 'On Leave',
          count: rows.filter((row) => row.status === 'On Leave').length
        }
      ]),
    [rows]
  );

  const columns = useMemo(
    () =>
      getTeacherGridColumns({ roleOptions, academicYearOptions, homeroomOptions, statusOptions }),
    [roleOptions, academicYearOptions, homeroomOptions, statusOptions]
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
  const linkedHomerooms = rows.filter((row) => row.homeroomClass).length;
  const coveredAcademicYears = new Set(rows.map((row) => row.academicYear).filter(Boolean)).size;
  const hasFilters = columnFilters.length > 0;

  if (teachersQuery === undefined) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Loading teacher directory...
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>Teacher directory</CardTitle>
          <CardDescription>
            Manage academic year and homeroom ownership as editable school structure, not
            seeded-only metadata. Inviting a workspace member does not create a teacher directory
            record automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          <div className='flex flex-wrap gap-2 text-sm text-muted-foreground'>
            <Badge variant='secondary'>{rows.length} teachers</Badge>
            <Badge variant='outline'>{activeTeachers} active</Badge>
            <Badge variant='outline'>{linkedHomerooms} linked homerooms</Badge>
            <Badge variant='outline'>{coveredAcademicYears} academic years in coverage</Badge>
          </div>
          <div className='text-sm text-muted-foreground'>
            Click a teacher row to manage assignment, role, and contact details.
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-start gap-4 p-6'>
            <div>
              <div className='font-medium'>No teachers in Schly yet.</div>
              <div className='mt-1 text-sm text-muted-foreground'>
                Add the first teacher so year/class ownership stops living only in seed data.
              </div>
            </div>
            <AddTeacherButton
              onClick={() => {
                setActiveTeacherId(null);
                setSheetOpen(true);
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className='flex flex-1 flex-col'>
          <CardContent className='flex flex-1 flex-col p-4'>
            <DataTable
              table={table}
              onRowClick={(row) => {
                setActiveTeacherId(row.original.id);
                setSheetOpen(true);
              }}
            >
              <DataTableToolbar table={table}>
                <div className='hidden text-xs text-muted-foreground xl:block'>
                  {hasFilters
                    ? 'Filters applied. Reset any filter to widen teacher coverage.'
                    : 'Teacher ownership should stay editable and visible across academic years.'}
                </div>
                <AddTeacherButton
                  onClick={() => {
                    setActiveTeacherId(null);
                    setSheetOpen(true);
                  }}
                />
              </DataTableToolbar>
            </DataTable>
            {filteredRows.length === 0 ? (
              <div className='mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed p-3 text-sm text-muted-foreground'>
                <span>No teachers match the current directory filters.</span>
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

      <TeacherFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        teacherId={activeTeacherId}
        onSaved={() => setActiveTeacherId(null)}
      />
    </div>
  );
}
