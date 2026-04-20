'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable
} from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useIsMobile } from '@/hooks/use-mobile';

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function billingVariant(status: 'Current' | 'Overdue' | 'Scholarship' | 'Custom') {
  if (status === 'Overdue') return 'destructive' as const;
  if (status === 'Scholarship') return 'secondary' as const;
  return 'outline' as const;
}

export interface CollectionsGridRow {
  profileId: string;
  studentId: string;
  studentName: string;
  className: string;
  academicYear: string;
  billingStatus: 'Current' | 'Overdue' | 'Scholarship' | 'Custom';
  familyLabel: string;
  familyPrimaryGuardianName: string;
  familyPrimaryGuardianPhone: string;
  collectionStage:
    | 'No follow-up'
    | 'Reminder queued'
    | 'In contact'
    | 'Promise to pay'
    | 'Escalated';
  reminderChannel: 'Email' | 'WhatsApp' | 'Phone' | 'In person' | 'Not set';
  nextActionDate: string;
  totalOutstanding: number;
  effectiveMonthlyFee: number;
  recentReminderDate: string;
  recentReminderOutcome: string;
  reminderCount: number;
  paymentPlan: string;
  recentPaymentDate: string;
  recentPaymentAmount: number;
}

export function FinanceCollectionsGrid({ rows }: { rows: CollectionsGridRow[] }) {
  const isMobile = useIsMobile();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'totalOutstanding', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 12 });
  const [selectedRow, setSelectedRow] = useState<CollectionsGridRow | null>(null);

  const columns = useMemo<ColumnDef<CollectionsGridRow>[]>(
    () => [
      {
        id: 'studentName',
        accessorFn: (row) => [row.studentName, row.className, row.familyLabel].join(' '),
        header: ({ column }) => <DataTableColumnHeader column={column} title='Student' />,
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
          placeholder: 'Search students, classes, families...',
          variant: 'text' as const
        },
        enableColumnFilter: true
      },
      {
        id: 'familyLabel',
        accessorKey: 'familyLabel',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Family' />,
        cell: ({ row }) => (
          <div className='flex min-w-[200px] flex-col'>
            <span>{row.original.familyLabel || 'No family account'}</span>
            <span className='text-muted-foreground text-xs'>
              {row.original.familyPrimaryGuardianName || 'No guardian set'}
            </span>
          </div>
        ),
        meta: {
          label: 'Family',
          placeholder: 'Search family or guardian...',
          variant: 'text' as const
        },
        enableColumnFilter: true
      },
      {
        id: 'collectionStage',
        accessorKey: 'collectionStage',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Collections' />,
        cell: ({ row }) => (
          <div className='flex min-w-[180px] flex-col gap-1'>
            <Badge
              variant={row.original.collectionStage === 'Escalated' ? 'destructive' : 'outline'}
            >
              {row.original.collectionStage}
            </Badge>
            <span className='text-muted-foreground text-xs'>{row.original.reminderChannel}</span>
          </div>
        )
      },
      {
        id: 'nextActionDate',
        accessorKey: 'nextActionDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Next action' />,
        cell: ({ row }) => <span>{row.original.nextActionDate || 'Not scheduled'}</span>
      },
      {
        id: 'recentReminderDate',
        accessorKey: 'recentReminderDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Latest touch' />,
        cell: ({ row }) => (
          <div className='flex min-w-[220px] flex-col'>
            <span>{row.original.recentReminderDate || 'No reminder logged'}</span>
            <span className='text-muted-foreground line-clamp-2 text-xs'>
              {row.original.recentReminderOutcome || 'No reminder history logged yet'}
            </span>
          </div>
        )
      },
      {
        id: 'totalOutstanding',
        accessorKey: 'totalOutstanding',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Outstanding' />,
        cell: ({ row }) => (
          <span className='font-medium tabular-nums'>
            {currency(row.original.totalOutstanding)}
          </span>
        )
      },
      {
        id: 'recentPaymentAmount',
        accessorKey: 'recentPaymentAmount',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Last payment' />,
        cell: ({ row }) => (
          <div className='flex min-w-[160px] flex-col'>
            <span className='font-medium tabular-nums'>
              {row.original.recentPaymentAmount ? currency(row.original.recentPaymentAmount) : '—'}
            </span>
            <span className='text-muted-foreground text-xs'>
              {row.original.recentPaymentDate || 'No payment recorded'}
            </span>
          </div>
        )
      }
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  const detail = selectedRow ? (
    <div className='grid gap-4 px-1'>
      <div className='rounded-xl border border-border/60 p-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='font-medium'>{selectedRow.studentName}</div>
          <Badge variant='outline'>{selectedRow.className}</Badge>
          <Badge variant={billingVariant(selectedRow.billingStatus)}>
            {selectedRow.billingStatus}
          </Badge>
        </div>
        <div className='mt-2 text-sm text-muted-foreground'>
          {selectedRow.familyLabel || 'No family account'}
          {selectedRow.familyPrimaryGuardianName
            ? ` • ${selectedRow.familyPrimaryGuardianName}`
            : ''}
          {selectedRow.familyPrimaryGuardianPhone
            ? ` • ${selectedRow.familyPrimaryGuardianPhone}`
            : ''}
        </div>
      </div>
      <div className='grid gap-3 sm:grid-cols-2'>
        <CollectionPill label='Outstanding' value={currency(selectedRow.totalOutstanding)} />
        <CollectionPill label='Monthly total' value={currency(selectedRow.effectiveMonthlyFee)} />
        <CollectionPill label='Collections stage' value={selectedRow.collectionStage} />
        <CollectionPill label='Next action' value={selectedRow.nextActionDate || 'Not scheduled'} />
      </div>
      <div className='rounded-xl border border-border/60 p-4'>
        <div className='text-sm font-medium'>Latest reminder</div>
        <div className='mt-2 text-sm text-muted-foreground'>
          {selectedRow.recentReminderDate || 'No reminder logged'}
          {selectedRow.recentReminderDate ? ` via ${selectedRow.reminderChannel}` : ''}
        </div>
        <div className='mt-2 text-sm text-muted-foreground'>
          {selectedRow.recentReminderOutcome || 'No collections note captured yet.'}
        </div>
      </div>
      <div className='rounded-xl border border-border/60 p-4'>
        <div className='text-sm font-medium'>Current account posture</div>
        <div className='mt-2 grid gap-2 text-sm text-muted-foreground'>
          <div>Payment plan: {selectedRow.paymentPlan || 'No payment plan set'}</div>
          <div>Reminder touches logged: {selectedRow.reminderCount}</div>
          <div>
            Last payment: {selectedRow.recentPaymentDate || 'Not recorded'}
            {selectedRow.recentPaymentAmount
              ? ` • ${currency(selectedRow.recentPaymentAmount)}`
              : ''}
          </div>
        </div>
      </div>
      <div className='flex gap-2'>
        <Button asChild className='w-full'>
          <Link href={`/dashboard/billing/${selectedRow.studentId}`}>
            Open full student finance
          </Link>
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <DataTable
        table={table}
        onRowClick={(row) => setSelectedRow(row.original)}
        rowClassName='group'
      >
        <DataTableToolbar table={table} />
      </DataTable>
      {isMobile ? (
        <Drawer
          open={Boolean(selectedRow)}
          onOpenChange={(open) => {
            if (!open) setSelectedRow(null);
          }}
        >
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Collections detail</DrawerTitle>
              <DrawerDescription>
                Open the selected collections record without leaving the grid.
              </DrawerDescription>
            </DrawerHeader>
            <div className='max-h-[78vh] overflow-y-auto px-4 pb-4'>{detail}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet
          open={Boolean(selectedRow)}
          onOpenChange={(open) => {
            if (!open) setSelectedRow(null);
          }}
        >
          <SheetContent className='sm:max-w-xl'>
            <SheetHeader>
              <SheetTitle>Collections detail</SheetTitle>
              <SheetDescription>
                Open the selected collections record without leaving the grid.
              </SheetDescription>
            </SheetHeader>
            <div className='mt-6 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1'>{detail}</div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

function CollectionPill({ label, value }: { label: string; value: string }) {
  return (
    <Card className='overflow-hidden border-border/60'>
      <CardHeader className='pb-2'>
        <CardDescription>{label}</CardDescription>
        <CardTitle className='text-base'>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
