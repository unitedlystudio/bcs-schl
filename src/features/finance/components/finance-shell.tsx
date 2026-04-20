'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';

import { api } from '../../../../convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { FinanceProfileSheet } from './finance-profile-sheet';
import { useFinanceAccess } from '../hooks/use-finance-access';

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

function chargeVariant(status: 'Pending' | 'Paid' | 'Overdue' | 'Waived') {
  if (status === 'Overdue') return 'destructive' as const;
  if (status === 'Paid') return 'default' as const;
  if (status === 'Pending') return 'secondary' as const;
  return 'outline' as const;
}

export default function FinanceShell() {
  const { hasFinanceAccess, hasFinanceWriteAccess } = useFinanceAccess();
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
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
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Loading finance workflow...
      </div>
    );
  }

  return (
    <FinanceAccessGate>
      <div className='flex flex-1 flex-col gap-4'>
        <Card className='border-border/60'>
          <CardHeader className='gap-4 pb-4'>
            <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
              <div className='space-y-3'>
                <div className='space-y-1'>
                  <CardTitle>Finance & Fees</CardTitle>
                  <CardDescription>
                    Run finance as a school-wide operations surface first, then open a dedicated
                    student finance screen for each child’s billing setup, history, collections
                    posture, and next actions.
                  </CardDescription>
                </div>
                <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
                  <Badge variant='outline'>200+ student ready</Badge>
                  <Badge variant='outline'>Per-student finance detail</Badge>
                  <Badge variant='outline'>Accounts-only workflow</Badge>
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                {hasFinanceWriteAccess ? (
                  <Button variant='outline' onClick={() => setProfileSheetOpen(true)}>
                    Add billing profile
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className='grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]'>
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
              <MetricCard
                label='Profiles'
                value={`${summary.profiles}`}
                hint='Student accounts with billing setup'
              />
              <MetricCard
                label='Family accounts'
                value={`${summary.familyAccounts}`}
                hint='Linked household billing groups'
              />
              <MetricCard
                label='Monthly run rate'
                value={currency(monthlyRunRate)}
                hint='Current recurring tuition + charged add-ons'
              />
              <MetricCard
                label='Outstanding'
                value={currency(summary.totalOutstanding)}
                hint='Open balances including arrears'
              />
              <MetricCard
                label='Collected this month'
                value={currency(summary.collectedThisMonth)}
                hint='Recorded incoming payments this month'
              />
              <MetricCard
                label='On payment plans'
                value={`${paymentPlanCount}`}
                hint='Families with structured payment terms'
              />
              <MetricCard
                label='Reminder queued'
                value={`${summary.reminderQueuedProfiles}`}
                hint='Accounts queued for reminder outreach'
              />
              <MetricCard
                label='Escalated'
                value={`${summary.escalatedProfiles}`}
                hint='Accounts needing stronger intervention'
              />
            </div>
            <div className='rounded-2xl border border-border/60 bg-muted/20 p-4'>
              <div className='text-sm font-medium'>Spreadsheet-informed workspace split</div>
              <div className='mt-2 text-sm text-muted-foreground'>
                The finance spreadsheet research points to four real work lanes instead of one giant
                fee table: student billing setup, charge ledger, payment intake, and collections.
              </div>
              <Separator className='my-4' />
              <div className='grid gap-2 text-sm text-muted-foreground'>
                <div>Student billing keeps the school-wide browse view.</div>
                <div>Charges groups school-issued tuition, registration, lunch, and extras.</div>
                <div>Payments keeps incoming money and references in one place.</div>
                <div>Collections isolates overdue families and follow-up workload.</div>
                <div>Families groups linked siblings under one billing account owner.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue='student-billing' className='gap-4'>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <div className='text-base font-semibold'>Finance workspace</div>
              <div className='text-sm text-muted-foreground'>
                Browse students on desktop, scan the same workflow on mobile, and move into the
                dedicated student finance screen when you need the full story.
              </div>
            </div>
            <TabsList className='flex h-auto flex-wrap justify-start'>
              <TabsTrigger value='student-billing'>Student billing</TabsTrigger>
              <TabsTrigger value='charges-ledger'>Charges</TabsTrigger>
              <TabsTrigger value='payments-ledger'>Payments</TabsTrigger>
              <TabsTrigger value='collections'>Collections</TabsTrigger>
              <TabsTrigger value='family-accounts'>Families</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='student-billing'>
            {rows.length === 0 ? (
              <Card>
                <CardContent className='flex flex-col items-start gap-4 p-6'>
                  <div>
                    <div className='font-medium'>No student finance profiles yet.</div>
                    <div className='mt-1 text-sm text-muted-foreground'>
                      Create the first billing profile so tuition, lunch plans, extra lessons, and
                      ledger activity can be tracked per student.
                    </div>
                  </div>
                  {hasFinanceWriteAccess ? (
                    <Button onClick={() => setProfileSheetOpen(true)}>
                      Add first billing profile
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <FinanceOverviewGrid
                rows={rows}
                onAddProfile={() => setProfileSheetOpen(true)}
                canManageProfiles={hasFinanceWriteAccess}
              />
            )}
          </TabsContent>

          <TabsContent value='charges-ledger'>
            <Card className='border-border/60'>
              <CardHeader>
                <CardTitle>School charge ledger</CardTitle>
                <CardDescription>
                  Recent charges across the school. Open a student to inspect or add full charge
                  detail.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ledgerActivity.charges.length === 0 ? (
                  <LedgerEmpty
                    title='No charges recorded yet.'
                    description='Once tuition, registration, lunch, or extra activity charges are logged, they will appear here.'
                  />
                ) : (
                  <div className='overflow-hidden rounded-xl border border-border/60'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Charge</TableHead>
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
                              <div className='text-xs text-muted-foreground'>{charge.category}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={chargeVariant(charge.status)}>{charge.status}</Badge>
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='payments-ledger'>
            <Card className='border-border/60'>
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
                  <div className='overflow-hidden rounded-xl border border-border/60'>
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='collections'>
            <Card className='border-border/60'>
              <CardHeader>
                <CardTitle>Collections queue</CardTitle>
                <CardDescription>
                  Focus this view on students needing reminder calls, payment-plan review, or direct
                  collection follow-up.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3'>
                {collectionsRows.length === 0 ? (
                  <LedgerEmpty
                    title='No overdue student accounts are visible right now.'
                    description='When balances become overdue or arrears are added, those accounts will surface here.'
                  />
                ) : (
                  collectionsRows.map((row) => (
                    <div key={row.profileId} className='rounded-xl border border-border/60 p-4'>
                      <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                        <div className='space-y-2'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <div className='font-medium'>{row.studentName}</div>
                            <Badge variant='outline'>{row.className}</Badge>
                            {row.academicYear ? (
                              <Badge variant='outline'>{row.academicYear}</Badge>
                            ) : null}
                            <Badge variant={billingVariant(row.billingStatus)}>
                              {row.billingStatus}
                            </Badge>
                          </div>
                          <div className='text-sm text-muted-foreground'>
                            Outstanding {currency(row.totalOutstanding)} • Monthly total{' '}
                            {currency(row.effectiveMonthlyFee)}
                          </div>
                          <div className='text-sm text-muted-foreground'>
                            {row.familyLabel || 'No family/account label'} •{' '}
                            {row.paymentPlan || 'No payment plan set'}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {row.collectionStage} via {row.reminderChannel}
                            {row.nextActionDate ? ` • next action ${row.nextActionDate}` : ''}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {row.recentReminderDate
                              ? `Latest reminder ${row.recentReminderDate} • ${row.recentReminderOutcome}`
                              : 'No reminder history logged yet'}
                            {row.reminderCount ? ` • ${row.reminderCount} touches logged` : ''}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            Last payment {row.recentPaymentDate || 'not recorded'}
                            {row.recentPaymentAmount
                              ? ` • ${currency(row.recentPaymentAmount)}`
                              : ''}
                          </div>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          <Button asChild variant='outline' size='sm'>
                            <Link href={`/dashboard/billing/${row.studentId}`}>
                              Open student finance
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='family-accounts'>
            <Card className='border-border/60'>
              <CardHeader>
                <CardTitle>Family accounts</CardTitle>
                <CardDescription>
                  Group siblings and shared payers under one household account so Accounts can scan
                  guardian ownership, combined outstanding, and next actions.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3'>
                {familyAccounts.length === 0 ? (
                  <LedgerEmpty
                    title='No linked family accounts yet.'
                    description='As soon as billing profiles share a family label, those students will appear here as one household account.'
                  />
                ) : (
                  familyAccounts.map((account) => (
                    <div key={account.id} className='rounded-xl border border-border/60 p-4'>
                      <div className='flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between'>
                        <div className='space-y-2'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <div className='font-medium'>{account.accountLabel}</div>
                            <Badge variant='outline'>{account.studentCount} students</Badge>
                            <Badge
                              variant={
                                account.collectionStage === 'Escalated'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {account.collectionStage}
                            </Badge>
                          </div>
                          <div className='text-sm text-muted-foreground'>
                            {account.primaryGuardianName || 'No guardian set'}
                            {account.primaryGuardianPhone
                              ? ` • ${account.primaryGuardianPhone}`
                              : ''}
                          </div>
                          <div className='text-sm text-muted-foreground'>
                            Monthly run rate {currency(account.monthlyRunRate)} • Outstanding{' '}
                            {currency(account.totalOutstanding)}
                            {account.nextActionDate
                              ? ` • next action ${account.nextActionDate}`
                              : ''}
                          </div>
                          <div className='grid gap-2 pt-1'>
                            {account.members.map((member) => (
                              <div
                                key={member.profileId}
                                className='rounded-lg border border-border/50 bg-muted/15 px-3 py-2 text-sm'
                              >
                                <div className='flex flex-wrap items-center gap-2'>
                                  <span className='font-medium'>{member.studentName}</span>
                                  <span className='text-muted-foreground'>
                                    {member.className}
                                    {member.academicYear ? ` • ${member.academicYear}` : ''}
                                  </span>
                                  <Badge variant={billingVariant(member.billingStatus)}>
                                    {member.billingStatus}
                                  </Badge>
                                </div>
                                <div className='mt-1 text-xs text-muted-foreground'>
                                  Outstanding {currency(member.totalOutstanding)} • Monthly total{' '}
                                  {currency(member.effectiveMonthlyFee)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          {account.members.slice(0, 2).map((member) => (
                            <Button key={member.profileId} asChild variant='outline' size='sm'>
                              <Link href={`/dashboard/billing/${member.studentId}`}>
                                Open {member.studentName.split(' ')[0]}
                              </Link>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
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
      </div>
    </FinanceAccessGate>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className='border-border/60'>
      <CardHeader className='pb-2'>
        <CardDescription>{label}</CardDescription>
        <CardTitle className='text-2xl'>{value}</CardTitle>
        {hint ? <div className='text-xs text-muted-foreground'>{hint}</div> : null}
      </CardHeader>
    </Card>
  );
}

function LedgerEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
      <div className='font-medium text-foreground'>{title}</div>
      <div className='mt-1'>{description}</div>
    </div>
  );
}
