'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { Option } from '@/types/data-table';
import type { Column, ColumnDef, FilterFn } from '@tanstack/react-table';

export interface FinanceGridRow {
  profileId: string;
  studentId: string;
  studentName: string;
  className: string;
  academicYear: string;
  billingStatus: 'Current' | 'Overdue' | 'Scholarship' | 'Custom';
  tuitionMonthlyFee: number;
  billedAddOnCount: number;
  billedAddOnMonthlyTotal: number;
  billingItemsSummary: string;
  effectiveMonthlyFee: number;
  totalOutstanding: number;
  recentPaymentAmount: number;
  recentPaymentDate: string;
  paymentPlan: string;
}

const matchesSelectedValues: FilterFn<FinanceGridRow> = (row, columnId, filterValue) => {
  if (!Array.isArray(filterValue) || filterValue.length === 0) {
    return true;
  }

  return filterValue.includes(row.getValue(columnId));
};

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function billingVariant(status: FinanceGridRow['billingStatus']) {
  if (status === 'Overdue') return 'destructive' as const;
  if (status === 'Scholarship') return 'secondary' as const;
  return 'outline' as const;
}

interface GetFinanceGridColumnsOptions {
  classOptions: Option[];
  academicYearOptions: Option[];
  billingStatusOptions: Option[];
}

export function getFinanceGridColumns({
  classOptions,
  academicYearOptions,
  billingStatusOptions
}: GetFinanceGridColumnsOptions): ColumnDef<FinanceGridRow>[] {
  return [
    {
      id: 'studentName',
      accessorFn: (row) =>
        [row.studentName, row.className, row.academicYear].filter(Boolean).join(' '),
      header: ({ column }: { column: Column<FinanceGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Student' />
      ),
      cell: ({ row }) => (
        <div className='flex min-w-[220px] flex-col'>
          <span className='font-medium'>{row.original.studentName}</span>
          <span className='text-muted-foreground text-xs'>
            {row.original.className}
            {row.original.academicYear ? ` • ${row.original.academicYear}` : ''}
          </span>
        </div>
      ),
      meta: {
        label: 'Student',
        placeholder: 'Search students, classes, years...',
        variant: 'text' as const
      },
      enableColumnFilter: true
    },
    {
      id: 'className',
      accessorKey: 'className',
      header: ({ column }: { column: Column<FinanceGridRow, unknown> }) => (
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
      id: 'academicYear',
      accessorKey: 'academicYear',
      header: ({ column }: { column: Column<FinanceGridRow, unknown> }) => (
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
      id: 'billingStatus',
      accessorKey: 'billingStatus',
      header: ({ column }: { column: Column<FinanceGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      cell: ({ cell }) => {
        const value = cell.getValue<FinanceGridRow['billingStatus']>();
        return <Badge variant={billingVariant(value)}>{value}</Badge>;
      },
      meta: {
        label: 'Status',
        variant: 'multiSelect' as const,
        options: billingStatusOptions
      },
      enableColumnFilter: true,
      filterFn: matchesSelectedValues
    },
    {
      id: 'tuitionMonthlyFee',
      accessorKey: 'tuitionMonthlyFee',
      header: ({ column }: { column: Column<FinanceGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Tuition' />
      ),
      cell: ({ cell }) => (
        <span className='font-medium tabular-nums'>{currency(cell.getValue<number>())}</span>
      )
    },
    {
      id: 'billingItemsSummary',
      accessorKey: 'billingItemsSummary',
      header: ({ column }: { column: Column<FinanceGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Plan items' />
      ),
      cell: ({ row }) => (
        <div className='flex min-w-[200px] flex-col'>
          <span>{row.original.billingItemsSummary || 'No extra plan items'}</span>
          <span className='text-muted-foreground text-xs'>
            {row.original.billedAddOnCount > 0
              ? `${row.original.billedAddOnCount} charged add-on${row.original.billedAddOnCount === 1 ? '' : 's'} • ${currency(row.original.billedAddOnMonthlyTotal)}`
              : 'No charged add-ons'}
          </span>
        </div>
      ),
      meta: {
        label: 'Plan items',
        placeholder: 'Search plan items...',
        variant: 'text' as const
      },
      enableColumnFilter: true,
      enableSorting: false
    },
    {
      id: 'effectiveMonthlyFee',
      accessorKey: 'effectiveMonthlyFee',
      header: ({ column }: { column: Column<FinanceGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Monthly total' />
      ),
      cell: ({ cell }) => (
        <span className='font-medium tabular-nums'>{currency(cell.getValue<number>())}</span>
      )
    },
    {
      id: 'totalOutstanding',
      accessorKey: 'totalOutstanding',
      header: ({ column }: { column: Column<FinanceGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Outstanding' />
      ),
      cell: ({ cell }) => (
        <span className='font-medium tabular-nums'>{currency(cell.getValue<number>())}</span>
      )
    },
    {
      id: 'recentPayment',
      accessorFn: (row) => `${row.recentPaymentAmount} ${row.recentPaymentDate}`,
      header: ({ column }: { column: Column<FinanceGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Last payment' />
      ),
      cell: ({ row }) => (
        <div className='flex min-w-[160px] flex-col'>
          <span className='font-medium tabular-nums'>
            {row.original.recentPaymentAmount
              ? currency(row.original.recentPaymentAmount)
              : 'No payment yet'}
          </span>
          <span className='text-muted-foreground text-xs'>
            {row.original.recentPaymentDate || '—'}
          </span>
        </div>
      ),
      enableSorting: false
    },
    {
      id: 'paymentPlan',
      accessorKey: 'paymentPlan',
      header: ({ column }: { column: Column<FinanceGridRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Plan' />
      ),
      cell: ({ cell }) =>
        cell.getValue<string>() || <span className='text-muted-foreground'>—</span>,
      meta: {
        label: 'Plan',
        placeholder: 'Search payment plans...',
        variant: 'text' as const
      },
      enableColumnFilter: true,
      enableSorting: false
    }
  ];
}
