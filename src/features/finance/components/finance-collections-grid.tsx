'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  useReactTable
} from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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

function billingVariant(status: 'Current' | 'Overdue' | 'Scholarship' | 'Custom') {
  if (status === 'Overdue') return 'destructive' as const;
  if (status === 'Scholarship') return 'secondary' as const;
  return 'outline' as const;
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

function parseDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function daysUntil(dateValue: string) {
  const parsed = parseDate(dateValue);
  if (!parsed) return null;
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.round((parsed.getTime() - startOfToday().getTime()) / millisecondsPerDay);
}

function getCollectionsUrgency(row: CollectionsGridRow) {
  const actionDelta = daysUntil(row.nextActionDate);

  if (row.collectionStage === 'Escalated') {
    return {
      label: 'Escalate now',
      tone: 'destructive' as const,
      detail: 'Accounts lead or admin decision is needed before the next outreach step.'
    };
  }

  if (row.collectionStage === 'Promise to pay' && actionDelta !== null && actionDelta < 0) {
    return {
      label: 'Promise missed',
      tone: 'destructive' as const,
      detail: 'The promised payment date has passed and should be chased today.'
    };
  }

  if (actionDelta === null && row.totalOutstanding > 0) {
    return {
      label: 'Schedule next touch',
      tone: 'secondary' as const,
      detail: 'This account is in collections but has no next action date assigned yet.'
    };
  }

  if (actionDelta !== null && actionDelta <= 0) {
    return {
      label: 'Follow up today',
      tone: 'destructive' as const,
      detail:
        actionDelta < 0
          ? 'The planned follow-up date has already passed.'
          : 'The next touch is due today.'
    };
  }

  if (row.collectionStage === 'Promise to pay') {
    return {
      label: 'Monitor promise',
      tone: 'secondary' as const,
      detail: 'Keep the promised payment date visible and confirm it lands on time.'
    };
  }

  if (actionDelta !== null && actionDelta <= 3) {
    return {
      label: 'Due soon',
      tone: 'outline' as const,
      detail: 'The next follow-up window is approaching within the next few days.'
    };
  }

  return {
    label: 'On track',
    tone: 'outline' as const,
    detail: 'The current collections plan is scheduled and does not need immediate escalation.'
  };
}

function getUrgencyRank(row: CollectionsGridRow) {
  const urgencyLabel = getCollectionsUrgency(row).label;

  switch (urgencyLabel) {
    case 'Escalate now':
      return 0;
    case 'Promise missed':
      return 1;
    case 'Follow up today':
      return 2;
    case 'Schedule next touch':
      return 3;
    case 'Monitor promise':
      return 4;
    case 'Due soon':
      return 5;
    default:
      return 6;
  }
}

const matchesSelectedValues: FilterFn<CollectionsGridRow> = (row, columnId, filterValue) => {
  if (!Array.isArray(filterValue) || filterValue.length === 0) {
    return true;
  }

  return filterValue.includes(row.getValue(columnId));
};

function getRecommendedAction(row: CollectionsGridRow) {
  const actionDelta = daysUntil(row.nextActionDate);

  if (row.collectionStage === 'Escalated') {
    return 'Escalate to admin/accounts lead and confirm the recovery decision before the next family touch.';
  }

  if (row.collectionStage === 'Promise to pay') {
    return actionDelta !== null && actionDelta < 0
      ? 'The promised date has slipped. Contact the family today, capture the outcome, and agree a revised date if needed.'
      : 'Monitor the promised payment date and follow up immediately if the payment misses.';
  }

  if (!row.nextActionDate) {
    return 'Set the next action date so this account has a clear owner and follow-up window.';
  }

  if (actionDelta !== null && actionDelta < 0) {
    return 'Follow up today and update the queue with the missed-action outcome.';
  }

  if (row.reminderCount === 0) {
    return 'Start the first family reminder and log the planned next touch in the queue.';
  }

  if (row.paymentPlan.trim().length > 0) {
    return 'Keep the payment-plan path active and confirm the next installment or checkpoint date.';
  }

  if (actionDelta !== null && actionDelta <= 3) {
    return 'Keep this account near the top of the queue and confirm the next follow-up lands on time.';
  }

  return 'No immediate escalation is needed. Review again on the scheduled next action date.';
}

function getActionWindowLabel(dateValue: string) {
  const actionDelta = daysUntil(dateValue);
  if (!dateValue) return 'No next action scheduled';
  if (actionDelta === null) return dateValue;
  if (actionDelta < 0)
    return `${Math.abs(actionDelta)} day${Math.abs(actionDelta) === 1 ? '' : 's'} overdue`;
  if (actionDelta === 0) return 'Due today';
  if (actionDelta === 1) return 'Due tomorrow';
  return `Due in ${actionDelta} days`;
}

export interface CollectionsGridRow {
  profileId: string;
  studentId: string;
  studentName: string;
  className: string;
  academicYear: string;
  billingStatus: 'Current' | 'Overdue' | 'Scholarship' | 'Custom';
  familyAccountId?: string | null;
  familyLabel: string;
  familyPrimaryGuardianName: string;
  familyPrimaryGuardianPhone: string;
  familyStudentCount?: number;
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

export function FinanceCollectionsGrid({
  rows,
  allRows,
  hasFinanceWriteAccess = false,
  onRecordPayment,
  onLogReminder,
  onLogBulkReminders,
  onScheduleBulkFollowUp,
  onMarkBulkPromiseToPay
}: {
  rows: CollectionsGridRow[];
  allRows?: CollectionsGridRow[];
  hasFinanceWriteAccess?: boolean;
  onRecordPayment?: (row: CollectionsGridRow) => void;
  onLogReminder?: (row: CollectionsGridRow) => void;
  onLogBulkReminders?: (rows: CollectionsGridRow[]) => void;
  onScheduleBulkFollowUp?: (rows: CollectionsGridRow[]) => void;
  onMarkBulkPromiseToPay?: (rows: CollectionsGridRow[]) => void;
}) {
  const isMobile = useIsMobile();
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'urgency', desc: false },
    { id: 'totalOutstanding', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 12 });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedRow, setSelectedRow] = useState<CollectionsGridRow | null>(null);

  const urgencyOptions = useMemo(
    () =>
      buildOptions(
        [
          'Escalate now',
          'Promise missed',
          'Follow up today',
          'Schedule next touch',
          'Monitor promise',
          'Due soon',
          'On track'
        ].map((label) => ({
          label,
          value: label,
          count: rows.filter((row) => getCollectionsUrgency(row).label === label).length
        }))
      ),
    [rows]
  );

  const columns = useMemo<ColumnDef<CollectionsGridRow>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            aria-label='Select all visible collections accounts'
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Select ${row.original.studentName}`}
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
            onClick={(event) => event.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false
      },
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
        ),
        meta: {
          label: 'Collections',
          variant: 'multiSelect' as const,
          options: buildOptions(
            ['No follow-up', 'Reminder queued', 'In contact', 'Promise to pay', 'Escalated'].map(
              (label) => ({
                label,
                value: label,
                count: rows.filter((row) => row.collectionStage === label).length
              })
            )
          )
        },
        enableColumnFilter: true,
        filterFn: matchesSelectedValues
      },
      {
        id: 'urgency',
        accessorFn: (row) => getCollectionsUrgency(row).label,
        header: ({ column }) => <DataTableColumnHeader column={column} title='Urgency' />,
        cell: ({ row }) => {
          const urgency = getCollectionsUrgency(row.original);
          return (
            <div className='flex min-w-[190px] flex-col gap-1'>
              <Badge variant={urgency.tone}>{urgency.label}</Badge>
              <span className='text-muted-foreground line-clamp-2 text-xs'>{urgency.detail}</span>
            </div>
          );
        },
        meta: {
          label: 'Urgency',
          variant: 'multiSelect' as const,
          options: urgencyOptions
        },
        enableColumnFilter: true,
        filterFn: matchesSelectedValues,
        sortingFn: (left, right) => getUrgencyRank(left.original) - getUrgencyRank(right.original)
      },
      {
        id: 'nextActionDate',
        accessorKey: 'nextActionDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Next action' />,
        cell: ({ row }) => (
          <div className='flex min-w-[170px] flex-col'>
            <span>{row.original.nextActionDate || 'Not scheduled'}</span>
            <span className='text-muted-foreground text-xs'>
              {getActionWindowLabel(row.original.nextActionDate)}
            </span>
          </div>
        )
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
    [rows, urgencyOptions]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.profileId,
    enableRowSelection: true,
    state: { sorting, columnFilters, pagination, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const hasActiveFilters = columnFilters.length > 0;

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [columnFilters, sorting]);

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    setRowSelection({});
  }, [rows]);

  useEffect(() => {
    if (!selectedRow) {
      return;
    }

    const rowStillVisible = rows.some((row) => row.profileId === selectedRow.profileId);
    if (!rowStillVisible) {
      setSelectedRow(null);
    }
  }, [rows, selectedRow]);

  const relatedProfiles = useMemo(() => {
    if (!selectedRow?.familyAccountId) return [];

    const householdRows = (allRows ?? rows).filter((row) => {
      if (row.profileId === selectedRow.profileId) {
        return false;
      }

      return row.familyAccountId === selectedRow.familyAccountId;
    });

    return householdRows.toSorted((left, right) => {
      if (right.totalOutstanding !== left.totalOutstanding) {
        return right.totalOutstanding - left.totalOutstanding;
      }

      return left.studentName.localeCompare(right.studentName);
    });
  }, [allRows, rows, selectedRow]);

  const selectedQueueRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
  const selectedOutstandingTotal = selectedQueueRows.reduce(
    (sum, row) => sum + row.totalOutstanding,
    0
  );

  const actionBar = hasFinanceWriteAccess ? (
    <div className='flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3'>
      <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
        <div className='min-w-0'>
          <div className='text-sm font-medium text-foreground'>Batch collections actions</div>
          <div className='text-sm text-muted-foreground'>
            {selectedQueueRows.length} selected • outstanding {currency(selectedOutstandingTotal)}
          </div>
        </div>
        <div className='text-xs text-muted-foreground'>
          Move the queue in batches without losing the reminder trail.
        </div>
      </div>
      <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap'>
        <Button
          variant='outline'
          onClick={() => {
            onLogBulkReminders?.(selectedQueueRows);
            table.resetRowSelection();
          }}
          disabled={selectedQueueRows.length === 0}
        >
          Log reminder
        </Button>
        <Button
          variant='outline'
          onClick={() => {
            onScheduleBulkFollowUp?.(selectedQueueRows);
            table.resetRowSelection();
          }}
          disabled={selectedQueueRows.length === 0}
        >
          Schedule next touch
        </Button>
        <Button
          onClick={() => {
            onMarkBulkPromiseToPay?.(selectedQueueRows);
            table.resetRowSelection();
          }}
          disabled={selectedQueueRows.length === 0}
        >
          Mark promise to pay
        </Button>
        <Button
          variant='ghost'
          onClick={() => table.resetRowSelection()}
          disabled={selectedQueueRows.length === 0}
        >
          Clear selection
        </Button>
      </div>
    </div>
  ) : undefined;

  const detail = selectedRow ? (
    <div className='grid gap-4 px-1'>
      {(() => {
        const urgency = getCollectionsUrgency(selectedRow);
        const householdStudentCount = selectedRow.familyStudentCount ?? relatedProfiles.length + 1;
        const householdOutstanding = [selectedRow, ...relatedProfiles].reduce(
          (sum, profile) => sum + profile.totalOutstanding,
          0
        );

        return (
          <>
            <div className='rounded-xl border border-border/60 p-4'>
              <div className='flex flex-wrap items-center gap-2'>
                <div className='font-medium'>{selectedRow.studentName}</div>
                <Badge variant='outline'>{selectedRow.className}</Badge>
                <Badge variant={billingVariant(selectedRow.billingStatus)}>
                  {selectedRow.billingStatus}
                </Badge>
                <Badge variant={urgency.tone}>{urgency.label}</Badge>
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
              <CollectionPill
                label='Monthly total'
                value={currency(selectedRow.effectiveMonthlyFee)}
              />
              <CollectionPill label='Collections stage' value={selectedRow.collectionStage} />
              <CollectionPill
                label='Next action'
                value={selectedRow.nextActionDate || 'Not scheduled'}
              />
            </div>
            <div className='rounded-xl border border-border/60 p-4'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='text-sm font-medium'>Follow-up guidance</div>
                <Badge variant={urgency.tone}>{urgency.label}</Badge>
              </div>
              <div className='mt-2 text-sm text-muted-foreground'>{urgency.detail}</div>
              <div className='mt-3 rounded-lg bg-muted/25 p-3 text-sm leading-6 text-foreground'>
                {getRecommendedAction(selectedRow)}
              </div>
              <div className='mt-3 grid gap-2 text-sm text-muted-foreground'>
                <div>Action window: {getActionWindowLabel(selectedRow.nextActionDate)}</div>
                <div>
                  Queue reason:{' '}
                  {selectedRow.billingStatus === 'Overdue'
                    ? 'Overdue balance'
                    : 'Outstanding balance under follow-up'}
                </div>
                <div>
                  Contact history:{' '}
                  {selectedRow.reminderCount === 0
                    ? 'No reminders logged yet'
                    : `${selectedRow.reminderCount} reminder touch${selectedRow.reminderCount === 1 ? '' : 'es'} logged`}
                </div>
              </div>
            </div>
            <div className='rounded-xl border border-border/60 p-4'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='text-sm font-medium'>Household context</div>
                <Badge variant='outline'>
                  {householdStudentCount} student{householdStudentCount === 1 ? '' : 's'}
                </Badge>
              </div>
              {selectedRow.familyAccountId ? (
                <div className='mt-2 text-sm text-muted-foreground'>
                  Shared payer view for {selectedRow.familyLabel || 'this household'}. Open linked
                  students to review sibling balances before following up.
                </div>
              ) : selectedRow.familyLabel ? (
                <div className='mt-2 text-sm text-muted-foreground'>
                  {selectedRow.familyLabel} is named on this profile, but the linked household
                  record is not available yet.
                </div>
              ) : (
                <div className='mt-2 text-sm text-muted-foreground'>
                  This billing profile is not linked to a named family account yet.
                </div>
              )}
              <div className='mt-3 text-sm text-muted-foreground'>
                Household outstanding exposure:{' '}
                <span className='font-medium text-foreground'>
                  {currency(householdOutstanding)}
                </span>
              </div>
              {relatedProfiles.length > 0 ? (
                <div className='mt-4 grid gap-2'>
                  {relatedProfiles.map((profile) => (
                    <div
                      key={profile.profileId}
                      className='rounded-xl border border-border/60 bg-muted/15 p-3'
                    >
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <div className='min-w-0'>
                          <div className='font-medium'>{profile.studentName}</div>
                          <div className='text-xs text-muted-foreground'>
                            {profile.className}
                            {profile.academicYear ? ` • ${profile.academicYear}` : ''}
                          </div>
                        </div>
                        <Badge variant={billingVariant(profile.billingStatus)}>
                          {profile.billingStatus}
                        </Badge>
                      </div>
                      <div className='mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground'>
                        <div>
                          Outstanding {currency(profile.totalOutstanding)} • Next action{' '}
                          {profile.nextActionDate || 'Not scheduled'}
                        </div>
                        <Button asChild variant='outline' size='sm'>
                          <Link href={`/dashboard/billing/${profile.studentId}`}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedRow.familyAccountId ? (
                <div className='mt-4 rounded-xl border border-dashed border-border/60 p-3 text-sm text-muted-foreground'>
                  No other linked student accounts are in this household yet.
                </div>
              ) : null}
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
            <div className='grid gap-2'>
              {hasFinanceWriteAccess ? (
                <div className='grid gap-2 sm:grid-cols-2'>
                  <Button
                    variant='outline'
                    onClick={() => {
                      onLogReminder?.(selectedRow);
                      setSelectedRow(null);
                    }}
                  >
                    Log reminder
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => {
                      onRecordPayment?.(selectedRow);
                      setSelectedRow(null);
                    }}
                  >
                    Record payment
                  </Button>
                </div>
              ) : null}
              <div className='flex gap-2'>
                <Button asChild className='w-full'>
                  <Link href={`/dashboard/billing/${selectedRow.studentId}`}>
                    Open full student finance
                  </Link>
                </Button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  ) : null;

  return (
    <>
      <DataTable
        table={table}
        actionBar={actionBar}
        onRowClick={(row) => setSelectedRow(row.original)}
        rowClassName='group'
      >
        <DataTableToolbar table={table} />
      </DataTable>
      {hasActiveFilters && filteredRowCount === 0 ? (
        <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
          No collections accounts match the current filters. Reset or widen the queue filters to
          bring more households back into view.
        </div>
      ) : null}
      {isMobile ? (
        <Drawer
          open={Boolean(selectedRow)}
          onOpenChange={(open) => {
            if (!open) setSelectedRow(null);
          }}
        >
          <DrawerContent className='max-h-[85dvh] min-h-0 w-full max-w-full overflow-x-hidden'>
            <DrawerHeader className='shrink-0'>
              <DrawerTitle>Collections detail</DrawerTitle>
              <DrawerDescription>
                Open the selected collections record without leaving the grid.
              </DrawerDescription>
            </DrawerHeader>
            <div className='min-h-0 flex-1 min-w-0 overflow-x-hidden overflow-y-auto px-4 pb-4'>
              {detail}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet
          open={Boolean(selectedRow)}
          onOpenChange={(open) => {
            if (!open) setSelectedRow(null);
          }}
        >
          <SheetContent className='w-full max-w-full overflow-x-hidden sm:max-w-xl'>
            <SheetHeader>
              <SheetTitle>Collections detail</SheetTitle>
              <SheetDescription>
                Open the selected collections record without leaving the grid.
              </SheetDescription>
            </SheetHeader>
            <div className='mt-6 max-h-[calc(100vh-8rem)] min-w-0 overflow-x-hidden overflow-y-auto pr-1'>
              {detail}
            </div>
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
