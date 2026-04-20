'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Option } from '@/types/data-table';
import { getFinanceGridColumns, type FinanceGridRow } from './finance-grid-columns';

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

export function FinanceOverviewGrid({
  rows,
  onAddProfile,
  canManageProfiles = true
}: {
  rows: FinanceGridRow[];
  onAddProfile: () => void;
  canManageProfiles?: boolean;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'totalOutstanding', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 12 });
  const [mobileSearch, setMobileSearch] = useState('');
  const [mobileStatus, setMobileStatus] = useState('all');
  const [mobileCollectionStage, setMobileCollectionStage] = useState('all');

  const classOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.className, (counts.get(row.className) ?? 0) + 1);
    }
    return buildOptions(
      Array.from(counts.entries()).map(([value, count]) => ({ label: value, value, count }))
    );
  }, [rows]);

  const academicYearOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(
        row.academicYear || 'Unassigned',
        (counts.get(row.academicYear || 'Unassigned') ?? 0) + 1
      );
    }
    return buildOptions(
      Array.from(counts.entries()).map(([value, count]) => ({ label: value, value, count }))
    );
  }, [rows]);

  const billingStatusOptions = useMemo(
    () =>
      buildOptions(
        ['Current', 'Overdue', 'Scholarship', 'Custom'].map((value) => ({
          label: value,
          value,
          count: rows.filter((row) => row.billingStatus === value).length
        }))
      ),
    [rows]
  );

  const collectionStageOptions = useMemo(
    () =>
      buildOptions(
        ['No follow-up', 'Reminder queued', 'In contact', 'Promise to pay', 'Escalated'].map(
          (value) => ({
            label: value,
            value,
            count: rows.filter((row) => row.collectionStage === value).length
          })
        )
      ),
    [rows]
  );

  const columns = useMemo(
    () =>
      getFinanceGridColumns({
        classOptions,
        academicYearOptions,
        billingStatusOptions,
        collectionStageOptions
      }),
    [classOptions, academicYearOptions, billingStatusOptions, collectionStageOptions]
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

  useEffect(() => {
    setPagination((current) => ({ ...current, pageSize: isMobile ? 8 : 12 }));
  }, [isMobile]);

  useEffect(() => {
    table.getColumn('studentName')?.setFilterValue(mobileSearch.trim() ? mobileSearch : undefined);
  }, [mobileSearch, table]);

  useEffect(() => {
    table
      .getColumn('billingStatus')
      ?.setFilterValue(mobileStatus === 'all' ? undefined : [mobileStatus]);
  }, [mobileStatus, table]);

  useEffect(() => {
    table
      .getColumn('collectionStage')
      ?.setFilterValue(mobileCollectionStage === 'all' ? undefined : [mobileCollectionStage]);
  }, [mobileCollectionStage, table]);

  if (isMobile) {
    const visibleRows = table.getRowModel().rows;
    const totalFilteredRows = table.getFilteredRowModel().rows.length;

    return (
      <div className='grid gap-4'>
        <Card className='border-border/60 bg-muted/10'>
          <CardContent className='grid gap-3 p-4'>
            <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_auto]'>
              <Input
                value={mobileSearch}
                onChange={(event) => setMobileSearch(event.target.value)}
                placeholder='Search student, class, or year'
              />
              <Select value={mobileStatus} onValueChange={setMobileStatus}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All statuses</SelectItem>
                  {billingStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={mobileCollectionStage} onValueChange={setMobileCollectionStage}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Collections' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All collection stages</SelectItem>
                  {collectionStageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canManageProfiles ? (
                <Button type='button' variant='outline' onClick={onAddProfile}>
                  Add billing profile
                </Button>
              ) : null}
            </div>
            <div className='text-xs text-muted-foreground'>
              Showing {visibleRows.length} of {totalFilteredRows} student accounts on this page.
            </div>
          </CardContent>
        </Card>

        {visibleRows.length === 0 ? (
          <Card className='border-dashed border-border/60'>
            <CardContent className='grid gap-3 p-5 text-sm text-muted-foreground'>
              <div>
                <div className='font-medium text-foreground'>No matching student accounts</div>
                <div className='mt-1'>
                  Adjust the search or filters to widen the finance account list.
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setMobileSearch('');
                    setMobileStatus('all');
                    setMobileCollectionStage('all');
                  }}
                >
                  Clear filters
                </Button>
                {canManageProfiles ? (
                  <Button type='button' onClick={onAddProfile}>
                    Add billing profile
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className='grid gap-3'>
            {visibleRows.map((row) => (
              <button
                key={row.original.profileId}
                type='button'
                className='text-left'
                onClick={() => router.push(`/dashboard/billing/${row.original.studentId}`)}
              >
                <Card className='border-border/60 transition-colors hover:border-primary/40'>
                  <CardContent className='grid gap-4 p-4'>
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <div className='font-medium'>{row.original.studentName}</div>
                        <div className='text-sm text-muted-foreground'>
                          {row.original.className}
                          {row.original.academicYear ? ` • ${row.original.academicYear}` : ''}
                        </div>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        <Badge variant={billingVariant(row.original.billingStatus)}>
                          {row.original.billingStatus}
                        </Badge>
                        {row.original.collectionStage !== 'No follow-up' ? (
                          <Badge
                            variant={
                              row.original.collectionStage === 'Escalated'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {row.original.collectionStage}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className='grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-3 sm:grid-cols-2'>
                      <Metric
                        label='Monthly total'
                        value={currency(row.original.effectiveMonthlyFee)}
                      />
                      <Metric label='Outstanding' value={currency(row.original.totalOutstanding)} />
                      <Metric
                        label='Last payment'
                        value={
                          row.original.recentPaymentAmount
                            ? `${currency(row.original.recentPaymentAmount)}${row.original.recentPaymentDate ? ` • ${row.original.recentPaymentDate}` : ''}`
                            : 'No payment yet'
                        }
                      />
                      <Metric
                        label='Next action'
                        value={row.original.nextActionDate || 'Not scheduled'}
                      />
                    </div>

                    <div className='grid gap-1 text-sm text-muted-foreground'>
                      <div>Family: {row.original.familyLabel || 'No family label'}</div>
                      <div>
                        Plan items: {row.original.billingItemsSummary || 'No extra plan items'}
                      </div>
                    </div>

                    <div className='text-sm font-medium text-foreground'>Open student finance</div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
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
    );
  }

  return (
    <DataTable
      table={table}
      onRowClick={(row) => router.push(`/dashboard/billing/${row.original.studentId}`)}
      rowClassName='group'
    >
      <DataTableToolbar table={table}>
        {canManageProfiles ? <ButtonRow onAddProfile={onAddProfile} /> : null}
      </DataTableToolbar>
    </DataTable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className='grid gap-1'>
      <div className='text-xs uppercase tracking-[0.12em] text-muted-foreground'>{label}</div>
      <div className='text-sm font-medium text-foreground'>{value}</div>
    </div>
  );
}

function ButtonRow({ onAddProfile }: { onAddProfile: () => void }) {
  return (
    <Button type='button' variant='outline' size='sm' onClick={onAddProfile}>
      Add billing profile
    </Button>
  );
}
