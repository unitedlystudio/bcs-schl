'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { Option } from '@/types/data-table';
import type { Column, ColumnDef, FilterFn } from '@tanstack/react-table';

export interface StudentGridRow {
  id: string;
  preferredName: string;
  fullName: string;
  academicYear: string;
  className: string;
  status: 'Active' | 'Pending' | 'Archived';
  guardianName: string;
  guardianPhone: string;
  nisn: string;
  medicalFlag?: string;
  homeroomTeacher: string;
  teacherRole: string;
}

const matchesSelectedValues: FilterFn<StudentGridRow> = (row, columnId, filterValue) => {
  if (!Array.isArray(filterValue) || filterValue.length === 0) {
    return true;
  }

  return filterValue.includes(row.getValue(columnId));
};

interface GetStudentGridColumnsOptions {
  academicYearOptions: Option[];
  classOptions: Option[];
  homeroomOptions: Option[];
  statusOptions: Option[];
}

export function getStudentGridColumns({
  academicYearOptions,
  classOptions,
  homeroomOptions,
  statusOptions
}: GetStudentGridColumnsOptions): ColumnDef<StudentGridRow>[] {
  return [
    {
      id: 'student',
      accessorFn: (row) => [row.preferredName, row.fullName, row.nisn].filter(Boolean).join(' '),
      header: ({ column }: { column: Column<StudentGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Student' />
      ),
      cell: ({ row }) => (
        <div className='flex min-w-[220px] flex-col'>
          <span className='font-medium'>{row.original.preferredName || row.original.fullName}</span>
          <span className='text-muted-foreground text-xs'>{row.original.fullName}</span>
        </div>
      ),
      meta: {
        label: 'Student',
        placeholder: 'Search students, guardians, NISN...',
        variant: 'text' as const
      },
      enableColumnFilter: true
    },
    {
      id: 'academicYear',
      accessorKey: 'academicYear',
      header: ({ column }: { column: Column<StudentGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Academic year' />
      ),
      cell: ({ cell }) => (
        <Badge variant='outline'>{cell.getValue<string>() || 'Unassigned'}</Badge>
      ),
      meta: {
        label: 'Academic year',
        variant: 'multiSelect' as const,
        options: academicYearOptions
      },
      enableColumnFilter: true,
      filterFn: matchesSelectedValues
    },
    {
      id: 'className',
      accessorKey: 'className',
      header: ({ column }: { column: Column<StudentGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Class' />
      ),
      cell: ({ cell }) => <Badge variant='secondary'>{cell.getValue<string>()}</Badge>,
      meta: {
        label: 'Class',
        variant: 'multiSelect' as const,
        options: classOptions
      },
      enableColumnFilter: true,
      filterFn: matchesSelectedValues
    },
    {
      id: 'homeroomTeacher',
      accessorKey: 'homeroomTeacher',
      header: ({ column }: { column: Column<StudentGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Homeroom' />
      ),
      cell: ({ row }) => (
        <div className='flex min-w-[180px] flex-col'>
          <span>{row.original.homeroomTeacher}</span>
          <span className='text-muted-foreground text-xs'>
            {row.original.teacherRole || 'No teacher linked yet'}
          </span>
        </div>
      ),
      meta: {
        label: 'Homeroom',
        variant: 'multiSelect' as const,
        options: homeroomOptions
      },
      enableColumnFilter: true,
      enableSorting: false,
      filterFn: matchesSelectedValues
    },
    {
      id: 'guardian',
      accessorFn: (row) => [row.guardianName, row.guardianPhone].filter(Boolean).join(' '),
      header: ({ column }: { column: Column<StudentGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Guardian' />
      ),
      cell: ({ row }) => (
        <div className='flex min-w-[180px] flex-col'>
          <span>{row.original.guardianName || 'Not added'}</span>
          <span className='text-muted-foreground text-xs'>{row.original.guardianPhone || '—'}</span>
        </div>
      ),
      meta: {
        label: 'Guardian',
        placeholder: 'Search guardians...',
        variant: 'text' as const
      },
      enableColumnFilter: true
    },
    {
      id: 'nisn',
      accessorKey: 'nisn',
      header: ({ column }: { column: Column<StudentGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='NISN' />
      ),
      cell: ({ cell }) =>
        cell.getValue<string>() || <span className='text-muted-foreground'>—</span>
    },
    {
      id: 'medicalFlag',
      accessorKey: 'medicalFlag',
      header: ({ column }: { column: Column<StudentGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Medical' />
      ),
      cell: ({ cell }) => {
        const value = cell.getValue<string>();
        return value ? (
          <Badge variant='outline'>{value}</Badge>
        ) : (
          <span className='text-muted-foreground'>—</span>
        );
      },
      enableSorting: false
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }: { column: Column<StudentGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      cell: ({ cell }) => {
        const status = cell.getValue<StudentGridRow['status']>();
        const variant =
          status === 'Active' ? 'default' : status === 'Pending' ? 'secondary' : 'outline';
        return <Badge variant={variant}>{status}</Badge>;
      },
      meta: {
        label: 'Status',
        variant: 'multiSelect' as const,
        options: statusOptions
      },
      enableColumnFilter: true,
      filterFn: matchesSelectedValues
    }
  ];
}
