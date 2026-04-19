'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import {
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';

import { api } from '../../../../convex/_generated/api';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { AddStudentSheetTrigger } from './add-student-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Option } from '@/types/data-table';
import { getStudentGridColumns, type StudentGridRow } from './student-grid-columns';

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

export default function StudentDirectory() {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'student', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    medicalFlag: false
  });
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10
  });

  const studentsQuery = useQuery(api.students.list, {});
  const teachersQuery = useQuery(api.teachers.list, {});

  const teachers = useMemo(() => teachersQuery ?? [], [teachersQuery]);

  const teacherOwnership = useMemo(() => {
    const ownerMap = new Map<string, (typeof teachers)[number]>();

    for (const teacher of teachers) {
      if (!teacher.homeroomClass) continue;

      const yearKey = teacher.academicYear || 'Unassigned';
      ownerMap.set(`${yearKey}::${teacher.homeroomClass}`, teacher);
      ownerMap.set(`all::${teacher.homeroomClass}`, teacher);
    }

    return ownerMap;
  }, [teachers]);

  const rows = useMemo<StudentGridRow[]>(() => {
    const students = studentsQuery ?? [];

    return students.map((student) => {
      const yearKey = student.academicYear || 'Unassigned';
      const owner =
        teacherOwnership.get(`${yearKey}::${student.className}`) ||
        teacherOwnership.get(`all::${student.className}`);

      return {
        id: student.id,
        preferredName: student.preferredName,
        fullName: student.fullName,
        academicYear: student.academicYear || 'Unassigned',
        className: student.className,
        status: student.status,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        nisn: student.nisn,
        medicalFlag: student.medicalFlag,
        homeroomTeacher: owner?.preferredName || owner?.fullName || 'Unassigned',
        teacherRole: owner?.role || ''
      };
    });
  }, [studentsQuery, teacherOwnership]);

  const academicYearOptions = useMemo(() => {
    const counts = new Map<string, number>();

    for (const row of rows) {
      counts.set(row.academicYear, (counts.get(row.academicYear) ?? 0) + 1);
    }

    return buildOptions(
      Array.from(counts.entries()).map(([value, count]) => ({ label: value, value, count }))
    );
  }, [rows]);

  const classOptions = useMemo(() => {
    const counts = new Map<string, number>();

    for (const row of rows) {
      counts.set(row.className, (counts.get(row.className) ?? 0) + 1);
    }

    return buildOptions(
      Array.from(counts.entries()).map(([value, count]) => ({ label: value, value, count }))
    );
  }, [rows]);

  const homeroomOptions = useMemo(() => {
    const counts = new Map<string, number>();

    for (const row of rows) {
      counts.set(row.homeroomTeacher, (counts.get(row.homeroomTeacher) ?? 0) + 1);
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
          label: 'Pending',
          value: 'Pending',
          count: rows.filter((row) => row.status === 'Pending').length
        },
        {
          label: 'Archived',
          value: 'Archived',
          count: rows.filter((row) => row.status === 'Archived').length
        }
      ]),
    [rows]
  );

  const columns = useMemo(
    () =>
      getStudentGridColumns({
        academicYearOptions,
        classOptions,
        homeroomOptions,
        statusOptions
      }),
    [academicYearOptions, classOptions, homeroomOptions, statusOptions]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: (updaterOrValue) => {
      setColumnFilters((previous) => {
        const next =
          typeof updaterOrValue === 'function' ? updaterOrValue(previous) : updaterOrValue;
        setPagination((current) => ({ ...current, pageIndex: 0 }));
        return next;
      });
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues()
  });

  const filteredRows = table.getFilteredRowModel().rows;
  const visibleStudentCount = filteredRows.length;
  const visibleAcademicYears = new Set(filteredRows.map((row) => row.original.academicYear)).size;
  const visibleClassGroups = new Set(
    filteredRows.map((row) => `${row.original.academicYear}::${row.original.className}`)
  ).size;
  const visibleHomerooms = new Set(
    filteredRows
      .map((row) => row.original.homeroomTeacher)
      .filter((teacherName) => teacherName && teacherName !== 'Unassigned')
  ).size;
  const hasFilters = columnFilters.length > 0;
  const activeTeachers = teachers.filter((teacher) => teacher.status === 'Active').length;

  if (studentsQuery === undefined || teachersQuery === undefined) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Loading student directory...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className='flex flex-col items-start gap-4 p-6'>
          <div>
            <div className='font-medium'>No students in Schly yet.</div>
            <div className='mt-1 text-sm text-muted-foreground'>
              Add the first student record so profiles, attendance, and admissions handoff can use
              live data.
            </div>
          </div>
          <AddStudentSheetTrigger />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>Student directory</CardTitle>
          <CardDescription>
            Using the access-style data grid for faster filtering, while keeping student profiles as
            the richer detail layer.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          <div className='flex flex-wrap gap-2 text-sm text-muted-foreground'>
            <Badge variant='secondary'>{visibleStudentCount} students in view</Badge>
            <Badge variant='outline'>{visibleAcademicYears} academic years</Badge>
            <Badge variant='outline'>{visibleClassGroups} class groups</Badge>
            <Badge variant='outline'>{visibleHomerooms} linked homerooms</Badge>
            <Badge variant='outline'>{activeTeachers} active teachers</Badge>
          </div>
          <div className='text-sm text-muted-foreground'>
            Filter by year, class, homeroom, and status like /dashboard/access, then click any
            student row to open the profile.
          </div>
        </CardContent>
      </Card>

      <Card className='flex flex-1 flex-col'>
        <CardContent className='flex flex-1 flex-col p-4'>
          <DataTable
            table={table}
            onRowClick={(row) => router.push(`/dashboard/students/${row.original.id}`)}
            rowClassName='group'
          >
            <DataTableToolbar table={table}>
              <div className='hidden text-xs text-muted-foreground xl:block'>
                {hasFilters
                  ? 'Filters applied. Reset any filter to broaden the directory.'
                  : 'Click any row to open a student profile.'}
              </div>
            </DataTableToolbar>
          </DataTable>
          {visibleStudentCount === 0 ? (
            <div className='mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed p-3 text-sm text-muted-foreground'>
              <span>No students match the current data-grid filters.</span>
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
    </div>
  );
}
