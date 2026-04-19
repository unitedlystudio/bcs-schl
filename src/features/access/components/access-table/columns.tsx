'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import { ACCESS_CATEGORY_OPTIONS, ACCESS_STATUS_OPTIONS } from './options';
import type { AccessRecord } from '../../api/queries';
import type { Column, ColumnDef } from '@tanstack/react-table';

function ExternalLinkCell({ value }: { value: string }) {
  if (!value) {
    return <span className='text-muted-foreground'>—</span>;
  }

  return (
    <a
      href={value}
      target='_blank'
      rel='noreferrer'
      className='text-primary inline-flex items-center gap-1 text-sm hover:underline'
    >
      Open
      <Icons.externalLink className='h-3.5 w-3.5' />
    </a>
  );
}

export const columns: ColumnDef<AccessRecord>[] = [
  {
    id: 'platform',
    accessorKey: 'platform',
    header: ({ column }: { column: Column<AccessRecord, unknown> }) => (
      <DataTableColumnHeader column={column} title='Platform' />
    ),
    cell: ({ row }) => (
      <div className='flex flex-col'>
        <span className='font-medium'>{row.original.platform}</span>
        <span className='text-muted-foreground text-xs'>{row.original.category}</span>
      </div>
    ),
    meta: {
      label: 'Platform',
      placeholder: 'Search platforms...',
      variant: 'text' as const,
      icon: Icons.search
    },
    enableColumnFilter: true
  },
  {
    id: 'category',
    accessorKey: 'category',
    header: ({ column }: { column: Column<AccessRecord, unknown> }) => (
      <DataTableColumnHeader column={column} title='Category' />
    ),
    cell: ({ cell }) => <Badge variant='outline'>{cell.getValue<string>()}</Badge>,
    meta: {
      label: 'Category',
      variant: 'multiSelect' as const,
      options: ACCESS_CATEGORY_OPTIONS
    },
    enableColumnFilter: true,
    enableSorting: false
  },
  {
    id: 'fullName',
    accessorKey: 'fullName',
    header: ({ column }: { column: Column<AccessRecord, unknown> }) => (
      <DataTableColumnHeader column={column} title='Full Name' />
    ),
    cell: ({ cell }) =>
      cell.getValue<string>() || <span className='text-muted-foreground'>Not added</span>
  },
  {
    id: 'loginUrl',
    accessorKey: 'loginUrl',
    header: 'LOGIN URL',
    cell: ({ cell }) => <ExternalLinkCell value={cell.getValue<string>()} />
  },
  {
    id: 'username',
    accessorKey: 'username',
    header: 'USERNAME',
    cell: ({ cell }) =>
      cell.getValue<string>() || <span className='text-muted-foreground'>Not added</span>
  },
  {
    id: 'password',
    accessorKey: 'password',
    header: 'PASSWORD',
    cell: ({ cell }) =>
      cell.getValue<string>() ? (
        <span className='font-mono'>••••••••</span>
      ) : (
        <span className='text-muted-foreground'>Not added</span>
      )
  },
  {
    id: 'listingUrl',
    accessorKey: 'listingUrl',
    header: 'LISTING URL',
    cell: ({ cell }) => <ExternalLinkCell value={cell.getValue<string>()} />
  },
  {
    id: 'adminsAccess',
    accessorKey: 'adminsAccess',
    header: 'ADMINS / ACCESS',
    cell: ({ cell }) =>
      cell.getValue<string>() || <span className='text-muted-foreground'>Not assigned</span>
  },
  {
    id: 'recoveryNumber',
    accessorKey: 'recoveryNumber',
    header: 'RECOVERY NUMBER',
    cell: ({ cell }) =>
      cell.getValue<string>() || <span className='text-muted-foreground'>Not added</span>
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }: { column: Column<AccessRecord, unknown> }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ cell }) => {
      const status = cell.getValue<AccessRecord['status']>();
      const variant =
        status === 'Ready' ? 'default' : status === 'Partial' ? 'secondary' : 'outline';
      return <Badge variant={variant}>{status}</Badge>;
    },
    meta: {
      label: 'Status',
      variant: 'multiSelect' as const,
      options: ACCESS_STATUS_OPTIONS
    },
    enableColumnFilter: true,
    enableSorting: false
  }
];
