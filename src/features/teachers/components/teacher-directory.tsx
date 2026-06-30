'use client';

import { useMemo, useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
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

  return name || fallback?.trim() || 'Unnamed staff member';
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
  const { isLoaded, memberships, invitations } = useOrganization({
    memberships: {
      infinite: true,
      keepPreviousData: true,
      pageSize: 100
    },
    invitations: {
      infinite: true,
      keepPreviousData: true,
      pageSize: 100
    }
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'teacher', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const rows = useMemo<TeacherGridRow[]>(() => {
    const memberRows = (memberships?.data ?? []).map((membership) => {
      const user = membership.publicUserData;
      const fullName = fullNameFromParts(user?.firstName, user?.lastName, user?.identifier);

      return {
        id: user?.userId ?? membership.id,
        fullName,
        preferredName: user?.firstName?.trim() || fullName.split(' ')[0] || fullName,
        role: membership.roleName || membership.role || 'Staff',
        status: 'Active',
        academicYear: '',
        homeroomClass: '',
        email: user?.identifier ?? '',
        phone: ''
      };
    });

    const invitationRows = (invitations?.data ?? [])
      .filter((invitation) => invitation.status === 'pending')
      .map((invitation) => ({
        id: invitation.id,
        fullName: invitation.emailAddress,
        preferredName: invitation.emailAddress.split('@')[0] || invitation.emailAddress,
        role: invitation.roleName || invitation.role || 'Invited staff',
        status: 'Pending invite',
        academicYear: '',
        homeroomClass: '',
        email: invitation.emailAddress,
        phone: ''
      }));

    return [...memberRows, ...invitationRows].toSorted((left, right) =>
      compareLabels(left.fullName, right.fullName)
    );
  }, [invitations?.data, memberships?.data]);

  const roleOptions = useMemo(() => countByValue(rows, 'role'), [rows]);
  const academicYearOptions = useMemo(() => countByValue(rows, 'academicYear'), [rows]);
  const homeroomOptions = useMemo(() => countByValue(rows, 'homeroomClass'), [rows]);
  const statusOptions = useMemo(() => countByValue(rows, 'status'), [rows]);

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
  const pendingInvites = rows.filter((row) => row.status === 'Pending invite').length;
  const coveredAcademicYears = new Set(rows.map((row) => row.academicYear).filter(Boolean)).size;
  const hasFilters = columnFilters.length > 0;
  const isLoading = !isLoaded || memberships === null || invitations === null;
  const canLoadMore = Boolean(memberships?.hasNextPage || invitations?.hasNextPage);

  const loadMore = async () => {
    await Promise.all([memberships?.fetchNext?.(), invitations?.fetchNext?.()]);
  };

  if (isLoading) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Loading real teacher and staff records from the active school workspace...
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>Teacher directory</CardTitle>
          <CardDescription>
            Showing live staff records from the active Clerk school workspace. Seed/demo teacher
            rows are no longer used for this page.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          <div className='flex flex-wrap gap-2 text-sm text-muted-foreground'>
            <Badge variant='secondary'>{rows.length} staff records</Badge>
            <Badge variant='outline'>{activeTeachers} active</Badge>
            <Badge variant='outline'>{pendingInvites} pending invites</Badge>
            <Badge variant='outline'>{coveredAcademicYears} academic years in coverage</Badge>
          </div>
          <div className='text-sm text-muted-foreground'>
            Manage people and invitations from the Workspaces area. Academic-year and homeroom
            coverage can be connected once those live records are assigned.
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-start gap-2 p-6'>
            <div className='font-medium'>No staff records found in the active workspace.</div>
            <div className='text-sm text-muted-foreground'>
              Invite teachers or staff from Workspaces to populate this directory with real data.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className='flex flex-1 flex-col'>
          <CardContent className='flex flex-1 flex-col p-4'>
            <DataTable table={table}>
              <DataTableToolbar table={table}>
                <div className='hidden text-xs text-muted-foreground xl:block'>
                  {hasFilters
                    ? 'Filters applied. Reset any filter to widen the real staff directory.'
                    : 'This table is sourced from active workspace memberships and pending invitations.'}
                </div>
                {canLoadMore ? (
                  <Button type='button' variant='outline' size='sm' onClick={() => void loadMore()}>
                    Load more
                  </Button>
                ) : null}
              </DataTableToolbar>
            </DataTable>
            {filteredRows.length === 0 ? (
              <div className='mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed p-3 text-sm text-muted-foreground'>
                <span>No staff records match the current directory filters.</span>
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
    </div>
  );
}
