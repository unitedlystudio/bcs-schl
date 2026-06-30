'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { Option } from '@/types/data-table';
import type { Column, ColumnDef, FilterFn } from '@tanstack/react-table';

export interface TeacherGridRow {
  id: string;
  fullName: string;
  preferredName: string;
  role: string;
  status: string;
  academicYear: string;
  homeroomClass: string;
  email: string;
  phone: string;
}

const matchesSelectedValues: FilterFn<TeacherGridRow> = (row, columnId, filterValue) => {
  if (!Array.isArray(filterValue) || filterValue.length === 0) {
    return true;
  }

  return filterValue.includes(row.getValue(columnId));
};

export function getTeacherGridColumns({
  roleOptions,
  academicYearOptions,
  homeroomOptions,
  statusOptions
}: {
  roleOptions: Option[];
  academicYearOptions: Option[];
  homeroomOptions: Option[];
  statusOptions: Option[];
}): ColumnDef<TeacherGridRow>[] {
  return [
    {
      id: 'teacher',
      accessorFn: (row) =>
        [row.fullName, row.preferredName, row.email, row.phone].filter(Boolean).join(' '),
      header: ({ column }: { column: Column<TeacherGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Teacher' />
      ),
      cell: ({ row }) => (
        <div className='flex min-w-[220px] flex-col'>
          <span className='font-medium'>{row.original.fullName}</span>
          <span className='text-muted-foreground text-xs'>
            {row.original.preferredName
              ? `Prefers ${row.original.preferredName}`
              : 'No preferred name'}
          </span>
        </div>
      ),
      meta: {
        label: 'Teacher',
        placeholder: 'Search teachers, email, phone...',
        variant: 'text' as const
      },
      enableColumnFilter: true
    },
    {
      id: 'role',
      accessorKey: 'role',
      header: ({ column }: { column: Column<TeacherGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Role' />
      ),
      cell: ({ cell }) => <Badge variant='secondary'>{cell.getValue<string>()}</Badge>,
      meta: {
        label: 'Role',
        variant: 'multiSelect' as const,
        options: roleOptions
      },
      enableColumnFilter: true,
      enableSorting: false,
      filterFn: matchesSelectedValues
    },
    {
      id: 'academicYear',
      accessorKey: 'academicYear',
      header: ({ column }: { column: Column<TeacherGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Academic year' />
      ),
      cell: ({ cell }) => {
        const value = cell.getValue<string>();
        return value ? (
          <Badge variant='outline'>{value}</Badge>
        ) : (
          <span className='text-muted-foreground'>—</span>
        );
      },
      meta: {
        label: 'Academic year',
        variant: 'multiSelect' as const,
        options: academicYearOptions
      },
      enableColumnFilter: true,
      filterFn: matchesSelectedValues
    },
    {
      id: 'homeroomClass',
      accessorKey: 'homeroomClass',
      header: ({ column }: { column: Column<TeacherGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Homeroom' />
      ),
      cell: ({ cell }) => {
        const value = cell.getValue<string>();
        return value ? (
          <Badge variant='outline'>{value}</Badge>
        ) : (
          <span className='text-muted-foreground'>Unassigned</span>
        );
      },
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
      id: 'email',
      accessorKey: 'email',
      header: ({ column }: { column: Column<TeacherGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Email' />
      ),
      cell: ({ cell }) =>
        cell.getValue<string>() || <span className='text-muted-foreground'>Not added</span>
    },
    {
      id: 'phone',
      accessorKey: 'phone',
      header: ({ column }: { column: Column<TeacherGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Phone' />
      ),
      cell: ({ cell }) =>
        cell.getValue<string>() || <span className='text-muted-foreground'>Not added</span>
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }: { column: Column<TeacherGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      cell: ({ cell }) => {
        const status = cell.getValue<TeacherGridRow['status']>();
        return <Badge variant={status === 'Active' ? 'default' : 'outline'}>{status}</Badge>;
      },
      meta: {
        label: 'Status',
        variant: 'multiSelect' as const,
        options: statusOptions
      },
      enableColumnFilter: true,
      enableSorting: false,
      filterFn: matchesSelectedValues
    }
  ];
}
