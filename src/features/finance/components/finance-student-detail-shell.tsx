'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { FinanceAccessGate } from './finance-access-gate';
import { FinanceProfileSheet } from './finance-profile-sheet';
import {
  FinanceChargeSheet,
  FinancePaymentSettlementSheet,
  FinancePaymentSheet,
  FinanceReminderSheet
} from './finance-record-sheets';
import { useFinanceAccess } from '../hooks/use-finance-access';
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

function chargeVariant(status: 'Pending' | 'Paid' | 'Overdue' | 'Waived') {
  if (status === 'Overdue') return 'destructive' as const;
  if (status === 'Paid') return 'default' as const;
  if (status === 'Pending') return 'secondary' as const;
  return 'outline' as const;
}

export default function FinanceStudentDetailShell({ studentId }: { studentId: string }) {
  const { hasFinanceAccess, hasFinanceWriteAccess } = useFinanceAccess();
  const isMobile = useIsMobile();
  const student = useQuery(api.students.getById, { studentId: studentId as Id<'students'> });
  const financeProfile = useQuery(
    api.finance.getByStudentId,
    hasFinanceAccess ? { studentId: studentId as Id<'students'> } : 'skip'
  );
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [chargeSheetOpen, setChargeSheetOpen] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [paymentSettlementSheetOpen, setPaymentSettlementSheetOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const overdueCharges = useMemo(
    () =>
      financeProfile?.charges.filter(
        (charge) =>
          charge.status === 'Overdue' || (charge.status === 'Pending' && charge.dueDate < today)
      ) ?? [],
    [financeProfile?.charges, today]
  );
  const upcomingCharges = useMemo(
    () =>
      [...(financeProfile?.charges ?? [])]
        .filter((charge) => charge.status === 'Pending' && charge.dueDate >= today)
        .sort((left, right) => left.dueDate.localeCompare(right.dueDate)),
    [financeProfile?.charges, today]
  );
  const collectedToDate = useMemo(
    () => financeProfile?.payments.reduce((sum, payment) => sum + payment.amount, 0) ?? 0,
    [financeProfile?.payments]
  );
  const monthlyItemGroups = useMemo(() => {
    const charged =
      financeProfile?.billingItems.filter((item) => item.billingBehavior === 'Charged') ?? [];
    const included =
      financeProfile?.billingItems.filter((item) => item.billingBehavior === 'Included') ?? [];
    const available =
      financeProfile?.billingItems.filter((item) => item.billingBehavior === 'Available') ?? [];
    return { charged, included, available };
  }, [financeProfile?.billingItems]);
  const selectedPayment = useMemo(
    () => financeProfile?.payments.find((payment) => payment.id === selectedPaymentId) ?? null,
    [financeProfile?.payments, selectedPaymentId]
  );
  const chargesByBillingCycle = useMemo(() => {
    const charges = financeProfile?.charges ?? [];
    const groups = new Map<
      string,
      {
        label: string;
        cycleKey: string;
        totalAmount: number;
        outstandingAmount: number;
        charges: typeof charges;
      }
    >();

    for (const charge of charges) {
      const existing = groups.get(charge.billingCycleKey);
      if (existing) {
        existing.totalAmount += charge.amount;
        existing.outstandingAmount += charge.balanceRemaining;
        existing.charges.push(charge);
        continue;
      }

      groups.set(charge.billingCycleKey, {
        label: charge.billingCycleLabel,
        cycleKey: charge.billingCycleKey,
        totalAmount: charge.amount,
        outstandingAmount: charge.balanceRemaining,
        charges: [charge]
      });
    }

    // eslint-disable-next-line unicorn/no-array-sort
    return Array.from(groups.values()).sort((left, right) =>
      right.cycleKey.localeCompare(left.cycleKey)
    );
  }, [financeProfile?.charges]);

  if (!hasFinanceAccess) {
    return (
      <FinanceAccessGate>
        <div />
      </FinanceAccessGate>
    );
  }

  return (
    <FinanceAccessGate>
      {student === undefined ? (
        <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
          Loading student finance...
        </div>
      ) : !student ? (
        <Card>
          <CardContent className='flex flex-col items-start gap-4 p-6'>
            <div>
              <div className='font-medium'>Student not found.</div>
              <div className='mt-1 text-sm text-muted-foreground'>
                The requested student finance screen could not be opened.
              </div>
            </div>
            <Button asChild variant='outline'>
              <Link href='/dashboard/billing'>Back to Finance & Fees</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid min-w-0 max-w-full gap-4 overflow-x-hidden'>
          <Card className='overflow-hidden border-border/60'>
            <CardHeader className='gap-4 pb-4'>
              <div className='flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                <div className='min-w-0 space-y-2'>
                  <div className='flex min-w-0 flex-wrap items-center gap-2'>
                    <CardTitle className='min-w-0 break-words'>{student.fullName}</CardTitle>
                    <Badge variant='outline'>{student.className}</Badge>
                    {student.academicYear ? (
                      <Badge variant='outline'>{student.academicYear}</Badge>
                    ) : null}
                    <Badge variant={student.status === 'Active' ? 'default' : 'secondary'}>
                      {student.status}
                    </Badge>
                    {financeProfile ? (
                      <Badge variant={billingVariant(financeProfile.billingStatus)}>
                        {financeProfile.billingStatus}
                      </Badge>
                    ) : null}
                  </div>
                  <CardDescription>
                    Dedicated student finance screen for this child’s billing setup, family payment
                    history, outstanding balance, and upcoming finance operations.
                  </CardDescription>
                </div>
                <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end'>
                  <Button asChild variant='outline' className='w-full sm:w-auto'>
                    <Link href='/dashboard/billing'>Back to overview</Link>
                  </Button>
                  {hasFinanceWriteAccess ? (
                    isMobile ? (
                      <>
                        <Button
                          variant='outline'
                          className='w-full'
                          onClick={() => setProfileSheetOpen(true)}
                        >
                          {financeProfile ? 'Edit billing setup' : 'Create billing setup'}
                        </Button>
                        {financeProfile ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant='outline' className='w-full justify-between'>
                                More finance actions
                                <Icons.ellipsis className='h-4 w-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-56'>
                              <DropdownMenuItem onClick={() => setChargeSheetOpen(true)}>
                                Add charge
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setPaymentSheetOpen(true)}>
                                Record payment
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setReminderSheetOpen(true)}>
                                Log reminder
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Button variant='outline' onClick={() => setProfileSheetOpen(true)}>
                          {financeProfile ? 'Edit billing setup' : 'Create billing setup'}
                        </Button>
                        {financeProfile ? (
                          <>
                            <Button variant='outline' onClick={() => setChargeSheetOpen(true)}>
                              Add charge
                            </Button>
                            <Button variant='outline' onClick={() => setPaymentSheetOpen(true)}>
                              Record payment
                            </Button>
                            <Button variant='outline' onClick={() => setReminderSheetOpen(true)}>
                              Log reminder
                            </Button>
                          </>
                        ) : null}
                      </>
                    )
                  ) : null}
                </div>
              </div>
            </CardHeader>
          </Card>

          {!financeProfile ? (
            <Card>
              <CardContent className='flex flex-col items-start gap-4 p-6'>
                <div>
                  <div className='font-medium'>No finance profile yet for {student.fullName}.</div>
                  <div className='mt-1 text-sm text-muted-foreground'>
                    Create the billing setup first so tuition, plan items, charges, and payments can
                    be tracked per student.
                  </div>
                </div>
                {hasFinanceWriteAccess ? (
                  <Button onClick={() => setProfileSheetOpen(true)}>
                    Create student finance profile
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className='grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-6'>
                <MetricCard
                  label='Monthly total'
                  value={currency(financeProfile.effectiveMonthlyFee)}
                />
                <MetricCard label='Base tuition' value={currency(financeProfile.baseMonthlyFee)} />
                <MetricCard
                  label='Charged add-ons'
                  value={currency(financeProfile.billedAddOnMonthlyTotal)}
                />
                <MetricCard label='Outstanding' value={currency(financeProfile.totalOutstanding)} />
                <MetricCard label='Collected to date' value={currency(collectedToDate)} />
                <MetricCard
                  label='Next pending due'
                  value={upcomingCharges[0]?.dueDate || 'None'}
                  hint={
                    upcomingCharges[0]
                      ? `${upcomingCharges[0].title} • ${currency(upcomingCharges[0].amount)}`
                      : 'No pending charge queued'
                  }
                />
              </div>

              <Tabs defaultValue='summary' className='min-w-0 gap-4 overflow-x-hidden'>
                <div className='overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]'>
                  <TabsList className='inline-flex h-12 min-w-max items-center justify-start gap-1 rounded-xl p-1'>
                    <TabsTrigger value='summary' className='min-h-10 px-4'>
                      Summary
                    </TabsTrigger>
                    <TabsTrigger value='setup' className='min-h-10 px-4'>
                      Billing setup
                    </TabsTrigger>
                    <TabsTrigger value='charges' className='min-h-10 px-4'>
                      Charges
                    </TabsTrigger>
                    <TabsTrigger value='payments' className='min-h-10 px-4'>
                      Payments
                    </TabsTrigger>
                    <TabsTrigger value='follow-up' className='min-h-10 px-4'>
                      Follow-up
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value='summary' className='min-w-0'>
                  <div className='grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]'>
                    <Card className='border-border/60'>
                      <CardHeader>
                        <CardTitle>Student finance summary</CardTitle>
                        <CardDescription>
                          Monthly composition, current account posture, and the financial context
                          for this student.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className='grid min-w-0 gap-4'>
                        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5 min-w-0'>
                          <SummaryPill label='Status' value={financeProfile.billingStatus} />
                          <SummaryPill
                            label='Scholarship'
                            value={financeProfile.scholarshipType || 'None'}
                          />
                          <SummaryPill
                            label='Family account'
                            value={financeProfile.familyLabel || 'Not labelled yet'}
                          />
                          <SummaryPill
                            label='Linked students'
                            value={`${financeProfile.familyStudentCount}`}
                          />
                          <SummaryPill label='Collections' value={financeProfile.collectionStage} />
                          <SummaryPill label='Charges' value={`${financeProfile.charges.length}`} />
                        </div>
                        <Separator />
                        <div className='grid gap-4 lg:grid-cols-3 min-w-0'>
                          <MonthlyItemPanel
                            title='Charged monthly items'
                            items={monthlyItemGroups.charged.map((item) => ({
                              id: item.id,
                              label: item.label,
                              sublabel: item.category,
                              amount: item.monthlyAmount
                            }))}
                            emptyLabel='No charged recurring items yet.'
                          />
                          <MonthlyItemPanel
                            title='Included items'
                            items={monthlyItemGroups.included.map((item) => ({
                              id: item.id,
                              label: item.label,
                              sublabel: item.category,
                              amount: item.monthlyAmount
                            }))}
                            emptyLabel='No included plan items recorded.'
                          />
                          <MonthlyItemPanel
                            title='Available add-ons'
                            items={monthlyItemGroups.available.map((item) => ({
                              id: item.id,
                              label: item.label,
                              sublabel: item.category,
                              amount: item.monthlyAmount
                            }))}
                            emptyLabel='No optional add-ons recorded.'
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className='overflow-hidden border-border/60'>
                      <CardHeader>
                        <CardTitle>Upcoming finance operations</CardTitle>
                        <CardDescription>
                          What Accounts is likely to do next on this student account.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className='grid min-w-0 gap-3'>
                        {overdueCharges.length > 0 ? (
                          <OperationPanel
                            title='Overdue now'
                            tone='destructive'
                            items={overdueCharges.slice(0, 3).map((charge) => ({
                              id: charge.id,
                              title: charge.title,
                              meta: `${charge.dueDate} • ${currency(charge.amount)}`
                            }))}
                          />
                        ) : null}
                        <OperationPanel
                          title='Upcoming pending items'
                          items={upcomingCharges.slice(0, 4).map((charge) => ({
                            id: charge.id,
                            title: charge.title,
                            meta: `${charge.dueDate} • ${currency(charge.amount)}`
                          }))}
                          emptyLabel='No pending charges are scheduled right now.'
                        />
                        <OperationPanel
                          title='Recent payments'
                          items={financeProfile.payments.slice(0, 3).map((payment) => ({
                            id: payment.id,
                            title: currency(payment.amount),
                            meta: `${payment.paidAt} • ${payment.method}`
                          }))}
                          emptyLabel='No payment activity recorded yet.'
                        />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value='setup' className='min-w-0'>
                  <Card className='overflow-hidden border-border/60'>
                    <CardHeader>
                      <CardTitle>Billing setup</CardTitle>
                      <CardDescription>
                        Tuition, scholarship, add-ons, and collection terms that shape this
                        student’s monthly finance profile.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='grid min-w-0 gap-4'>
                      <div className='grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4'>
                        <SummaryPill
                          label='Base tuition'
                          value={currency(financeProfile.baseMonthlyFee)}
                        />
                        <SummaryPill
                          label='Custom tuition'
                          value={
                            financeProfile.customMonthlyFee
                              ? currency(financeProfile.customMonthlyFee)
                              : '—'
                          }
                        />
                        <SummaryPill
                          label='Scholarship %'
                          value={`${financeProfile.scholarshipPercent || 0}%`}
                        />
                        <SummaryPill
                          label='Charged add-ons'
                          value={currency(financeProfile.billedAddOnMonthlyTotal)}
                        />
                      </div>
                      <div className='grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4'>
                        <SummaryPill
                          label='Payment plan'
                          value={financeProfile.paymentPlan || 'No plan set'}
                        />
                        <SummaryPill
                          label='Family owner'
                          value={
                            financeProfile.familyAccount?.primaryGuardianName ||
                            financeProfile.familyPrimaryGuardianName ||
                            'Not set'
                          }
                        />
                        <SummaryPill
                          label='Reminder channel'
                          value={financeProfile.reminderChannel}
                        />
                        <SummaryPill
                          label='Next action'
                          value={financeProfile.nextActionDate || 'Not scheduled'}
                        />
                      </div>
                      <div className='overflow-hidden rounded-xl border border-border/60'>
                        <div className='w-full overflow-x-auto'>
                          <Table className='min-w-[640px]'>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Behavior</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead className='text-right'>Monthly amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {financeProfile.billingItems.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className='text-muted-foreground'>
                                    No recurring billing items configured yet.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                financeProfile.billingItems.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className='font-medium'>{item.label}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={
                                          item.billingBehavior === 'Charged'
                                            ? 'default'
                                            : 'secondary'
                                        }
                                      >
                                        {item.billingBehavior}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className='text-sm text-muted-foreground'>
                                      {item.notes || '—'}
                                    </TableCell>
                                    <TableCell className='text-right font-medium'>
                                      {currency(item.monthlyAmount)}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      <div className='rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground'>
                        {financeProfile.notesSummary || 'No finance notes recorded yet.'}
                      </div>
                      <div className='min-w-0 rounded-xl border border-border/60 p-4'>
                        <div className='text-sm font-medium'>Family account context</div>
                        {financeProfile.familyAccount ? (
                          <div className='mt-3 grid min-w-0 gap-3'>
                            <div className='min-w-0 break-words text-sm text-muted-foreground'>
                              {financeProfile.familyAccount.accountLabel} •{' '}
                              {financeProfile.familyAccount.primaryGuardianName ||
                                'No guardian set'}
                              {financeProfile.familyAccount.primaryGuardianPhone
                                ? ` • ${financeProfile.familyAccount.primaryGuardianPhone}`
                                : ''}
                            </div>
                            <div className='grid min-w-0 gap-3 md:grid-cols-3'>
                              <SummaryPill
                                label='Family outstanding'
                                value={currency(financeProfile.familyAccount.totalOutstanding)}
                              />
                              <SummaryPill
                                label='Family run rate'
                                value={currency(financeProfile.familyAccount.monthlyRunRate)}
                              />
                              <SummaryPill
                                label='Students in account'
                                value={`${financeProfile.familyAccount.studentCount}`}
                              />
                            </div>
                            {financeProfile.relatedProfiles.length > 0 ? (
                              <div className='overflow-hidden rounded-xl border border-border/60'>
                                <div className='w-full overflow-x-auto'>
                                  <Table className='min-w-[640px]'>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Linked student</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Next action</TableHead>
                                        <TableHead className='text-right'>Outstanding</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {financeProfile.relatedProfiles.map((member) => (
                                        <TableRow key={member.profileId}>
                                          <TableCell>
                                            <div className='font-medium'>{member.studentName}</div>
                                            <div className='text-xs text-muted-foreground'>
                                              {member.className}
                                              {member.academicYear
                                                ? ` • ${member.academicYear}`
                                                : ''}
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant={billingVariant(member.billingStatus)}>
                                              {member.billingStatus}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>{member.nextActionDate || '—'}</TableCell>
                                          <TableCell className='text-right font-medium'>
                                            {currency(member.totalOutstanding)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            ) : (
                              <div className='text-sm text-muted-foreground'>
                                No additional linked students in this family account yet.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className='mt-3 text-sm text-muted-foreground'>
                            This billing profile is still operating as a standalone student account.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value='charges' className='min-w-0'>
                  <Card className='overflow-hidden border-border/60'>
                    <CardHeader>
                      <CardTitle>Charge ledger</CardTitle>
                      <CardDescription>
                        One-off and recurring charges recorded against this student account, grouped
                        by billing cycle so Accounts can review each month or term as a ledger
                        batch.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='min-w-0'>
                      {financeProfile.charges.length === 0 ? (
                        <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                          No charges recorded yet.
                        </div>
                      ) : (
                        <div className='grid gap-4'>
                          {chargesByBillingCycle.map((cycleGroup) => (
                            <div
                              key={cycleGroup.cycleKey}
                              className='overflow-hidden rounded-xl border border-border/60'
                            >
                              <div className='border-b border-border/60 bg-muted/20 px-4 py-3'>
                                <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                                  <div>
                                    <div className='font-medium'>{cycleGroup.label}</div>
                                    <div className='text-xs text-muted-foreground'>
                                      {cycleGroup.charges.length} charge
                                      {cycleGroup.charges.length === 1 ? '' : 's'} in this cycle
                                    </div>
                                  </div>
                                  <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
                                    <span>Total {currency(cycleGroup.totalAmount)}</span>
                                    <span>
                                      Outstanding {currency(cycleGroup.outstandingAmount)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className='w-full overflow-x-auto'>
                                <Table className='min-w-[760px]'>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Charge</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Charged</TableHead>
                                      <TableHead>Due</TableHead>
                                      <TableHead className='text-right'>Amount</TableHead>
                                      <TableHead className='text-right'>Applied</TableHead>
                                      <TableHead className='text-right'>Remaining</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {cycleGroup.charges.map((charge) => (
                                      <TableRow key={charge.id}>
                                        <TableCell>
                                          <div className='font-medium'>{charge.title}</div>
                                          <div className='text-xs text-muted-foreground'>
                                            {charge.category}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className='flex flex-col gap-1'>
                                            <Badge variant={chargeVariant(charge.status)}>
                                              {charge.status}
                                            </Badge>
                                            <span className='text-muted-foreground text-xs'>
                                              {charge.settlementLabel}
                                            </span>
                                            <span className='text-muted-foreground text-xs'>
                                              {charge.applicationCount
                                                ? `${charge.applicationCount} payment match${charge.applicationCount === 1 ? '' : 'es'}`
                                                : 'No payment matches yet'}
                                            </span>
                                          </div>
                                        </TableCell>
                                        <TableCell>{charge.chargeDate}</TableCell>
                                        <TableCell>{charge.dueDate}</TableCell>
                                        <TableCell className='text-right font-medium'>
                                          {currency(charge.amount)}
                                        </TableCell>
                                        <TableCell className='text-right font-medium'>
                                          {currency(charge.appliedAmount)}
                                        </TableCell>
                                        <TableCell className='text-right font-medium'>
                                          {currency(charge.balanceRemaining)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value='payments' className='min-w-0'>
                  <Card className='overflow-hidden border-border/60'>
                    <CardHeader>
                      <CardTitle>Payment history</CardTitle>
                      <CardDescription>
                        Recorded incoming payments, explicit charge matches, and remaining credit on
                        this student account.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='min-w-0'>
                      {financeProfile.payments.length === 0 ? (
                        <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                          No payments recorded yet.
                        </div>
                      ) : (
                        <div className='overflow-hidden rounded-xl border border-border/60'>
                          <div className='w-full overflow-x-auto'>
                            <Table className='min-w-[900px]'>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Paid at</TableHead>
                                  <TableHead>Method</TableHead>
                                  <TableHead>Reference</TableHead>
                                  <TableHead>Settlement</TableHead>
                                  <TableHead className='text-right'>Amount</TableHead>
                                  <TableHead className='text-right'>Applied</TableHead>
                                  <TableHead className='text-right'>Unapplied</TableHead>
                                  {hasFinanceWriteAccess ? (
                                    <TableHead className='text-right'>Actions</TableHead>
                                  ) : null}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {financeProfile.payments.map((payment) => (
                                  <TableRow key={payment.id}>
                                    <TableCell>{payment.paidAt}</TableCell>
                                    <TableCell>
                                      <Badge variant='outline'>{payment.method}</Badge>
                                    </TableCell>
                                    <TableCell>{payment.reference || '—'}</TableCell>
                                    <TableCell className='max-w-[320px] text-sm text-muted-foreground'>
                                      <div>{payment.note || '—'}</div>
                                      <div className='mt-1 text-xs text-muted-foreground'>
                                        {payment.appliedChargeCount
                                          ? `${payment.settlementLabel} • ${payment.appliedChargeCount} charge${payment.appliedChargeCount === 1 ? '' : 's'} matched`
                                          : 'Unapplied credit on account'}
                                      </div>
                                      {payment.applications.length > 0 ? (
                                        <div className='mt-2 space-y-1 text-xs text-muted-foreground'>
                                          {payment.applications.map((application) => (
                                            <div key={application.chargeId}>
                                              {application.chargeTitle} •{' '}
                                              {currency(application.amount)}
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                    </TableCell>
                                    <TableCell className='text-right font-medium'>
                                      {currency(payment.amount)}
                                    </TableCell>
                                    <TableCell className='text-right font-medium'>
                                      {currency(payment.appliedAmount)}
                                    </TableCell>
                                    <TableCell className='text-right font-medium'>
                                      {currency(payment.unappliedAmount)}
                                    </TableCell>
                                    {hasFinanceWriteAccess ? (
                                      <TableCell className='text-right'>
                                        <Button
                                          variant='outline'
                                          size='sm'
                                          onClick={() => {
                                            setSelectedPaymentId(payment.id);
                                            setPaymentSettlementSheetOpen(true);
                                          }}
                                        >
                                          Settle payment
                                        </Button>
                                      </TableCell>
                                    ) : null}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value='follow-up' className='min-w-0'>
                  <Card className='overflow-hidden border-border/60'>
                    <CardHeader>
                      <CardTitle>Follow-up & collections</CardTitle>
                      <CardDescription>
                        Keep family contact context, arrears posture, and next action cues together.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'>
                      <div className='grid min-w-0 gap-4'>
                        <div className='rounded-xl border border-border/60 bg-muted/20 p-4 text-sm'>
                          <div className='text-xs uppercase tracking-[0.12em] text-muted-foreground'>
                            Current finance notes
                          </div>
                          <div className='mt-3 text-sm text-muted-foreground'>
                            {financeProfile.notesSummary || 'No finance notes recorded yet.'}
                          </div>
                        </div>
                        <div className='overflow-hidden rounded-xl border border-border/60'>
                          <div className='w-full overflow-x-auto'>
                            <Table className='min-w-[640px]'>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Follow-up focus</TableHead>
                                  <TableHead>Value</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell className='font-medium'>Guardian</TableCell>
                                  <TableCell>{student.guardianName || '—'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className='font-medium'>Guardian phone</TableCell>
                                  <TableCell>{student.guardianPhone || '—'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className='font-medium'>Family / account</TableCell>
                                  <TableCell>
                                    {financeProfile.familyLabel || 'Not labelled yet'}
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className='font-medium'>Primary guardian</TableCell>
                                  <TableCell>
                                    {financeProfile.familyAccount?.primaryGuardianName ||
                                      financeProfile.familyPrimaryGuardianName ||
                                      '—'}
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className='font-medium'>Guardian phone</TableCell>
                                  <TableCell>
                                    {financeProfile.familyAccount?.primaryGuardianPhone ||
                                      financeProfile.familyPrimaryGuardianPhone ||
                                      '—'}
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className='font-medium'>Payment plan</TableCell>
                                  <TableCell>
                                    {financeProfile.paymentPlan || 'No plan set'}
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className='font-medium'>Collections stage</TableCell>
                                  <TableCell>{financeProfile.collectionStage}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className='font-medium'>Reminder channel</TableCell>
                                  <TableCell>{financeProfile.reminderChannel}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className='font-medium'>Last reminder</TableCell>
                                  <TableCell>
                                    {financeProfile.lastReminderDate || 'Not sent yet'}
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className='font-medium'>Overdue items</TableCell>
                                  <TableCell>{overdueCharges.length}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className='font-medium'>Next upcoming due</TableCell>
                                  <TableCell>
                                    {upcomingCharges[0]?.dueDate || 'None scheduled'}
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className='font-medium'>Next action date</TableCell>
                                  <TableCell>
                                    {financeProfile.nextActionDate || 'Not scheduled'}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                        <div className='overflow-hidden rounded-xl border border-border/60'>
                          <div className='w-full overflow-x-auto'>
                            <Table className='min-w-[720px]'>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Reminder date</TableHead>
                                  <TableHead>Channel</TableHead>
                                  <TableHead>Collections stage</TableHead>
                                  <TableHead>Outcome</TableHead>
                                  <TableHead>Next action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {financeProfile.reminders.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={5} className='text-muted-foreground'>
                                      No reminder timeline yet. Log the first outreach touch from
                                      the finance actions above.
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  financeProfile.reminders.map((reminder) => (
                                    <TableRow key={reminder.id}>
                                      <TableCell>
                                        <div className='font-medium'>{reminder.reminderDate}</div>
                                        <div className='text-xs text-muted-foreground'>
                                          {reminder.authorLabel}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant='outline'>{reminder.channel}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={
                                            reminder.collectionStage === 'Escalated'
                                              ? 'destructive'
                                              : 'secondary'
                                          }
                                        >
                                          {reminder.collectionStage}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className='max-w-[320px] text-sm text-muted-foreground'>
                                        {reminder.outcome}
                                      </TableCell>
                                      <TableCell>{reminder.nextActionDate || '—'}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                      <div className='rounded-xl border border-border/60 p-4'>
                        <div className='text-sm font-medium'>Collections posture</div>
                        <div className='mt-3 grid gap-2 text-sm text-muted-foreground'>
                          <div>Status: {financeProfile.billingStatus}</div>
                          <div>Collections stage: {financeProfile.collectionStage}</div>
                          <div>Outstanding: {currency(financeProfile.totalOutstanding)}</div>
                          <div>Arrears balance: {currency(financeProfile.arrearsBalance)}</div>
                          <div>Reminder channel: {financeProfile.reminderChannel}</div>
                          <div>
                            Last reminder: {financeProfile.lastReminderDate || 'Not sent yet'}
                          </div>
                          <div>
                            Next action date: {financeProfile.nextActionDate || 'Not scheduled'}
                          </div>
                          <div>
                            Reminder touches logged: {financeProfile.reminderCount}
                            {financeProfile.recentReminderDate
                              ? ` • latest ${financeProfile.recentReminderDate}`
                              : ''}
                          </div>
                          <div>
                            Recommended next action:{' '}
                            {financeProfile.collectionStage === 'Escalated'
                              ? 'Escalate to admin/accounts lead and confirm a recovery decision.'
                              : financeProfile.collectionStage === 'Promise to pay'
                                ? 'Monitor promised payment date and follow up if the payment misses.'
                                : overdueCharges.length > 0
                                  ? 'Issue or confirm the next family reminder and review the payment-plan path.'
                                  : upcomingCharges.length > 0
                                    ? 'Prepare the next billed item and monitor the due date.'
                                    : 'No immediate collections action required.'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}

          <FinanceProfileSheet
            open={profileSheetOpen}
            onOpenChange={setProfileSheetOpen}
            billingProfileId={financeProfile?.id}
            defaultStudentId={student.id}
          />
          <FinanceChargeSheet
            open={chargeSheetOpen}
            onOpenChange={setChargeSheetOpen}
            billingProfileId={financeProfile?.id ?? null}
          />
          <FinancePaymentSheet
            open={paymentSheetOpen}
            onOpenChange={setPaymentSheetOpen}
            billingProfileId={financeProfile?.id ?? null}
          />
          <FinancePaymentSettlementSheet
            open={paymentSettlementSheetOpen}
            onOpenChange={setPaymentSettlementSheetOpen}
            payment={selectedPayment}
            charges={financeProfile?.charges ?? []}
          />
          <FinanceReminderSheet
            open={reminderSheetOpen}
            onOpenChange={setReminderSheetOpen}
            billingProfileId={financeProfile?.id ?? null}
            initialCollectionStage={financeProfile?.collectionStage}
            initialReminderChannel={financeProfile?.reminderChannel}
            initialNextActionDate={financeProfile?.nextActionDate ?? ''}
          />
        </div>
      )}
    </FinanceAccessGate>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className='min-w-0 border-border/60'>
      <CardHeader className='min-w-0 pb-2'>
        <CardDescription className='break-words'>{label}</CardDescription>
        <CardTitle className='min-w-0 break-words text-2xl'>{value}</CardTitle>
        {hint ? <div className='break-words text-xs text-muted-foreground'>{hint}</div> : null}
      </CardHeader>
    </Card>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className='min-w-0 rounded-xl border border-border/60 p-4'>
      <div className='text-[11px] uppercase tracking-[0.12em] text-muted-foreground'>{label}</div>
      <div className='mt-2 min-w-0 break-words font-medium'>{value}</div>
    </div>
  );
}

function MonthlyItemPanel({
  title,
  items,
  emptyLabel
}: {
  title: string;
  items: Array<{ id: string; label: string; sublabel: string; amount: number }>;
  emptyLabel: string;
}) {
  return (
    <div className='min-w-0 rounded-xl border border-border/60 p-4'>
      <div className='break-words text-sm font-medium'>{title}</div>
      <div className='mt-3 grid gap-3'>
        {items.length === 0 ? (
          <div className='break-words text-sm text-muted-foreground'>{emptyLabel}</div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3'
            >
              <div className='min-w-0'>
                <div className='break-words font-medium'>{item.label}</div>
                <div className='break-words text-xs text-muted-foreground'>{item.sublabel}</div>
              </div>
              <div className='shrink-0 text-sm font-medium'>{currency(item.amount)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function OperationPanel({
  title,
  items,
  emptyLabel,
  tone = 'default'
}: {
  title: string;
  items: Array<{ id: string; title: string; meta: string }>;
  emptyLabel?: string;
  tone?: 'default' | 'destructive';
}) {
  return (
    <div
      className={
        tone === 'destructive'
          ? 'min-w-0 rounded-xl border border-destructive/40 bg-destructive/5 p-4'
          : 'min-w-0 rounded-xl border border-border/60 p-4'
      }
    >
      <div className='break-words text-sm font-medium'>{title}</div>
      <div className='mt-3 grid gap-3'>
        {items.length === 0 ? (
          <div className='break-words text-sm text-muted-foreground'>
            {emptyLabel || 'Nothing to show.'}
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className='min-w-0'>
              <div className='break-words font-medium'>{item.title}</div>
              <div className='break-words text-xs text-muted-foreground'>{item.meta}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
