'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
import { FinanceProfileSheet } from './finance-profile-sheet';
import { FinanceChargeSheet, FinancePaymentSheet } from './finance-record-sheets';

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
  const [search, setSearch] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [chargeSheetOpen, setChargeSheetOpen] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);

  const searchArgs = search.trim() ? { search } : {};
  const summary = useQuery(api.finance.summary, {});
  const profilesQuery = useQuery(api.finance.list, searchArgs);
  const profiles = useMemo(() => profilesQuery ?? [], [profilesQuery]);

  useEffect(() => {
    if (!selectedProfileId && profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  useEffect(() => {
    if (selectedProfileId && !profiles.some((profile) => profile.id === selectedProfileId)) {
      setSelectedProfileId(profiles[0]?.id ?? null);
    }
  }, [profiles, selectedProfileId]);

  const selectedProfile = useQuery(
    api.finance.getByProfileId,
    selectedProfileId
      ? { billingProfileId: selectedProfileId as Id<'studentBillingProfiles'> }
      : 'skip'
  );

  const hasSearch = search.trim().length > 0;
  const overdueShare =
    summary && summary.profiles > 0
      ? Math.round((summary.overdueProfiles / summary.profiles) * 100)
      : 0;

  if (!summary || profilesQuery === undefined) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Loading finance workflow...
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <Card className='border-border/60'>
        <CardHeader className='gap-4 pb-4'>
          <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
            <div className='space-y-1'>
              <CardTitle>Finance & fees</CardTitle>
              <CardDescription>
                Keep billing rules, arrears, scholarships, charges, and payments visible without
                bloating the student directory.
              </CardDescription>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                onClick={() => {
                  setSelectedProfileId(null);
                  setProfileSheetOpen(true);
                }}
              >
                Add billing profile
              </Button>
            </div>
          </div>
          <div className='grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]'>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search student, class, year, status, scholarship, plan, or notes'
            />
            <div className='rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground'>
              {hasSearch
                ? `${profiles.length} billing profile${profiles.length === 1 ? '' : 's'} match the current search.`
                : `${profiles.length} billing profile${profiles.length === 1 ? '' : 's'} currently tracked by finance.`}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
        <Card className='border-border/60'>
          <CardHeader className='pb-2'>
            <CardDescription>Profiles</CardDescription>
            <CardTitle className='text-2xl'>{summary.profiles}</CardTitle>
          </CardHeader>
        </Card>
        <Card className='border-border/60'>
          <CardHeader className='pb-2'>
            <CardDescription>Overdue</CardDescription>
            <CardTitle className='text-2xl'>{summary.overdueProfiles}</CardTitle>
          </CardHeader>
        </Card>
        <Card className='border-border/60'>
          <CardHeader className='pb-2'>
            <CardDescription>Scholarship</CardDescription>
            <CardTitle className='text-2xl'>{summary.scholarshipProfiles}</CardTitle>
          </CardHeader>
        </Card>
        <Card className='border-border/60'>
          <CardHeader className='pb-2'>
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className='text-2xl'>{currency(summary.totalOutstanding)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className='border-border/60'>
          <CardHeader className='pb-2'>
            <CardDescription>Collected this month</CardDescription>
            <CardTitle className='text-2xl'>{currency(summary.collectedThisMonth)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-start gap-4 p-6'>
            <div>
              <div className='font-medium'>
                {hasSearch
                  ? `No billing profiles found for “${search.trim()}”.`
                  : 'No finance profiles yet.'}
              </div>
              <div className='mt-1 text-sm text-muted-foreground'>
                {hasSearch
                  ? 'Try a broader search once more billing records have been added.'
                  : 'Create the first billing profile so pricing rules and arrears leave the spreadsheet layer.'}
              </div>
            </div>
            {!hasSearch ? (
              <Button onClick={() => setProfileSheetOpen(true)}>Add first billing profile</Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]'>
          <Card className='border-border/60 xl:h-[calc(100dvh-20rem)]'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base'>Billing profiles</CardTitle>
              <CardDescription>
                Use this rail for quick selection. The detail view handles charges, payments, and
                rules.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid gap-3 overflow-y-auto pr-2'>
              {profiles.map((profile) => {
                const isActive = selectedProfileId === profile.id;
                return (
                  <button
                    key={profile.id}
                    type='button'
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      isActive
                        ? 'border-primary/60 bg-primary/5 shadow-sm'
                        : 'border-border/60 hover:bg-muted/30'
                    }`}
                  >
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='font-medium'>{profile.studentName}</div>
                      <Badge variant={billingVariant(profile.billingStatus)}>
                        {profile.billingStatus}
                      </Badge>
                      {profile.scholarshipType ? (
                        <Badge variant='secondary'>{profile.scholarshipType}</Badge>
                      ) : null}
                    </div>
                    <div className='mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground'>
                      <span>{profile.className}</span>
                      {profile.academicYear ? <span>{profile.academicYear}</span> : null}
                      <span>Fee {currency(profile.effectiveMonthlyFee)}</span>
                    </div>
                    <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                      <div>
                        <div className='text-[11px] uppercase tracking-[0.12em] text-muted-foreground'>
                          Outstanding
                        </div>
                        <div className='mt-1 font-medium'>{currency(profile.totalOutstanding)}</div>
                      </div>
                      <div>
                        <div className='text-[11px] uppercase tracking-[0.12em] text-muted-foreground'>
                          Recent payment
                        </div>
                        <div className='mt-1 font-medium'>
                          {profile.recentPaymentAmount
                            ? currency(profile.recentPaymentAmount)
                            : 'No recent payment'}
                        </div>
                      </div>
                    </div>
                    {profile.paymentPlan || profile.notesSummary ? (
                      <div className='mt-3 line-clamp-2 text-sm text-muted-foreground'>
                        {profile.paymentPlan || profile.notesSummary}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <div className='grid gap-4'>
            <Card className='border-border/60'>
              <CardContent className='grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_240px]'>
                <div className='space-y-4'>
                  {!selectedProfileId ? (
                    <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                      Select a billing profile to inspect finance detail.
                    </div>
                  ) : selectedProfile === undefined ? (
                    <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                      Loading finance detail...
                    </div>
                  ) : !selectedProfile ? (
                    <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                      Billing profile could not be loaded.
                    </div>
                  ) : (
                    <>
                      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                        <div className='space-y-2'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <h3 className='text-lg font-semibold'>{selectedProfile.studentName}</h3>
                            <Badge variant='outline'>{selectedProfile.className}</Badge>
                            {selectedProfile.academicYear ? (
                              <Badge variant='outline'>{selectedProfile.academicYear}</Badge>
                            ) : null}
                            <Badge variant={billingVariant(selectedProfile.billingStatus)}>
                              {selectedProfile.billingStatus}
                            </Badge>
                            {selectedProfile.scholarshipType ? (
                              <Badge variant='secondary'>{selectedProfile.scholarshipType}</Badge>
                            ) : null}
                          </div>
                          <p className='max-w-3xl text-sm text-muted-foreground'>
                            {selectedProfile.notesSummary ||
                              'Use the profile to keep billing rules and actual money movement separate but visible together.'}
                          </p>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setChargeSheetOpen(true)}
                          >
                            Add charge
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setPaymentSheetOpen(true)}
                          >
                            Record payment
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setProfileSheetOpen(true)}
                          >
                            Edit profile
                          </Button>
                        </div>
                      </div>

                      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                        <div className='rounded-xl border border-border/60 bg-muted/20 p-4'>
                          <div className='text-[11px] uppercase tracking-[0.12em] text-muted-foreground'>
                            Base fee
                          </div>
                          <div className='mt-2 text-xl font-semibold'>
                            {currency(selectedProfile.baseMonthlyFee)}
                          </div>
                        </div>
                        <div className='rounded-xl border border-border/60 bg-muted/20 p-4'>
                          <div className='text-[11px] uppercase tracking-[0.12em] text-muted-foreground'>
                            Effective fee
                          </div>
                          <div className='mt-2 text-xl font-semibold'>
                            {currency(selectedProfile.effectiveMonthlyFee)}
                          </div>
                        </div>
                        <div className='rounded-xl border border-border/60 bg-muted/20 p-4'>
                          <div className='text-[11px] uppercase tracking-[0.12em] text-muted-foreground'>
                            Arrears
                          </div>
                          <div className='mt-2 text-xl font-semibold'>
                            {currency(selectedProfile.arrearsBalance)}
                          </div>
                        </div>
                        <div className='rounded-xl border border-border/60 bg-muted/20 p-4'>
                          <div className='text-[11px] uppercase tracking-[0.12em] text-muted-foreground'>
                            Payment plan
                          </div>
                          <div className='mt-2 text-sm font-medium'>
                            {selectedProfile.paymentPlan || 'No plan set'}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className='rounded-2xl border border-border/60 bg-muted/20 p-4'>
                  <div className='text-sm font-medium'>Finance health</div>
                  <div className='mt-1 text-sm text-muted-foreground'>
                    Keep overdue share visible so Accounts can triage arrears before they spread.
                  </div>
                  <div className='mt-5 flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Overdue profile share</span>
                    <span className='font-medium'>{overdueShare}%</span>
                  </div>
                  <Progress value={overdueShare} className='mt-2' />
                  <Separator className='my-4' />
                  <div className='grid gap-2 text-sm text-muted-foreground'>
                    <div>Pricing rules stay separate from actual payments.</div>
                    <div>Scholarship and custom fee handling remain explicit.</div>
                    <div>Outstanding balances stay visible per student family context.</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedProfile ? (
              <Card className='border-border/60'>
                <CardContent className='p-5'>
                  <Tabs defaultValue='charges' className='gap-4'>
                    <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                      <div>
                        <div className='text-base font-semibold'>Billing detail</div>
                        <div className='text-sm text-muted-foreground'>
                          Use compact records for charges and payments instead of long stacked
                          cards.
                        </div>
                      </div>
                      <TabsList>
                        <TabsTrigger value='charges'>Charges</TabsTrigger>
                        <TabsTrigger value='payments'>Payments</TabsTrigger>
                        <TabsTrigger value='rules'>Rules</TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value='charges'>
                      {selectedProfile.charges.length === 0 ? (
                        <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                          No charges recorded yet.
                        </div>
                      ) : (
                        <div className='overflow-hidden rounded-xl border border-border/60'>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Charge</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Due</TableHead>
                                <TableHead className='text-right'>Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedProfile.charges.map((charge) => (
                                <TableRow key={charge.id}>
                                  <TableCell>
                                    <div className='font-medium'>{charge.title}</div>
                                    <div className='text-xs text-muted-foreground'>
                                      {charge.category}
                                    </div>
                                  </TableCell>
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
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value='payments'>
                      {selectedProfile.payments.length === 0 ? (
                        <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                          No payments recorded yet.
                        </div>
                      ) : (
                        <div className='overflow-hidden rounded-xl border border-border/60'>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Paid at</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Note</TableHead>
                                <TableHead className='text-right'>Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedProfile.payments.map((payment) => (
                                <TableRow key={payment.id}>
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
                    </TabsContent>

                    <TabsContent value='rules'>
                      <div className='grid gap-3 md:grid-cols-2'>
                        <div className='rounded-xl border border-border/60 p-4'>
                          <div className='text-sm font-medium'>Pricing model</div>
                          <div className='mt-3 grid gap-2 text-sm text-muted-foreground'>
                            <div>Base monthly fee: {currency(selectedProfile.baseMonthlyFee)}</div>
                            <div>
                              Effective monthly fee: {currency(selectedProfile.effectiveMonthlyFee)}
                            </div>
                            <div>
                              Scholarship:{' '}
                              {selectedProfile.scholarshipType || 'No scholarship rule'}
                            </div>
                          </div>
                        </div>
                        <div className='rounded-xl border border-border/60 p-4'>
                          <div className='text-sm font-medium'>Collections context</div>
                          <div className='mt-3 grid gap-2 text-sm text-muted-foreground'>
                            <div>Arrears balance: {currency(selectedProfile.arrearsBalance)}</div>
                            <div>Payment plan: {selectedProfile.paymentPlan || 'No plan set'}</div>
                            <div>
                              Profile status:{' '}
                              <Badge variant={billingVariant(selectedProfile.billingStatus)}>
                                {selectedProfile.billingStatus}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}

      <FinanceProfileSheet
        open={profileSheetOpen}
        onOpenChange={setProfileSheetOpen}
        billingProfileId={selectedProfileId}
        onSaved={(billingProfileId) => {
          if (billingProfileId) setSelectedProfileId(billingProfileId);
        }}
      />
      <FinanceChargeSheet
        open={chargeSheetOpen}
        onOpenChange={setChargeSheetOpen}
        billingProfileId={selectedProfileId}
      />
      <FinancePaymentSheet
        open={paymentSheetOpen}
        onOpenChange={setPaymentSheetOpen}
        billingProfileId={selectedProfileId}
      />
    </div>
  );
}
