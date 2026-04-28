'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
  type FilterFn
} from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { Option } from '@/types/data-table';

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

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

function billingVariant(status: 'Current' | 'Overdue' | 'Scholarship' | 'Custom') {
  if (status === 'Overdue') return 'destructive' as const;
  if (status === 'Scholarship') return 'secondary' as const;
  return 'outline' as const;
}

function collectionVariant(
  status: 'No follow-up' | 'Reminder queued' | 'In contact' | 'Promise to pay' | 'Escalated'
) {
  if (status === 'Escalated') return 'destructive' as const;
  if (status === 'Promise to pay') return 'default' as const;
  if (status === 'In contact' || status === 'Reminder queued') return 'secondary' as const;
  return 'outline' as const;
}

const matchesSelectedValues: FilterFn<FamilyAccountsGridRow> = (row, columnId, filterValue) => {
  if (!Array.isArray(filterValue) || filterValue.length === 0) {
    return true;
  }

  return filterValue.includes(row.getValue(columnId));
};

export interface FamilyAccountsGridRow {
  id: string;
  accountLabel: string;
  studentCount: number;
  collectionStage:
    | 'No follow-up'
    | 'Reminder queued'
    | 'In contact'
    | 'Promise to pay'
    | 'Escalated';
  primaryGuardianName: string;
  primaryGuardianPhone: string;
  monthlyRunRate: number;
  totalOutstanding: number;
  nextActionDate: string;
  members: Array<{
    profileId: string;
    studentId: string;
    studentName: string;
    className: string;
    academicYear: string;
    billingStatus: 'Current' | 'Overdue' | 'Scholarship' | 'Custom';
    totalOutstanding: number;
    effectiveMonthlyFee: number;
    nextActionDate: string;
  }>;
}

export function FinanceFamilyAccountsGrid({
  familyAccounts,
  hasFinanceWriteAccess,
  onAllocate
}: {
  familyAccounts: FamilyAccountsGridRow[];
  hasFinanceWriteAccess: boolean;
  onAllocate: (familyAccountId: string) => void;
}) {
  const isMobile = useIsMobile();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'totalOutstanding', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 8 });
  const [selectedRow, setSelectedRow] = useState<FamilyAccountsGridRow | null>(null);

  const collectionStageOptions = useMemo(
    () =>
      buildOptions(
        ['No follow-up', 'Reminder queued', 'In contact', 'Promise to pay', 'Escalated'].map(
          (value) => ({
            label: value,
            value,
            count: familyAccounts.filter((account) => account.collectionStage === value).length
          })
        )
      ),
    [familyAccounts]
  );

  const columns = useMemo<ColumnDef<FamilyAccountsGridRow>[]>(
    () => [
      {
        id: 'accountLabel',
        accessorFn: (row) =>
          [
            row.accountLabel,
            row.primaryGuardianName,
            row.primaryGuardianPhone,
            ...row.members.map((member) => member.studentName)
          ]
            .filter(Boolean)
            .join(' '),
        header: ({ column }) => <DataTableColumnHeader column={column} title='Family account' />,
        cell: ({ row }) => (
          <div className='flex min-w-[260px] flex-col'>
            <span className='font-medium'>{row.original.accountLabel}</span>
            <span className='text-xs text-muted-foreground'>
              {row.original.primaryGuardianName || 'No guardian set'}
              {row.original.primaryGuardianPhone ? ` • ${row.original.primaryGuardianPhone}` : ''}
            </span>
          </div>
        ),
        meta: {
          label: 'Family account',
          placeholder: 'Search family, guardian, or student...',
          variant: 'text' as const
        },
        enableColumnFilter: true
      },
      {
        id: 'studentCount',
        accessorKey: 'studentCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Students' />,
        cell: ({ row }) => <Badge variant='outline'>{row.original.studentCount} linked</Badge>
      },
      {
        id: 'memberNames',
        accessorFn: (row) => row.members.map((member) => member.studentName).join(', '),
        header: ({ column }) => <DataTableColumnHeader column={column} title='Students' />,
        cell: ({ row }) => (
          <div className='flex min-w-[260px] flex-col gap-1'>
            <span className='font-medium'>
              {row.original.members.map((member) => member.studentName).join(', ')}
            </span>
            <span className='text-xs text-muted-foreground'>
              {row.original.members
                .map((member) =>
                  [member.className, member.academicYear].filter(Boolean).join(' • ')
                )
                .join(' · ')}
            </span>
          </div>
        ),
        enableSorting: false
      },
      {
        id: 'collectionStage',
        accessorKey: 'collectionStage',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Collections' />,
        cell: ({ row }) => (
          <Badge variant={collectionVariant(row.original.collectionStage)}>
            {row.original.collectionStage}
          </Badge>
        ),
        meta: {
          label: 'Collections',
          variant: 'multiSelect' as const,
          options: collectionStageOptions
        },
        enableColumnFilter: true,
        filterFn: matchesSelectedValues
      },
      {
        id: 'nextActionDate',
        accessorKey: 'nextActionDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Next action' />,
        cell: ({ row }) => row.original.nextActionDate || 'Not scheduled'
      },
      {
        id: 'monthlyRunRate',
        accessorKey: 'monthlyRunRate',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Monthly total' />,
        cell: ({ row }) => (
          <span className='font-medium tabular-nums'>{currency(row.original.monthlyRunRate)}</span>
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
      }
    ],
    [collectionStageOptions]
  );

  const table = useReactTable({
    data: familyAccounts,
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

  useEffect(() => {
    setPagination(() => ({ pageIndex: 0, pageSize: isMobile ? 6 : 8 }));
  }, [isMobile]);

  const detail = selectedRow ? (
    <div className='grid min-w-0 gap-4 px-1'>
      <div className='rounded-xl border border-border/60 p-4'>
        <div className='flex min-w-0 flex-wrap items-center gap-2'>
          <div className='font-medium'>{selectedRow.accountLabel}</div>
          <Badge variant='outline'>{selectedRow.studentCount} students</Badge>
          <Badge variant={collectionVariant(selectedRow.collectionStage)}>
            {selectedRow.collectionStage}
          </Badge>
        </div>
        <div className='mt-2 text-sm text-muted-foreground'>
          {selectedRow.primaryGuardianName || 'No guardian set'}
          {selectedRow.primaryGuardianPhone ? ` • ${selectedRow.primaryGuardianPhone}` : ''}
        </div>
      </div>
      <div className='grid gap-3 sm:grid-cols-2'>
        <FamilyMetric label='Monthly total' value={currency(selectedRow.monthlyRunRate)} />
        <FamilyMetric label='Outstanding' value={currency(selectedRow.totalOutstanding)} />
        <FamilyMetric label='Next action' value={selectedRow.nextActionDate || 'Not scheduled'} />
        <FamilyMetric label='Students linked' value={`${selectedRow.studentCount}`} />
      </div>
      <div className='rounded-xl border border-border/60 p-4'>
        <div className='text-sm font-medium text-foreground'>Linked student accounts</div>
        <div className='mt-3 grid gap-2'>
          {selectedRow.members.map((member) => (
            <div
              key={member.profileId}
              className='rounded-lg border border-border/50 bg-muted/15 px-3 py-3'
            >
              <div className='flex min-w-0 flex-wrap items-center gap-2'>
                <span className='font-medium'>{member.studentName}</span>
                <Badge variant='outline'>{member.className}</Badge>
                {member.academicYear ? (
                  <Badge variant='outline'>{member.academicYear}</Badge>
                ) : null}
                <Badge variant={billingVariant(member.billingStatus)}>{member.billingStatus}</Badge>
              </div>
              <div className='mt-2 grid gap-1 text-sm text-muted-foreground'>
                <div>Outstanding {currency(member.totalOutstanding)}</div>
                <div>Monthly total {currency(member.effectiveMonthlyFee)}</div>
                <div>Next action {member.nextActionDate || 'Not scheduled'}</div>
              </div>
              <div className='mt-3'>
                <Button asChild variant='outline' size='sm' className='w-full sm:w-auto'>
                  <Link href={`/dashboard/billing/${member.studentId}`}>Open student finance</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {hasFinanceWriteAccess ? (
        <Button
          className='w-full'
          onClick={() => {
            setSelectedRow(null);
            onAllocate(selectedRow.id);
          }}
        >
          Allocate family payment
        </Button>
      ) : null}
    </div>
  ) : null;

  if (isMobile) {
    const visibleRows = table.getRowModel().rows;
    const totalFilteredRows = table.getFilteredRowModel().rows.length;

    return (
      <>
        <div className='grid gap-3'>
          <DataTableToolbar table={table} />
          <div className='text-xs text-muted-foreground'>
            Showing {visibleRows.length} of {totalFilteredRows} family accounts on this page.
          </div>
          {visibleRows.length === 0 ? (
            <Card className='border-dashed border-border/60'>
              <CardContent className='grid gap-2 p-5 text-sm text-muted-foreground'>
                <div className='font-medium text-foreground'>
                  {familyAccounts.length === 0
                    ? 'No linked family accounts yet'
                    : 'No matching family accounts'}
                </div>
                <div>
                  {familyAccounts.length === 0
                    ? 'As soon as billing profiles share a family label, those students will appear here as one household account.'
                    : 'Adjust the filters above to widen the family account view.'}
                </div>
              </CardContent>
            </Card>
          ) : (
            visibleRows.map((row) => (
              <button
                key={row.original.id}
                type='button'
                className='text-left'
                onClick={() => setSelectedRow(row.original)}
              >
                <Card className='border-border/60 transition-colors hover:border-primary/40'>
                  <CardContent className='grid gap-4 p-4'>
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <div className='font-medium'>{row.original.accountLabel}</div>
                        <div className='text-sm text-muted-foreground'>
                          {row.original.primaryGuardianName || 'No guardian set'}
                          {row.original.primaryGuardianPhone
                            ? ` • ${row.original.primaryGuardianPhone}`
                            : ''}
                        </div>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        <Badge variant='outline'>{row.original.studentCount} linked</Badge>
                        <Badge variant={collectionVariant(row.original.collectionStage)}>
                          {row.original.collectionStage}
                        </Badge>
                      </div>
                    </div>
                    <div className='grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-3 sm:grid-cols-2'>
                      <MobileMetric
                        label='Monthly total'
                        value={currency(row.original.monthlyRunRate)}
                      />
                      <MobileMetric
                        label='Outstanding'
                        value={currency(row.original.totalOutstanding)}
                      />
                      <MobileMetric
                        label='Next action'
                        value={row.original.nextActionDate || 'Not scheduled'}
                      />
                      <MobileMetric
                        label='Students'
                        value={row.original.members.map((member) => member.studentName).join(', ')}
                      />
                    </div>
                    <div className='text-sm font-medium text-foreground'>
                      Open family account detail
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))
          )}
          <div className='flex items-center justify-between gap-3'>
            <div className='text-xs text-muted-foreground'>
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </div>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                Previous
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
        <Drawer
          open={Boolean(selectedRow)}
          onOpenChange={(open) => {
            if (!open) setSelectedRow(null);
          }}
        >
          <DrawerContent className='w-full max-w-full overflow-x-hidden'>
            <DrawerHeader>
              <DrawerTitle>Family account detail</DrawerTitle>
              <DrawerDescription>
                Review the household account and jump into each linked student ledger.
              </DrawerDescription>
            </DrawerHeader>
            <div className='max-h-[70vh] min-w-0 overflow-x-hidden overflow-y-auto px-4 pb-4'>
              {detail}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      <DataTable
        table={table}
        onRowClick={(row) => setSelectedRow(row.original)}
        rowClassName='group'
      >
        <DataTableToolbar table={table} />
      </DataTable>
      <Sheet
        open={Boolean(selectedRow)}
        onOpenChange={(open) => {
          if (!open) setSelectedRow(null);
        }}
      >
        <SheetContent className='w-full max-w-full overflow-x-hidden sm:max-w-2xl'>
          <SheetHeader>
            <SheetTitle>Family account detail</SheetTitle>
            <SheetDescription>
              Review the household account and jump into each linked student ledger.
            </SheetDescription>
          </SheetHeader>
          <div className='mt-6 grid min-w-0 gap-4 overflow-x-hidden pr-1'>{detail}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function FamilyMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card className='overflow-hidden border-border/60'>
      <CardHeader className='pb-2'>
        <CardDescription>{label}</CardDescription>
        <CardTitle className='text-base break-words'>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className='grid gap-1'>
      <div className='text-xs uppercase tracking-[0.12em] text-muted-foreground'>{label}</div>
      <div className='text-sm font-medium text-foreground'>{value}</div>
    </div>
  );
}
