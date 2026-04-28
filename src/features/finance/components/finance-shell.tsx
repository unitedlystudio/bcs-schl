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
import { FinanceCollectionsGrid } from './finance-collections-grid';
import { FinanceFamilyAccountsGrid } from './finance-family-accounts-grid';
import { FinanceProfileSheet } from './finance-profile-sheet';
import { FinanceFamilyPaymentSheet } from './finance-record-sheets';
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

export default function FinanceShell() {
  const { hasFinanceAccess, hasFinanceWriteAccess } = useFinanceAccess();
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [billingRunSheetOpen, setBillingRunSheetOpen] = useState(false);
  const [familyPaymentSheetOpen, setFamilyPaymentSheetOpen] = useState(false);
  const [selectedFamilyAccountId, setSelectedFamilyAccountId] = useState<string | null>(null);
  const summary = useQuery(api.finance.summary, hasFinanceAccess ? {} : 'skip');
  const profilesQuery = useQuery(api.finance.list, hasFinanceAccess ? {} : 'skip');
  const familyAccounts = useQuery(
    api.finance.familyAccountsOverview,
    hasFinanceAccess ? {} : 'skip'
  );
  const ledgerActivity = useQuery(
    api.finance.ledgerActivity,
    hasFinanceAccess ? { limit: 16 } : 'skip'
  );

  const rows = useMemo(
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
      [...rows]
        .filter((row) => row.billingStatus === 'Overdue' || row.totalOutstanding > 0)
        .sort((left, right) => {
          if (right.totalOutstanding !== left.totalOutstanding) {
            return right.totalOutstanding - left.totalOutstanding;
          }
          return left.nextActionDate.localeCompare(right.nextActionDate);
        }),
    [rows]
  );

  const paymentPlanCount = useMemo(
    () => rows.filter((row) => row.paymentPlan.trim().length > 0).length,
    [rows]
  );
  const monthlyRunRate = useMemo(
    () => rows.reduce((sum, row) => sum + row.effectiveMonthlyFee, 0),
    [rows]
  );
  const accountsNeedingAction = collectionsRows.length;
  const selectedFamilyAccount = useMemo(
    () => (familyAccounts ?? []).find((account) => account.id === selectedFamilyAccountId) ?? null,
    [familyAccounts, selectedFamilyAccountId]
  );

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
                  value={`${rows.length}`}
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
                    {rows.length === 0 ? (
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
                        rows={rows}
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
                  Review school-wide finance activity in one lane, then switch between charges and
                  payments without leaving the page.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3 md:grid-cols-3'>
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
                  label='Reminder queue'
                  value={`${summary.reminderQueuedProfiles}`}
                  hint='Accounts waiting on outreach or follow-up'
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
              <CardContent className='grid gap-3 md:grid-cols-3'>
                <InlineStat
                  label='Accounts in queue'
                  value={`${collectionsRows.length}`}
                  hint='Visible overdue or active follow-up accounts'
                />
                <InlineStat
                  label='Reminder queued'
                  value={`${summary.reminderQueuedProfiles}`}
                  hint='Accounts waiting on the next outreach step'
                />
                <InlineStat
                  label='Escalated'
                  value={`${summary.escalatedProfiles}`}
                  hint='Accounts needing stronger intervention'
                />
              </CardContent>
            </Card>

            <Card className='overflow-hidden border-border/60'>
              <CardHeader>
                <CardTitle>Collections queue</CardTitle>
                <CardDescription>
                  Use a queue for overdue and active follow-up accounts, then open each record in a
                  side drawer without losing your place.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {collectionsRows.length === 0 ? (
                  <LedgerEmpty
                    title='No overdue student accounts are visible right now.'
                    description='When balances become overdue or arrears are added, those accounts will surface here.'
                  />
                ) : (
                  <FinanceCollectionsGrid rows={collectionsRows} />
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
