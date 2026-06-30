'use client';

import { useCallback, useMemo, useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
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

function fullNameFromParts(
  firstName?: string | null,
  lastName?: string | null,
  fallback?: string | null
) {
  const name = [firstName, lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

  return name || fallback?.trim() || 'Unnamed teacher';
}

function isTeacherRole(role: string) {
  return role.toLowerCase().includes('teacher');
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
  const { isLoaded, memberships } = useOrganization({
    memberships: {
      infinite: true,
      keepPreviousData: true,
      pageSize: 100
    }
  });
  const teachersQuery = useQuery(api.teachers.list, {});
  const ensureTeacher = useMutation(api.teachers.ensureFromDirectory);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'teacher', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [creatingTeacherId, setCreatingTeacherId] = useState<string | null>(null);

  const rows = useMemo<TeacherGridRow[]>(() => {
    const localByEmail = new Map(
      (teachersQuery ?? [])
        .filter((teacher) => teacher.email.trim())
        .map((teacher) => [teacher.email.trim().toLowerCase(), teacher])
    );

    const teacherRows: TeacherGridRow[] = [];

    for (const membership of memberships?.data ?? []) {
      const user = membership.publicUserData;
      const email = user?.identifier?.trim() ?? '';
      const role = membership.roleName || membership.role || 'Teacher';

      if (!isTeacherRole(role)) {
        continue;
      }

      const localTeacher = email ? localByEmail.get(email.toLowerCase()) : undefined;
      const fullName = fullNameFromParts(user?.firstName, user?.lastName, email);

      teacherRows.push({
        id: localTeacher?.id ?? user?.userId ?? membership.id,
        localTeacherId: localTeacher?.id,
        fullName: localTeacher?.fullName || fullName,
        preferredName:
          localTeacher?.preferredName ||
          user?.firstName?.trim() ||
          fullName.split(' ')[0] ||
          fullName,
        role: localTeacher?.role || role,
        status: localTeacher?.status || 'Active',
        academicYear: localTeacher?.academicYear ?? '',
        homeroomClass: localTeacher?.homeroomClass ?? '',
        email,
        phone: localTeacher?.phone ?? ''
      });
    }

    return teacherRows.toSorted((left, right) => compareLabels(left.fullName, right.fullName));
  }, [memberships?.data, teachersQuery]);

  const roleOptions = useMemo(() => countByValue(rows, 'role'), [rows]);
  const academicYearOptions = useMemo(() => countByValue(rows, 'academicYear'), [rows]);
  const homeroomOptions = useMemo(() => countByValue(rows, 'homeroomClass'), [rows]);
  const statusOptions = useMemo(() => countByValue(rows, 'status'), [rows]);

  const openEditor = useCallback((teacherId: string | null) => {
    setEditingTeacherId(teacherId);
    setSheetOpen(true);
  }, []);

  const openTeacherEditor = useCallback(
    async (row: TeacherGridRow) => {
      if (row.localTeacherId) {
        openEditor(row.localTeacherId);
        return;
      }

      if (!row.email) {
        toast.error('This Clerk teacher membership does not have an email address to sync.');
        return;
      }

      try {
        setCreatingTeacherId(row.id);
        const result = await ensureTeacher({
          fullName: row.fullName,
          preferredName: row.preferredName,
          email: row.email
        });
        openEditor(result.teacherId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to prepare teacher editor');
      } finally {
        setCreatingTeacherId(null);
      }
    },
    [ensureTeacher, openEditor]
  );

  const columns = useMemo(
    () =>
      getTeacherGridColumns({
        roleOptions,
        academicYearOptions,
        homeroomOptions,
        statusOptions,
        onEdit: (row) => void openTeacherEditor(row)
      }),
    [roleOptions, academicYearOptions, homeroomOptions, statusOptions, openTeacherEditor]
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
  const isLoading = !isLoaded || memberships === null || teachersQuery === undefined;

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
            Showing Clerk workspace members whose role is Teacher, with editable Schly assignment
            details layered on top for academic-year coverage and homerooms.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          <div className='flex flex-wrap gap-2 text-sm text-muted-foreground'>
            <Badge variant='secondary'>{rows.length} Clerk teacher members</Badge>
            <Badge variant='outline'>{activeTeachers} active</Badge>
            <Badge variant='outline'>{onLeaveTeachers} on leave</Badge>
            <Badge variant='outline'>{coveredAcademicYears} academic years in coverage</Badge>
          </div>
          <div className='text-sm text-muted-foreground'>
            Demo teacher rows are filtered out unless they match a live Clerk Teacher member by
            email.
          </div>
          <div>
            <AddTeacherButton onClick={() => openEditor(null)} />
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-start gap-2 p-6'>
            <div className='font-medium'>No Clerk Teacher members found yet.</div>
            <div className='text-sm text-muted-foreground'>
              Set a workspace member to a Clerk role whose name includes “Teacher” to show them
              here.
            </div>
            <AddTeacherButton onClick={() => openEditor(null)} />
          </CardContent>
        </Card>
      ) : (
        <Card className='flex flex-1 flex-col'>
          <CardContent className='flex flex-1 flex-col p-4'>
            <DataTable table={table} onRowClick={(row) => void openTeacherEditor(row.original)}>
              <DataTableToolbar table={table}>
                <div className='hidden text-xs text-muted-foreground xl:block'>
                  {creatingTeacherId
                    ? 'Preparing editable teacher assignment record...'
                    : hasFilters
                      ? 'Filters applied. Reset any filter to widen the live teacher directory.'
                      : 'This table is sourced from Clerk workspace members with Teacher roles. Select a row to edit assignment details.'}
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
