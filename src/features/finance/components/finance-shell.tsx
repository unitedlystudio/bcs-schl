'use client';

import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';

import { api } from '../../../../convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceAccessGate } from './finance-access-gate';
import { FinanceOverviewGrid } from './finance-overview-grid';
import { FinanceCollectionsGrid, type CollectionsGridRow } from './finance-collections-grid';
import { FinanceFamilyAccountsGrid } from './finance-family-accounts-grid';
import { FinanceProfileSheet } from './finance-profile-sheet';
import {
  FinanceBulkReminderSheet,
  FinanceFamilyPaymentSheet,
  FinancePaymentSheet,
  FinanceReminderSheet
} from './finance-record-sheets';
import { FinanceBillingRunSheet } from './finance-billing-run-sheet';
import { useFinanceAccess } from '../hooks/use-finance-access';

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function chargeVariant(status: 'Pending' | 'Paid' | 'Overdue' | 'Waived') {
  if (status === 'Overdue') return 'destructive' as const;
  if (status === 'Paid') return 'default' as const;
  if (status === 'Pending') return 'secondary' as const;
  return 'outline' as const;
}

function collectionStageVariant(stage: CollectionsGridRow['collectionStage']) {
  if (stage === 'Escalated') return 'destructive' as const;
  if (stage === 'Promise to pay') return 'default' as const;
  if (stage === 'In contact' || stage === 'Reminder queued') return 'secondary' as const;
  return 'outline' as const;
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

function isActiveCollectionsStage(stage: CollectionsGridRow['collectionStage']) {
  return (
    stage === 'Reminder queued' ||
    stage === 'In contact' ||
    stage === 'Promise to pay' ||
    stage === 'Escalated'
  );
}

function isCollectionsActionDueNow(row: CollectionsGridRow) {
  const nextActionDate = parseDate(row.nextActionDate);
  const needsCollectionsAttention =
    row.billingStatus === 'Overdue' || isActiveCollectionsStage(row.collectionStage);

  if (!needsCollectionsAttention) {
    return false;
  }

  if (!nextActionDate) {
    return true;
  }

  return nextActionDate.getTime() <= startOfToday().getTime();
}

type CollectionsWorkbenchView = 'all' | 'dueNow' | 'promises' | 'escalated' | 'unplanned';

function isPromiseMissed(row: CollectionsGridRow) {
  if (row.collectionStage !== 'Promise to pay') {
    return false;
  }

  const nextActionDate = parseDate(row.nextActionDate);
  return nextActionDate ? nextActionDate.getTime() < startOfToday().getTime() : false;
}

function getCollectionsWorkbenchMeta(view: CollectionsWorkbenchView, rows: CollectionsGridRow[]) {
  const dueNowRows = rows.filter((row) => isCollectionsActionDueNow(row));
  const promiseRows = rows.filter((row) => row.collectionStage === 'Promise to pay');
  const escalatedRows = rows.filter((row) => row.collectionStage === 'Escalated');
  const unplannedRows = rows.filter(
    (row) =>
      row.totalOutstanding > 0 &&
      isActiveCollectionsStage(row.collectionStage) &&
      !row.nextActionDate
  );

  switch (view) {
    case 'dueNow':
      return {
        label: 'Due now',
        count: dueNowRows.length,
        description:
          'Follow-up due today, already past its planned date, or missing a next action date so the queue can move before accounts slip further.',
        rows: dueNowRows,
        emptyTitle: 'No collections work is due right now.',
        emptyDescription:
          'Accounts with an action due today, a missed next touch, or no next action date will surface here.'
      };
    case 'promises':
      return {
        label: 'Promise to pay',
        count: promiseRows.length,
        description:
          'Monitor promised payments in one lane so missed promises are chased quickly and new dates are captured cleanly.',
        rows: promiseRows,
        emptyTitle: 'No payment promises are active right now.',
        emptyDescription:
          'Profiles moved into Promise to pay will collect here until the payment lands or the plan changes.'
      };
    case 'escalated':
      return {
        label: 'Escalated',
        count: escalatedRows.length,
        description:
          'Accounts needing stronger intervention or a lead decision before the next family touch.',
        rows: escalatedRows,
        emptyTitle: 'No escalated collections accounts are visible right now.',
        emptyDescription:
          'Profiles flagged for stronger intervention will appear here once they move beyond normal follow-up.'
      };
    case 'unplanned':
      return {
        label: 'Needs scheduling',
        count: unplannedRows.length,
        description:
          'Outstanding accounts already under follow-up but still missing a next action date. Use this lane to tighten ownership.',
        rows: unplannedRows,
        emptyTitle: 'Every active follow-up account has a next action date.',
        emptyDescription:
          'If a reminder or contact stage is set without a scheduled next touch, those accounts will surface here.'
      };
    default:
      return {
        label: 'All queue',
        count: rows.length,
        description:
          "Use the full queue for broad review, then narrow into today's work, promises, escalations, or accounts that still need scheduling.",
        rows,
        emptyTitle: 'No overdue student accounts are visible right now.',
        emptyDescription:
          'When balances become overdue or arrears are added, those accounts will surface here.'
      };
  }
}

function sumOutstanding(rows: CollectionsGridRow[]) {
  return rows.reduce((sum, row) => sum + row.totalOutstanding, 0);
}

function formatCollectionsLead(row: CollectionsGridRow | undefined) {
  if (!row) {
    return 'No accounts are sitting in this lane right now.';
  }

  const nextAction = row.nextActionDate
    ? `next action ${row.nextActionDate}`
    : 'no next action set';
  return `${row.studentName} • ${currency(row.totalOutstanding)} outstanding • ${nextAction}`;
}

export default function FinanceShell() {
  const { hasFinanceAccess, hasFinanceWriteAccess, canQueryFinance, isLoadingFinanceAccess } =
    useFinanceAccess();
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [billingRunSheetOpen, setBillingRunSheetOpen] = useState(false);
  const [familyPaymentSheetOpen, setFamilyPaymentSheetOpen] = useState(false);
  const [collectionPaymentSheetOpen, setCollectionPaymentSheetOpen] = useState(false);
  const [collectionReminderSheetOpen, setCollectionReminderSheetOpen] = useState(false);
  const [bulkReminderSheetOpen, setBulkReminderSheetOpen] = useState(false);
  const [bulkReminderMode, setBulkReminderMode] = useState<'default' | 'schedule' | 'promise'>(
    'default'
  );
  const [collectionsView, setCollectionsView] = useState<CollectionsWorkbenchView>('all');
  const [selectedFamilyAccountId, setSelectedFamilyAccountId] = useState<string | null>(null);
  const [selectedCollectionRow, setSelectedCollectionRow] = useState<CollectionsGridRow | null>(
    null
  );
  const [selectedCollectionBatch, setSelectedCollectionBatch] = useState<CollectionsGridRow[]>([]);
  const summary = useQuery(api.finance.summary, canQueryFinance ? {} : 'skip');
  const profilesQuery = useQuery(api.finance.list, canQueryFinance ? {} : 'skip');
  const familyAccounts = useQuery(
    api.finance.familyAccountsOverview,
    canQueryFinance ? {} : 'skip'
  );
  const ledgerActivity = useQuery(
    api.finance.ledgerActivity,
    canQueryFinance ? { limit: 16 } : 'skip'
  );

  const allProfileRows = useMemo(
    () =>
      (profilesQuery ?? []).map((profile) => ({
        profileId: profile.id,
        studentId: profile.studentId,
        studentName: profile.studentName,
        className: profile.className,
        academicYear: profile.academicYear,
        billingStatus: profile.billingStatus,
        familyAccountId: profile.familyAccountId,
        familyLabel: profile.familyLabel,
        familyPrimaryGuardianName: profile.familyPrimaryGuardianName,
        familyPrimaryGuardianPhone: profile.familyPrimaryGuardianPhone,
        familyStudentCount: profile.familyStudentCount,
        collectionStage: profile.collectionStage,
        reminderChannel: profile.reminderChannel,
        nextActionDate: profile.nextActionDate,
        reminderCount: profile.reminderCount,
        recentReminderDate: profile.recentReminderDate,
        recentReminderOutcome: profile.recentReminderOutcome,
        tuitionMonthlyFee: profile.effectiveMonthlyFee - profile.billedAddOnMonthlyTotal,
        billedAddOnCount: profile.billedAddOnCount,
        billedAddOnMonthlyTotal: profile.billedAddOnMonthlyTotal,
        billingItemsSummary: profile.billingItemsSummary,
        effectiveMonthlyFee: profile.effectiveMonthlyFee,
        totalOutstanding: profile.totalOutstanding,
        recentPaymentAmount: profile.recentPaymentAmount,
        recentPaymentDate: profile.recentPaymentDate,
        paymentPlan: profile.paymentPlan
      })),
    [profilesQuery]
  );

  const collectionsRows = useMemo(
    () =>
      allProfileRows
        .filter(
          (row) =>
            row.billingStatus === 'Overdue' ||
            (row.totalOutstanding > 0 && isActiveCollectionsStage(row.collectionStage))
        )
        .toSorted((left, right) => {
          if (right.totalOutstanding !== left.totalOutstanding) {
            return right.totalOutstanding - left.totalOutstanding;
          }
          return left.nextActionDate.localeCompare(right.nextActionDate);
        }),
    [allProfileRows]
  );

  const paymentPlanCount = useMemo(
    () => allProfileRows.filter((row) => row.paymentPlan.trim().length > 0).length,
    [allProfileRows]
  );
  const monthlyRunRate = useMemo(
    () => allProfileRows.reduce((sum, row) => sum + row.effectiveMonthlyFee, 0),
    [allProfileRows]
  );
  const accountsNeedingAction = collectionsRows.length;
  const dueNowRows = useMemo(
    () => collectionsRows.filter((row) => isCollectionsActionDueNow(row)),
    [collectionsRows]
  );
  const promiseRows = useMemo(
    () => collectionsRows.filter((row) => row.collectionStage === 'Promise to pay'),
    [collectionsRows]
  );
  const missedPromiseRows = useMemo(
    () => promiseRows.filter((row) => isPromiseMissed(row)),
    [promiseRows]
  );
  const escalatedRows = useMemo(
    () => collectionsRows.filter((row) => row.collectionStage === 'Escalated'),
    [collectionsRows]
  );
  const unplannedRows = useMemo(
    () =>
      collectionsRows.filter(
        (row) =>
          row.totalOutstanding > 0 &&
          isActiveCollectionsStage(row.collectionStage) &&
          !row.nextActionDate
      ),
    [collectionsRows]
  );
  const collectionsDueNowCount = dueNowRows.length;
  const promiseToPayCount = promiseRows.length;
  const promiseMissedCount = missedPromiseRows.length;
  const escalatedCollectionsCount = escalatedRows.length;
  const unplannedCollectionsCount = unplannedRows.length;
  const collectionsWorkbench = useMemo(
    () => getCollectionsWorkbenchMeta(collectionsView, collectionsRows),
    [collectionsView, collectionsRows]
  );
  const collectionsRunbookSteps = useMemo(
    () => [
      {
        id: 'dueNow' as const,
        step: 'Follow-up',
        label: 'Due now',
        count: dueNowRows.length,
        outstanding: sumOutstanding(dueNowRows),
        hint: 'Touches due today, already slipped, or still unscheduled.',
        subhint: `${unplannedRows.length} still missing a next action date`,
        lead: formatCollectionsLead(dueNowRows[0])
      },
      {
        id: 'promises' as const,
        step: 'Promises',
        label: 'Promise to pay',
        count: promiseRows.length,
        outstanding: sumOutstanding(promiseRows),
        hint: 'Track families who already agreed to pay and confirm dates hold.',
        subhint: `${missedPromiseRows.length} promise${missedPromiseRows.length === 1 ? '' : 's'} already missed`,
        lead: formatCollectionsLead(promiseRows[0])
      },
      {
        id: 'escalated' as const,
        step: 'Escalations',
        label: 'Escalated',
        count: escalatedRows.length,
        outstanding: sumOutstanding(escalatedRows),
        hint: 'Accounts needing a stronger intervention or a lead decision.',
        subhint: 'Keep these visible before the next family touch',
        lead: formatCollectionsLead(escalatedRows[0])
      },
      {
        id: 'unplanned' as const,
        step: 'Scheduling',
        label: 'Needs scheduling',
        count: unplannedRows.length,
        outstanding: sumOutstanding(unplannedRows),
        hint: 'Active follow-up accounts that still need a real next step on the calendar.',
        subhint: 'Use this lane to remove ownership gaps',
        lead: formatCollectionsLead(unplannedRows[0])
      }
    ],
    [dueNowRows, escalatedRows, missedPromiseRows, promiseRows, unplannedRows]
  );
  const selectedFamilyAccount = useMemo(
    () => (familyAccounts ?? []).find((account) => account.id === selectedFamilyAccountId) ?? null,
    [familyAccounts, selectedFamilyAccountId]
  );

  if (isLoadingFinanceAccess) {
    return (
      <FinanceAccessGate>
        <div />
      </FinanceAccessGate>
    );
  }

  if (!hasFinanceAccess) {
    return (
      <FinanceAccessGate>
        <div />
      </FinanceAccessGate>
    );
  }

  if (
    !summary ||
    profilesQuery === undefined ||
    familyAccounts === undefined ||
    ledgerActivity === undefined
  ) {
    return (
      <div className='grid gap-3'>
        <div className='h-28 animate-pulse rounded-2xl border border-border/50 bg-muted/30' />
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className='h-24 animate-pulse rounded-2xl border border-border/50 bg-muted/30'
            />
          ))}
        </div>
        <div className='h-96 animate-pulse rounded-2xl border border-border/50 bg-muted/30' />
      </div>
    );
  }

  return (
    <FinanceAccessGate>
      <div className='flex min-w-0 flex-1 flex-col gap-4'>
        <Card className='border-border/60'>
          <CardContent className='flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between'>
            <div className='min-w-0 space-y-3'>
              <div className='space-y-1'>
                <div className='text-sm font-medium text-foreground'>School finance workspace</div>
                <p className='max-w-3xl text-sm leading-6 text-muted-foreground'>
                  Keep student accounts, charge activity, payments, and collections in one simple
                  operator flow. Start from accounts, review activity in one ledger lane, then work
                  the overdue queue without losing context.
                </p>
              </div>
              <div className='flex flex-wrap gap-2 text-xs'>
                <Badge variant='outline'>Simple desktop + mobile flow</Badge>
                <Badge variant='outline'>Per-student finance detail</Badge>
                <Badge variant='outline'>Accounts-only workspace</Badge>
              </div>
            </div>
            <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end'>
              {hasFinanceWriteAccess ? (
                <>
                  <Button
                    variant='outline'
                    className='w-full sm:w-auto'
                    onClick={() => setProfileSheetOpen(true)}
                  >
                    Add billing profile
                  </Button>
                  <Button className='w-full sm:w-auto' onClick={() => setBillingRunSheetOpen(true)}>
                    Generate billing run
                  </Button>
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
          <SummaryCard
            label='Active profiles'
            value={`${summary.profiles}`}
            detail={`${summary.familyAccounts} family account${summary.familyAccounts === 1 ? '' : 's'}`}
          />
          <SummaryCard
            label='Monthly run rate'
            value={currency(monthlyRunRate)}
            detail='Recurring tuition and charged add-ons'
          />
          <SummaryCard
            label='Collected this month'
            value={currency(summary.collectedThisMonth)}
            detail='Recorded intake across the school'
          />
          <SummaryCard
            label='Outstanding'
            value={currency(summary.totalOutstanding)}
            detail={`${accountsNeedingAction} account${accountsNeedingAction === 1 ? '' : 's'} need attention`}
          />
        </div>

        <Tabs defaultValue='accounts' className='gap-4'>
          <div className='overflow-x-auto'>
            <TabsList className='inline-flex h-11 min-w-max items-center justify-start gap-1 rounded-xl p-1'>
              <TabsTrigger value='accounts' className='min-h-9 px-4'>
                Accounts
              </TabsTrigger>
              <TabsTrigger value='activity' className='min-h-9 px-4'>
                Activity
              </TabsTrigger>
              <TabsTrigger value='collections' className='min-h-9 px-4'>
                Collections
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='accounts' className='space-y-4'>
            <Card className='border-border/60'>
              <CardHeader className='gap-3 pb-4'>
                <CardTitle className='text-base'>Accounts</CardTitle>
                <CardDescription className='max-w-3xl'>
                  Browse student billing accounts first, then switch to family accounts when you
                  need a shared household view.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3 md:grid-cols-3'>
                <InlineStat
                  label='Student profiles'
                  value={`${allProfileRows.length}`}
                  hint='Primary per-student billing records'
                />
                <InlineStat
                  label='Family accounts'
                  value={`${familyAccounts.length}`}
                  hint='Linked sibling households and shared payers'
                />
                <InlineStat
                  label='Payment plans'
                  value={`${paymentPlanCount}`}
                  hint='Accounts on structured terms'
                />
              </CardContent>
            </Card>

            <Tabs defaultValue='students' className='gap-4'>
              <div className='overflow-x-auto'>
                <TabsList className='inline-flex h-10 min-w-max items-center justify-start gap-1 rounded-xl p-1'>
                  <TabsTrigger value='students' className='min-h-8 px-4'>
                    Students
                  </TabsTrigger>
                  <TabsTrigger value='families' className='min-h-8 px-4'>
                    Families
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value='students'>
                <Card className='overflow-hidden border-border/60'>
                  <CardHeader>
                    <CardTitle>Student billing accounts</CardTitle>
                    <CardDescription>
                      Scan billing health school-wide, then open a student finance screen for
                      charges, payments, reminders, and billing setup.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {allProfileRows.length === 0 ? (
                      <LedgerEmpty
                        title='No student finance profiles yet.'
                        description='Create the first billing profile so tuition, lunch plans, extra lessons, and ledger activity can be tracked per student.'
                        action={
                          hasFinanceWriteAccess ? (
                            <Button onClick={() => setProfileSheetOpen(true)}>
                              Add first billing profile
                            </Button>
                          ) : null
                        }
                      />
                    ) : (
                      <FinanceOverviewGrid
                        rows={allProfileRows}
                        onAddProfile={() => setProfileSheetOpen(true)}
                        canManageProfiles={hasFinanceWriteAccess}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='families'>
                <Card className='overflow-hidden border-border/60'>
                  <CardHeader>
                    <CardTitle>Family accounts</CardTitle>
                    <CardDescription>
                      Group siblings and shared payers under one household view so Accounts can scan
                      combined outstanding, guardians, and next actions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FinanceFamilyAccountsGrid
                      familyAccounts={familyAccounts}
                      hasFinanceWriteAccess={hasFinanceWriteAccess}
                      onAllocate={(familyAccountId) => {
                        setSelectedFamilyAccountId(familyAccountId);
                        setFamilyPaymentSheetOpen(true);
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value='activity' className='space-y-4'>
            <Card className='border-border/60'>
              <CardHeader className='gap-3 pb-4'>
                <CardTitle className='text-base'>Activity</CardTitle>
                <CardDescription className='max-w-3xl'>
                  Review school-wide finance activity in one lane, then switch between charges,
                  payments, and reminder history without leaving the page.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                <InlineStat
                  label='Recent charges'
                  value={`${ledgerActivity.charges.length}`}
                  hint='Latest issued tuition and extra charges'
                />
                <InlineStat
                  label='Recent payments'
                  value={`${ledgerActivity.payments.length}`}
                  hint='Latest incoming payment records'
                />
                <InlineStat
                  label='Recent reminders'
                  value={`${ledgerActivity.reminders.length}`}
                  hint='Latest outreach notes and follow-up updates'
                />
                <InlineStat
                  label='Due now'
                  value={`${collectionsDueNowCount}`}
                  hint='Accounts that need a touch today or are still unscheduled'
                />
              </CardContent>
            </Card>

            <Tabs defaultValue='charges' className='gap-4'>
              <div className='overflow-x-auto'>
                <TabsList className='inline-flex h-10 min-w-max items-center justify-start gap-1 rounded-xl p-1'>
                  <TabsTrigger value='charges' className='min-h-8 px-4'>
                    Charges
                  </TabsTrigger>
                  <TabsTrigger value='payments' className='min-h-8 px-4'>
                    Payments
                  </TabsTrigger>
                  <TabsTrigger value='reminders' className='min-h-8 px-4'>
                    Reminders
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value='charges'>
                <Card className='overflow-hidden border-border/60'>
                  <CardHeader className='gap-4'>
                    <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                      <div>
                        <CardTitle>School charge ledger</CardTitle>
                        <CardDescription>
                          Recent charges across the school. Open a student to inspect or add full
                          charge detail.
                        </CardDescription>
                      </div>
                      {hasFinanceWriteAccess ? (
                        <Button variant='outline' onClick={() => setBillingRunSheetOpen(true)}>
                          Generate billing run
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {ledgerActivity.charges.length === 0 ? (
                      <LedgerEmpty
                        title='No charges recorded yet.'
                        description='Once tuition, registration, lunch, or extra activity charges are logged, they will appear here.'
                      />
                    ) : (
                      <LedgerTableCard>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead>Charge</TableHead>
                              <TableHead>Cycle</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Charge date</TableHead>
                              <TableHead>Due</TableHead>
                              <TableHead className='text-right'>Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ledgerActivity.charges.map((charge) => (
                              <TableRow key={charge.id}>
                                <TableCell>
                                  <div className='font-medium'>{charge.studentName}</div>
                                  <div className='text-xs text-muted-foreground'>
                                    {charge.className}
                                    {charge.academicYear ? ` • ${charge.academicYear}` : ''}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className='font-medium'>{charge.title}</div>
                                  <div className='text-xs text-muted-foreground'>
                                    {charge.category}
                                  </div>
                                </TableCell>
                                <TableCell>{charge.billingCycleLabel}</TableCell>
                                <TableCell>
                                  <Badge variant={chargeVariant(charge.status)}>
                                    {charge.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{charge.chargeDate}</TableCell>
                                <TableCell>{charge.dueDate}</TableCell>
                                <TableCell className='text-right font-medium'>
                                  {currency(charge.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </LedgerTableCard>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='payments'>
                <Card className='overflow-hidden border-border/60'>
                  <CardHeader>
                    <CardTitle>School payment intake</CardTitle>
                    <CardDescription>
                      Recent payment activity with method and reference context for Accounts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ledgerActivity.payments.length === 0 ? (
                      <LedgerEmpty
                        title='No payments recorded yet.'
                        description='Recorded payments will appear here once finance teams begin logging intake.'
                      />
                    ) : (
                      <LedgerTableCard>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead>Paid at</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead>Reference</TableHead>
                              <TableHead>Note</TableHead>
                              <TableHead className='text-right'>Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ledgerActivity.payments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  <div className='font-medium'>{payment.studentName}</div>
                                  <div className='text-xs text-muted-foreground'>
                                    {payment.className}
                                    {payment.academicYear ? ` • ${payment.academicYear}` : ''}
                                  </div>
                                </TableCell>
                                <TableCell>{payment.paidAt}</TableCell>
                                <TableCell>
                                  <Badge variant='outline'>{payment.method}</Badge>
                                </TableCell>
                                <TableCell>{payment.reference || '—'}</TableCell>
                                <TableCell className='max-w-[280px] text-sm text-muted-foreground'>
                                  {payment.note || '—'}
                                </TableCell>
                                <TableCell className='text-right font-medium'>
                                  {currency(payment.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </LedgerTableCard>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='reminders'>
                <Card className='overflow-hidden border-border/60'>
                  <CardHeader>
                    <CardTitle>Collections reminder log</CardTitle>
                    <CardDescription>
                      Recent outreach history across the school so Accounts can confirm the last
                      touch, who logged it, and what next action is now expected.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ledgerActivity.reminders.length === 0 ? (
                      <LedgerEmpty
                        title='No reminders logged yet.'
                        description='Logged collections calls, WhatsApp touches, and reminder notes will appear here once the team starts recording outreach.'
                      />
                    ) : (
                      <LedgerTableCard>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead>Reminder date</TableHead>
                              <TableHead>Channel</TableHead>
                              <TableHead>Stage</TableHead>
                              <TableHead>Next action</TableHead>
                              <TableHead>Logged by</TableHead>
                              <TableHead>Outcome</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ledgerActivity.reminders.map((reminder) => (
                              <TableRow key={reminder.id}>
                                <TableCell>
                                  <div className='font-medium'>{reminder.studentName}</div>
                                  <div className='text-xs text-muted-foreground'>
                                    {reminder.className}
                                    {reminder.academicYear ? ` • ${reminder.academicYear}` : ''}
                                  </div>
                                </TableCell>
                                <TableCell>{reminder.reminderDate}</TableCell>
                                <TableCell>
                                  <Badge variant='outline'>{reminder.channel}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={collectionStageVariant(reminder.collectionStage)}>
                                    {reminder.collectionStage}
                                  </Badge>
                                </TableCell>
                                <TableCell>{reminder.nextActionDate || 'Not scheduled'}</TableCell>
                                <TableCell>{reminder.authorLabel || '—'}</TableCell>
                                <TableCell className='min-w-[280px] max-w-[360px] text-sm text-muted-foreground'>
                                  {reminder.outcome || '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </LedgerTableCard>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value='collections'>
            <Card className='border-border/60'>
              <CardHeader className='gap-3 pb-4'>
                <CardTitle className='text-base'>Collections</CardTitle>
                <CardDescription className='max-w-3xl'>
                  Work the overdue queue without losing your place. Keep next action dates, recent
                  reminders, and outstanding balances visible while you move account to account.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3 md:grid-cols-4'>
                <InlineStat
                  label='Accounts in queue'
                  value={`${collectionsRows.length}`}
                  hint='Visible overdue or active follow-up accounts'
                />
                <InlineStat
                  label='Due now'
                  value={`${collectionsDueNowCount}`}
                  hint='Accounts that need a touch today or are missing a next action date'
                />
                <InlineStat
                  label='Promise to pay'
                  value={`${promiseToPayCount}`}
                  hint={`${promiseMissedCount} promise${promiseMissedCount === 1 ? '' : 's'} already missed the agreed date`}
                />
                <InlineStat
                  label='Escalated'
                  value={`${escalatedCollectionsCount}`}
                  hint='Accounts needing stronger intervention'
                />
              </CardContent>
            </Card>

            <Card className='overflow-hidden border-border/60'>
              <CardHeader className='gap-4'>
                <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                  <div>
                    <CardTitle>Daily collections runbook</CardTitle>
                    <CardDescription className='max-w-3xl'>
                      Use these priority lanes to decide where Accounts should focus next. Lanes can
                      overlap, so the same household may surface in more than one view when risk,
                      promises, and scheduling all need attention.
                    </CardDescription>
                  </div>
                </div>
                <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                  {collectionsRunbookSteps.map((step) => (
                    <CollectionsRunbookStepCard
                      key={step.id}
                      active={collectionsView === step.id}
                      step={step.step}
                      label={step.label}
                      count={step.count}
                      outstanding={currency(step.outstanding)}
                      hint={step.hint}
                      subhint={step.subhint}
                      lead={step.lead}
                      onClick={() => setCollectionsView(step.id)}
                    />
                  ))}
                </div>
              </CardHeader>
            </Card>

            <Card className='overflow-hidden border-border/60'>
              <CardHeader className='gap-4'>
                <div className='flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between'>
                  <div>
                    <CardTitle>Collections queue</CardTitle>
                    <CardDescription>{collectionsWorkbench.description}</CardDescription>
                  </div>
                  <Badge variant='outline' className='w-fit'>
                    {collectionsWorkbench.label} • {collectionsWorkbench.count}
                  </Badge>
                </div>
                <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                  <WorkbenchCard
                    active={collectionsView === 'all'}
                    label='All queue'
                    value={`${collectionsRows.length}`}
                    hint='Broad review across every overdue or active follow-up account.'
                    onClick={() => setCollectionsView('all')}
                  />
                  <WorkbenchCard
                    active={collectionsView === 'dueNow'}
                    label='Due now'
                    value={`${collectionsDueNowCount}`}
                    hint="Today's touch list, including missed follow-up dates and unscheduled active cases."
                    onClick={() => setCollectionsView('dueNow')}
                  />
                  <WorkbenchCard
                    active={collectionsView === 'promises'}
                    label='Promise to pay'
                    value={`${promiseToPayCount}`}
                    hint={`${promiseMissedCount} promise${promiseMissedCount === 1 ? '' : 's'} already slipped past the agreed date.`}
                    onClick={() => setCollectionsView('promises')}
                  />
                  <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-1'>
                    <WorkbenchCard
                      active={collectionsView === 'escalated'}
                      label='Escalated'
                      value={`${escalatedCollectionsCount}`}
                      hint='Higher-risk accounts that need stronger intervention or a lead decision.'
                      onClick={() => setCollectionsView('escalated')}
                    />
                    <WorkbenchCard
                      active={collectionsView === 'unplanned'}
                      label='Needs scheduling'
                      value={`${unplannedCollectionsCount}`}
                      hint='Active follow-up accounts still missing a next action date.'
                      onClick={() => setCollectionsView('unplanned')}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {collectionsWorkbench.rows.length === 0 ? (
                  <LedgerEmpty
                    title={collectionsWorkbench.emptyTitle}
                    description={collectionsWorkbench.emptyDescription}
                  />
                ) : (
                  <FinanceCollectionsGrid
                    key={collectionsView}
                    rows={collectionsWorkbench.rows}
                    allRows={allProfileRows}
                    hasFinanceWriteAccess={hasFinanceWriteAccess}
                    onRecordPayment={(row) => {
                      setSelectedCollectionRow(row);
                      setCollectionPaymentSheetOpen(true);
                    }}
                    onLogReminder={(row) => {
                      setSelectedCollectionRow(row);
                      setCollectionReminderSheetOpen(true);
                    }}
                    onLogBulkReminders={(selectedRows) => {
                      setBulkReminderMode('default');
                      setSelectedCollectionBatch(selectedRows);
                      setBulkReminderSheetOpen(true);
                    }}
                    onScheduleBulkFollowUp={(selectedRows) => {
                      setBulkReminderMode('schedule');
                      setSelectedCollectionBatch(selectedRows);
                      setBulkReminderSheetOpen(true);
                    }}
                    onMarkBulkPromiseToPay={(selectedRows) => {
                      setBulkReminderMode('promise');
                      setSelectedCollectionBatch(selectedRows);
                      setBulkReminderSheetOpen(true);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <FinanceProfileSheet
          open={profileSheetOpen}
          onOpenChange={setProfileSheetOpen}
          onSaved={() => setProfileSheetOpen(false)}
        />
        <FinanceBillingRunSheet
          open={billingRunSheetOpen}
          onOpenChange={setBillingRunSheetOpen}
          onSaved={() => setBillingRunSheetOpen(false)}
        />
        <FinanceFamilyPaymentSheet
          open={familyPaymentSheetOpen}
          onOpenChange={(open) => {
            setFamilyPaymentSheetOpen(open);
            if (!open) {
              setSelectedFamilyAccountId(null);
            }
          }}
          familyAccount={selectedFamilyAccount}
          onSaved={() => {
            setFamilyPaymentSheetOpen(false);
            setSelectedFamilyAccountId(null);
          }}
        />
        <FinanceBulkReminderSheet
          open={bulkReminderSheetOpen}
          onOpenChange={(open) => {
            setBulkReminderSheetOpen(open);
            if (!open) {
              setBulkReminderMode('default');
              setSelectedCollectionBatch([]);
            }
          }}
          billingProfileIds={selectedCollectionBatch.map((row) => row.profileId)}
          selectedStudents={selectedCollectionBatch.map((row) => ({
            profileId: row.profileId,
            studentName: row.studentName,
            className: row.className,
            familyLabel: row.familyLabel,
            collectionStage: row.collectionStage,
            nextActionDate: row.nextActionDate
          }))}
          mode={bulkReminderMode}
          onSaved={() => {
            setBulkReminderSheetOpen(false);
            setBulkReminderMode('default');
            setSelectedCollectionBatch([]);
          }}
        />
        <FinancePaymentSheet
          open={collectionPaymentSheetOpen}
          onOpenChange={(open) => {
            setCollectionPaymentSheetOpen(open);
            if (!open) {
              setSelectedCollectionRow(null);
            }
          }}
          billingProfileId={selectedCollectionRow?.profileId ?? null}
          onSaved={() => {
            setCollectionPaymentSheetOpen(false);
            setSelectedCollectionRow(null);
          }}
        />
        <FinanceReminderSheet
          open={collectionReminderSheetOpen}
          onOpenChange={(open) => {
            setCollectionReminderSheetOpen(open);
            if (!open) {
              setSelectedCollectionRow(null);
            }
          }}
          billingProfileId={selectedCollectionRow?.profileId ?? null}
          initialCollectionStage={selectedCollectionRow?.collectionStage}
          initialReminderChannel={selectedCollectionRow?.reminderChannel}
          initialNextActionDate={selectedCollectionRow?.nextActionDate ?? ''}
          onSaved={() => {
            setCollectionReminderSheetOpen(false);
            setSelectedCollectionRow(null);
          }}
        />
      </div>
    </FinanceAccessGate>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className='border-border/60'>
      <CardContent className='space-y-2 p-4'>
        <div className='text-sm text-muted-foreground'>{label}</div>
        <div className='text-2xl font-semibold tracking-tight tabular-nums'>{value}</div>
        <div className='text-xs leading-5 text-muted-foreground'>{detail}</div>
      </CardContent>
    </Card>
  );
}

function InlineStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className='rounded-xl border border-border/60 bg-muted/10 p-4'>
      <div className='text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground'>
        {label}
      </div>
      <div className='mt-2 text-2xl font-semibold tracking-tight tabular-nums'>{value}</div>
      <div className='mt-1 text-sm leading-5 text-muted-foreground'>{hint}</div>
    </div>
  );
}

function CollectionsRunbookStepCard({
  active,
  step,
  label,
  count,
  outstanding,
  hint,
  subhint,
  lead,
  onClick
}: {
  active: boolean;
  step: string;
  label: string;
  count: number;
  outstanding: string;
  hint: string;
  subhint: string;
  lead: string;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-colors ${
        active
          ? 'border-foreground/30 bg-foreground/[0.04] shadow-sm'
          : 'border-border/60 bg-muted/10 hover:border-foreground/20 hover:bg-muted/20'
      }`}
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground'>
          {step}
        </div>
        <Badge variant={active ? 'default' : 'outline'}>
          {count} account{count === 1 ? '' : 's'}
        </Badge>
      </div>
      <div className='mt-3 text-base font-semibold text-foreground'>{label}</div>
      <div className='mt-1 text-2xl font-semibold tracking-tight tabular-nums'>{outstanding}</div>
      <div className='mt-1 text-sm leading-5 text-muted-foreground'>{hint}</div>
      <div className='mt-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground'>
        {subhint}
      </div>
      <div className='mt-2 rounded-lg border border-border/60 bg-background/80 p-3 text-sm leading-6 text-muted-foreground'>
        {lead}
      </div>
    </button>
  );
}

function WorkbenchCard({
  active,
  label,
  value,
  hint,
  onClick
}: {
  active: boolean;
  label: string;
  value: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-colors ${
        active
          ? 'border-foreground/30 bg-foreground/[0.04] shadow-sm'
          : 'border-border/60 bg-muted/10 hover:border-foreground/20 hover:bg-muted/20'
      }`}
    >
      <div className='text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground'>
        {label}
      </div>
      <div className='mt-2 text-2xl font-semibold tracking-tight tabular-nums'>{value}</div>
      <div className='mt-1 text-sm leading-5 text-muted-foreground'>{hint}</div>
    </button>
  );
}

function LedgerTableCard({ children }: { children: React.ReactNode }) {
  return <div className='overflow-x-auto rounded-xl border border-border/60'>{children}</div>;
}

function LedgerEmpty({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className='rounded-xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground'>
      <div className='font-medium text-foreground'>{title}</div>
      <div className='mt-1 max-w-2xl leading-6'>{description}</div>
      {action ? <div className='mt-4'>{action}</div> : null}
    </div>
  );
}
