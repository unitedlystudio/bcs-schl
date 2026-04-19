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
      <Card>
        <CardHeader>
          <CardTitle>Finance & fees</CardTitle>
          <CardDescription>
            Separate student billing rules, outstanding charges, payments, and scholarship logic
            from the core student record.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search by student, class, academic year, billing status, scholarship, or notes'
              className='max-w-xl'
            />
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
          <div className='text-sm text-muted-foreground'>
            {hasSearch
              ? `${profiles.length} billing profile${profiles.length === 1 ? '' : 's'} match your search.`
              : `${profiles.length} student billing profile${profiles.length === 1 ? '' : 's'} currently in finance.`}
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Billing profiles</CardDescription>
            <CardTitle className='text-2xl'>{summary.profiles}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Overdue profiles</CardDescription>
            <CardTitle className='text-2xl'>{summary.overdueProfiles}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Scholarship profiles</CardDescription>
            <CardTitle className='text-2xl'>{summary.scholarshipProfiles}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Total outstanding</CardDescription>
            <CardTitle className='text-2xl'>{currency(summary.totalOutstanding)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
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
                  ? 'Try a broader search once billing profiles and charges have been added.'
                  : 'Create the first student billing profile so pricing, scholarships, and arrears stop living in spreadsheets.'}
              </div>
            </div>
            {!hasSearch ? (
              <Button onClick={() => setProfileSheetOpen(true)}>Add first billing profile</Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,1fr)]'>
          <div className='grid gap-4'>
            {profiles.map((profile) => (
              <Card
                key={profile.id}
                className={
                  selectedProfileId === profile.id ? 'border-primary/60 shadow-sm' : undefined
                }
              >
                <CardContent className='p-5'>
                  <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <div className='font-medium'>{profile.studentName}</div>
                        <Badge variant='outline'>{profile.className}</Badge>
                        {profile.academicYear ? (
                          <Badge variant='outline'>{profile.academicYear}</Badge>
                        ) : null}
                        <Badge variant={billingVariant(profile.billingStatus)}>
                          {profile.billingStatus}
                        </Badge>
                        {profile.scholarshipType ? (
                          <Badge variant='secondary'>{profile.scholarshipType}</Badge>
                        ) : null}
                      </div>
                      <div className='mt-2 text-sm text-muted-foreground'>
                        Effective monthly fee: {currency(profile.effectiveMonthlyFee)} •
                        Outstanding: {currency(profile.totalOutstanding)}
                      </div>
                      <div className='mt-1 text-sm text-muted-foreground'>
                        Plan: {profile.paymentPlan || 'No payment plan'} • Recent payment:{' '}
                        {profile.recentPaymentAmount
                          ? currency(profile.recentPaymentAmount)
                          : 'No recent payment'}
                      </div>
                      {profile.notesSummary ? (
                        <div className='mt-3 text-sm'>{profile.notesSummary}</div>
                      ) : null}
                    </div>
                    <div className='flex flex-wrap gap-2 lg:justify-end'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setSelectedProfileId(profile.id)}
                      >
                        View
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setSelectedProfileId(profile.id);
                          setProfileSheetOpen(true);
                        }}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className='grid gap-4'>
            <Card>
              <CardHeader>
                <CardTitle>Finance health</CardTitle>
                <CardDescription>
                  Pricing rules and payment activity should be transparent enough that arrears and
                  scholarships are easy to reason about.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>Overdue profile share</span>
                  <span className='font-medium'>{overdueShare}%</span>
                </div>
                <Progress value={overdueShare} />
                <div className='grid gap-2 text-sm text-muted-foreground'>
                  <div>• Pricing rules are separate from actual payments</div>
                  <div>• Scholarship and custom pricing stay explicit</div>
                  <div>• Outstanding charges are visible alongside arrears</div>
                  <div>• Student finance can deepen later without bloating the student table</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedProfile ? selectedProfile.studentName : 'Select a billing profile'}
                </CardTitle>
                <CardDescription>
                  {selectedProfile
                    ? `${selectedProfile.className}${selectedProfile.academicYear ? ` • ${selectedProfile.academicYear}` : ''}`
                    : 'Choose a finance profile to inspect charges, payments, and billing rules.'}
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {!selectedProfileId ? (
                  <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                    Select a billing profile from the list to inspect finance history.
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
                    <div className='grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm sm:grid-cols-2'>
                      <div>
                        <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                          Base fee
                        </div>
                        <div className='mt-1 font-medium'>
                          {currency(selectedProfile.baseMonthlyFee)}
                        </div>
                      </div>
                      <div>
                        <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                          Effective fee
                        </div>
                        <div className='mt-1 font-medium'>
                          {currency(selectedProfile.effectiveMonthlyFee)}
                        </div>
                      </div>
                      <div>
                        <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                          Arrears
                        </div>
                        <div className='mt-1 font-medium'>
                          {currency(selectedProfile.arrearsBalance)}
                        </div>
                      </div>
                      <div>
                        <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                          Payment plan
                        </div>
                        <div className='mt-1 font-medium'>
                          {selectedProfile.paymentPlan || 'No plan set'}
                        </div>
                      </div>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Button variant='outline' size='sm' onClick={() => setChargeSheetOpen(true)}>
                        Add charge
                      </Button>
                      <Button variant='outline' size='sm' onClick={() => setPaymentSheetOpen(true)}>
                        Record payment
                      </Button>
                      <Button variant='outline' size='sm' onClick={() => setProfileSheetOpen(true)}>
                        Edit billing profile
                      </Button>
                    </div>
                    <div className='space-y-3'>
                      <div className='text-sm font-medium'>Charges</div>
                      {selectedProfile.charges.length === 0 ? (
                        <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                          No charges recorded yet.
                        </div>
                      ) : (
                        selectedProfile.charges.map((charge) => (
                          <div key={charge.id} className='rounded-xl border border-border/60 p-4'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <div className='font-medium'>{charge.title}</div>
                              <Badge variant='outline'>{charge.category}</Badge>
                              <Badge
                                variant={
                                  charge.status === 'Overdue'
                                    ? 'destructive'
                                    : charge.status === 'Paid'
                                      ? 'default'
                                      : 'outline'
                                }
                              >
                                {charge.status}
                              </Badge>
                            </div>
                            <div className='mt-2 text-sm text-muted-foreground'>
                              {currency(charge.amount)} • charged {charge.chargeDate} • due{' '}
                              {charge.dueDate}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className='space-y-3'>
                      <div className='text-sm font-medium'>Payments</div>
                      {selectedProfile.payments.length === 0 ? (
                        <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                          No payments recorded yet.
                        </div>
                      ) : (
                        selectedProfile.payments.map((payment) => (
                          <div key={payment.id} className='rounded-xl border border-border/60 p-4'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <div className='font-medium'>{currency(payment.amount)}</div>
                              <Badge variant='outline'>{payment.method}</Badge>
                            </div>
                            <div className='mt-2 text-sm text-muted-foreground'>
                              Paid {payment.paidAt}
                              {payment.reference ? ` • ref ${payment.reference}` : ''}
                            </div>
                            {payment.note ? (
                              <div className='mt-2 text-sm'>{payment.note}</div>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
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
