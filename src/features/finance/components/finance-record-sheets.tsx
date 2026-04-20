'use client';

import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

export function FinanceChargeSheet({
  open,
  onOpenChange,
  billingProfileId,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billingProfileId: string | null;
  onSaved?: () => void;
}) {
  const isMobile = useIsMobile();
  const addCharge = useMutation(api.finance.addCharge);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<
    | 'Tuition'
    | 'Registration'
    | 'Lunch Plan'
    | 'Extra Lesson'
    | 'Extracurricular'
    | 'Transport'
    | 'Other'
  >('Tuition');
  const [amount, setAmount] = useState('0');
  const [chargeDate, setChargeDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'Pending' | 'Paid' | 'Overdue' | 'Waived'>('Pending');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setCategory('Tuition');
    setAmount('0');
    setChargeDate(new Date().toISOString().slice(0, 10));
    setDueDate(new Date().toISOString().slice(0, 10));
    setStatus('Pending');
  };

  const handleSubmit = async () => {
    if (!billingProfileId) return;
    try {
      setSubmitting(true);
      await addCharge({
        billingProfileId: billingProfileId as Id<'studentBillingProfiles'>,
        title,
        category,
        amount: Number(amount || 0),
        chargeDate,
        dueDate,
        status
      });
      toast.success('Charge added');
      onOpenChange(false);
      reset();
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add charge');
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className='grid min-w-0 gap-4'>
      <div className='grid gap-2'>
        <Label htmlFor='chargeTitle'>Charge title</Label>
        <Input
          id='chargeTitle'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className='grid min-w-0 gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label>Category</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
            <SelectTrigger disabled={submitting}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Tuition'>Tuition</SelectItem>
              <SelectItem value='Registration'>Registration</SelectItem>
              <SelectItem value='Lunch Plan'>Lunch Plan</SelectItem>
              <SelectItem value='Extra Lesson'>Extra Lesson</SelectItem>
              <SelectItem value='Extracurricular'>Extracurricular</SelectItem>
              <SelectItem value='Transport'>Transport</SelectItem>
              <SelectItem value='Other'>Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='chargeAmount'>Amount</Label>
          <Input
            id='chargeAmount'
            type='number'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>
      <div className='grid min-w-0 gap-4 md:grid-cols-3'>
        <div className='grid gap-2'>
          <Label htmlFor='chargeDate'>Charge date</Label>
          <Input
            id='chargeDate'
            type='date'
            value={chargeDate}
            onChange={(e) => setChargeDate(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='dueDate'>Due date</Label>
          <Input
            id='dueDate'
            type='date'
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger disabled={submitting}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Pending'>Pending</SelectItem>
              <SelectItem value='Paid'>Paid</SelectItem>
              <SelectItem value='Overdue'>Overdue</SelectItem>
              <SelectItem value='Waived'>Waived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const footer = (
    <>
      <Button variant='outline' disabled={submitting} onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button disabled={submitting || !billingProfileId} onClick={handleSubmit}>
        {submitting ? <Icons.spinner className='mr-2 h-4 w-4 animate-spin' /> : null}Add charge
      </Button>
    </>
  );

  if (isMobile)
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className='w-full max-w-full overflow-x-hidden'>
          <DrawerHeader>
            <DrawerTitle>Add finance charge</DrawerTitle>
            <DrawerDescription>
              Log tuition, registration, meal, transport, or custom charges against this student
              billing profile.
            </DrawerDescription>
          </DrawerHeader>
          <div className='max-h-[70vh] min-w-0 overflow-x-hidden overflow-y-auto px-4'>
            {content}
          </div>
          <DrawerFooter className='min-w-0'>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full max-w-full overflow-x-hidden sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>Add finance charge</SheetTitle>
          <SheetDescription>
            Log tuition, registration, meal, transport, or custom charges against this student
            billing profile.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid min-w-0 gap-4'>{content}</div>
        <SheetFooter className='mt-6'>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function FinancePaymentSheet({
  open,
  onOpenChange,
  billingProfileId,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billingProfileId: string | null;
  onSaved?: () => void;
}) {
  const isMobile = useIsMobile();
  const addPayment = useMutation(api.finance.addPayment);
  const [amount, setAmount] = useState('0');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<
    'Bank Transfer' | 'Cash' | 'Card' | 'Wallet' | 'Scholarship Credit'
  >('Bank Transfer');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setAmount('0');
    setPaidAt(new Date().toISOString().slice(0, 10));
    setMethod('Bank Transfer');
    setReference('');
    setNote('');
  };

  const handleSubmit = async () => {
    if (!billingProfileId) return;
    try {
      setSubmitting(true);
      await addPayment({
        billingProfileId: billingProfileId as Id<'studentBillingProfiles'>,
        amount: Number(amount || 0),
        paidAt,
        method,
        reference,
        note
      });
      toast.success('Payment recorded');
      onOpenChange(false);
      reset();
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className='grid min-w-0 gap-4'>
      <div className='grid min-w-0 gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='paymentAmount'>Amount</Label>
          <Input
            id='paymentAmount'
            type='number'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='paidAt'>Paid date</Label>
          <Input
            id='paidAt'
            type='date'
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>
      <div className='grid min-w-0 gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label>Method</Label>
          <Select value={method} onValueChange={(value) => setMethod(value as typeof method)}>
            <SelectTrigger disabled={submitting}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Bank Transfer'>Bank Transfer</SelectItem>
              <SelectItem value='Cash'>Cash</SelectItem>
              <SelectItem value='Card'>Card</SelectItem>
              <SelectItem value='Wallet'>Wallet</SelectItem>
              <SelectItem value='Scholarship Credit'>Scholarship Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='reference'>Reference</Label>
          <Input
            id='reference'
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>
      <div className='grid gap-2'>
        <Label htmlFor='paymentNote'>Payment note</Label>
        <Textarea
          id='paymentNote'
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          disabled={submitting}
        />
      </div>
    </div>
  );

  const footer = (
    <>
      <Button variant='outline' disabled={submitting} onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button disabled={submitting || !billingProfileId} onClick={handleSubmit}>
        {submitting ? <Icons.spinner className='mr-2 h-4 w-4 animate-spin' /> : null}Record payment
      </Button>
    </>
  );

  if (isMobile)
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className='w-full max-w-full overflow-x-hidden'>
          <DrawerHeader>
            <DrawerTitle>Record payment</DrawerTitle>
            <DrawerDescription>
              Log actual payments separately from pricing rules and outstanding charges.
            </DrawerDescription>
          </DrawerHeader>
          <div className='max-h-[70vh] min-w-0 overflow-x-hidden overflow-y-auto px-4'>
            {content}
          </div>
          <DrawerFooter className='min-w-0'>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full max-w-full overflow-x-hidden sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>Record payment</SheetTitle>
          <SheetDescription>
            Log actual payments separately from pricing rules and outstanding charges.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid min-w-0 gap-4'>{content}</div>
        <SheetFooter className='mt-6'>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function FinancePaymentSettlementSheet({
  open,
  onOpenChange,
  payment,
  charges,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: {
    id: string;
    amount: number;
    paidAt: string;
    method: 'Bank Transfer' | 'Cash' | 'Card' | 'Wallet' | 'Scholarship Credit';
    reference: string;
    note: string;
    appliedAmount: number;
    unappliedAmount: number;
    settlementLabel: string;
    applications: Array<{
      chargeId: string;
      amount: number;
    }>;
  } | null;
  charges: Array<{
    id: string;
    title: string;
    dueDate: string;
    amount: number;
    status: 'Pending' | 'Paid' | 'Overdue' | 'Waived';
    appliedAmount: number;
    balanceRemaining: number;
  }>;
  onSaved?: () => void;
}) {
  const isMobile = useIsMobile();
  const reallocatePaymentApplications = useMutation(api.finance.reallocatePaymentApplications);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !payment) return;
    setAllocations(
      Object.fromEntries(
        payment.applications.map((application) => [
          application.chargeId,
          String(application.amount)
        ])
      )
    );
  }, [open, payment]);

  const chargeRows = charges
    .filter((charge) => charge.status !== 'Waived')
    .map((charge) => {
      const currentAllocation = Number(allocations[charge.id] || 0);
      const maxAssignable = Math.max(charge.amount - (charge.appliedAmount - currentAllocation), 0);
      return {
        ...charge,
        currentAllocation,
        maxAssignable,
        otherPaymentsApplied: Math.max(charge.appliedAmount - currentAllocation, 0)
      };
    });

  const totalAllocated = Object.values(allocations).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );
  const overAllocatedCharge = chargeRows.find(
    (charge) => charge.currentAllocation > charge.maxAssignable
  );
  const exceedsPaymentTotal = payment ? totalAllocated > payment.amount : false;

  const handleAutoFill = () => {
    if (!payment) return;

    let remaining = payment.amount;
    const nextAllocations: Record<string, string> = {};
    // eslint-disable-next-line unicorn/no-array-sort
    const orderedCharges = [...chargeRows].sort(
      (left, right) =>
        left.dueDate.localeCompare(right.dueDate) || left.title.localeCompare(right.title)
    );

    for (const charge of orderedCharges) {
      if (remaining <= 0) break;
      const suggestedAmount = Math.min(remaining, charge.maxAssignable);
      nextAllocations[charge.id] = suggestedAmount > 0 ? String(suggestedAmount) : '0';
      remaining -= suggestedAmount;
    }

    setAllocations(nextAllocations);
  };

  const handleSubmit = async () => {
    if (!payment) return;
    if (overAllocatedCharge) {
      toast.error(
        `Settlement for ${overAllocatedCharge.title} is above the remaining charge balance.`
      );
      return;
    }
    if (exceedsPaymentTotal) {
      toast.error('Allocated amount cannot exceed the payment total.');
      return;
    }

    try {
      setSubmitting(true);
      await reallocatePaymentApplications({
        paymentId: payment.id as Id<'financePayments'>,
        allocations: chargeRows
          .map((charge) => ({
            chargeId: charge.id as Id<'financeCharges'>,
            amount: Number(allocations[charge.id] || 0)
          }))
          .filter((allocation) => allocation.amount > 0)
      });
      toast.success('Payment settlement updated');
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payment settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const content = payment ? (
    <div className='grid min-w-0 gap-4'>
      <div className='grid min-w-0 gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm md:grid-cols-2 xl:grid-cols-4'>
        <div>
          <div className='text-xs uppercase tracking-[0.12em] text-muted-foreground'>
            Payment total
          </div>
          <div className='mt-1 font-medium text-foreground'>{currency(payment.amount)}</div>
        </div>
        <div>
          <div className='text-xs uppercase tracking-[0.12em] text-muted-foreground'>
            Allocated now
          </div>
          <div className='mt-1 font-medium text-foreground'>{currency(totalAllocated)}</div>
        </div>
        <div>
          <div className='text-xs uppercase tracking-[0.12em] text-muted-foreground'>
            Unapplied credit
          </div>
          <div className='mt-1 font-medium text-foreground'>
            {currency(Math.max(payment.amount - totalAllocated, 0))}
          </div>
        </div>
        <div>
          <div className='text-xs uppercase tracking-[0.12em] text-muted-foreground'>
            Payment context
          </div>
          <div className='mt-1 font-medium text-foreground'>
            {payment.paidAt} • {payment.method}
          </div>
          <div className='text-xs text-muted-foreground'>
            {payment.reference || payment.note || payment.settlementLabel}
          </div>
        </div>
      </div>

      <div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div className='text-sm text-muted-foreground'>
          Rebalance how this payment settles individual charges. Leave some amount unassigned if it
          should remain as credit on account.
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={submitting}
            onClick={handleAutoFill}
          >
            Autofill oldest open charges
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            disabled={submitting}
            onClick={() => setAllocations({})}
          >
            Clear allocations
          </Button>
        </div>
      </div>

      <div className='grid gap-3'>
        {chargeRows.length === 0 ? (
          <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
            No active charges available for settlement on this student account.
          </div>
        ) : (
          chargeRows.map((charge) => (
            <div
              key={charge.id}
              className='grid min-w-0 gap-3 rounded-xl border border-border/60 p-4 md:grid-cols-[minmax(0,1fr)_140px] md:items-end'
            >
              <div className='min-w-0'>
                <div className='flex min-w-0 flex-wrap items-center gap-2'>
                  <div className='font-medium'>{charge.title}</div>
                  <span className='text-xs text-muted-foreground'>{charge.dueDate}</span>
                </div>
                <div className='mt-1 text-xs text-muted-foreground'>
                  Charge {currency(charge.amount)} • other payments applied{' '}
                  {currency(charge.otherPaymentsApplied)} • max assignable{' '}
                  {currency(charge.maxAssignable)}
                </div>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor={`settlement-${charge.id}`}>Allocate to charge</Label>
                <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                  <Input
                    id={`settlement-${charge.id}`}
                    type='number'
                    min='0'
                    value={allocations[charge.id] ?? '0'}
                    onChange={(event) =>
                      setAllocations((current) => ({
                        ...current,
                        [charge.id]: event.target.value
                      }))
                    }
                    disabled={submitting}
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='w-full sm:w-auto'
                    disabled={submitting || charge.maxAssignable <= 0}
                    onClick={() =>
                      setAllocations((current) => ({
                        ...current,
                        [charge.id]: String(charge.maxAssignable)
                      }))
                    }
                  >
                    Max
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {overAllocatedCharge ? (
        <div className='rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive'>
          {overAllocatedCharge.title} is allocated above its remaining charge balance.
        </div>
      ) : null}
      {exceedsPaymentTotal ? (
        <div className='rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive'>
          Allocations are above the payment total.
        </div>
      ) : null}
    </div>
  ) : (
    <div className='text-sm text-muted-foreground'>Choose a payment first.</div>
  );

  const footer = (
    <>
      <Button variant='outline' disabled={submitting} onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button
        disabled={submitting || !payment || !!overAllocatedCharge || exceedsPaymentTotal}
        onClick={handleSubmit}
      >
        {submitting ? <Icons.spinner className='mr-2 h-4 w-4 animate-spin' /> : null}
        Save settlement
      </Button>
    </>
  );

  if (isMobile)
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className='w-full max-w-full overflow-x-hidden'>
          <DrawerHeader>
            <DrawerTitle>Manage payment settlement</DrawerTitle>
            <DrawerDescription>
              Explicitly match this payment to the charges it should settle.
            </DrawerDescription>
          </DrawerHeader>
          <div className='max-h-[70vh] min-w-0 overflow-x-hidden overflow-y-auto px-4'>
            {content}
          </div>
          <DrawerFooter className='min-w-0'>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full max-w-full overflow-x-hidden sm:max-w-2xl'>
        <SheetHeader>
          <SheetTitle>Manage payment settlement</SheetTitle>
          <SheetDescription>
            Explicitly match this payment to the charges it should settle.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid min-w-0 gap-4'>{content}</div>
        <SheetFooter className='mt-6'>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function FinanceReminderSheet({
  open,
  onOpenChange,
  billingProfileId,
  initialCollectionStage = 'Reminder queued',
  initialReminderChannel = 'Not set',
  initialNextActionDate = '',
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billingProfileId: string | null;
  initialCollectionStage?:
    | 'No follow-up'
    | 'Reminder queued'
    | 'In contact'
    | 'Promise to pay'
    | 'Escalated';
  initialReminderChannel?: 'Email' | 'WhatsApp' | 'Phone' | 'In person' | 'Not set';
  initialNextActionDate?: string;
  onSaved?: () => void;
}) {
  const isMobile = useIsMobile();
  const addReminderLog = useMutation(api.finance.addReminderLog);
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().slice(0, 10));
  const [channel, setChannel] = useState(initialReminderChannel);
  const [collectionStage, setCollectionStage] = useState(initialCollectionStage);
  const [nextActionDate, setNextActionDate] = useState(initialNextActionDate);
  const [authorLabel, setAuthorLabel] = useState('Accounts operator');
  const [outcome, setOutcome] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReminderDate(new Date().toISOString().slice(0, 10));
    setChannel(initialReminderChannel);
    setCollectionStage(initialCollectionStage);
    setNextActionDate(initialNextActionDate);
    setAuthorLabel('Accounts operator');
    setOutcome('');
  };

  useEffect(() => {
    if (!open) return;
    setChannel(initialReminderChannel);
    setCollectionStage(initialCollectionStage);
    setNextActionDate(initialNextActionDate);
  }, [initialCollectionStage, initialNextActionDate, initialReminderChannel, open]);

  const handleSubmit = async () => {
    if (!billingProfileId) return;
    try {
      setSubmitting(true);
      await addReminderLog({
        billingProfileId: billingProfileId as Id<'studentBillingProfiles'>,
        reminderDate,
        channel,
        collectionStage,
        nextActionDate,
        authorLabel,
        outcome
      });
      toast.success('Reminder logged');
      onOpenChange(false);
      reset();
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to log reminder');
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className='grid min-w-0 gap-4'>
      <div className='grid min-w-0 gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='reminderDate'>Reminder date</Label>
          <Input
            id='reminderDate'
            type='date'
            value={reminderDate}
            onChange={(event) => setReminderDate(event.target.value)}
            disabled={submitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label>Channel</Label>
          <Select value={channel} onValueChange={(value) => setChannel(value as typeof channel)}>
            <SelectTrigger disabled={submitting}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Email'>Email</SelectItem>
              <SelectItem value='WhatsApp'>WhatsApp</SelectItem>
              <SelectItem value='Phone'>Phone</SelectItem>
              <SelectItem value='In person'>In person</SelectItem>
              <SelectItem value='Not set'>Not set</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className='grid min-w-0 gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label>Collections stage after touch</Label>
          <Select
            value={collectionStage}
            onValueChange={(value) => setCollectionStage(value as typeof collectionStage)}
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='No follow-up'>No follow-up</SelectItem>
              <SelectItem value='Reminder queued'>Reminder queued</SelectItem>
              <SelectItem value='In contact'>In contact</SelectItem>
              <SelectItem value='Promise to pay'>Promise to pay</SelectItem>
              <SelectItem value='Escalated'>Escalated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='nextActionDate'>Next action date</Label>
          <Input
            id='nextActionDate'
            type='date'
            value={nextActionDate}
            onChange={(event) => setNextActionDate(event.target.value)}
            disabled={submitting}
          />
        </div>
      </div>
      <div className='grid gap-2'>
        <Label htmlFor='authorLabel'>Logged by</Label>
        <Input
          id='authorLabel'
          value={authorLabel}
          onChange={(event) => setAuthorLabel(event.target.value)}
          disabled={submitting}
        />
      </div>
      <div className='grid gap-2'>
        <Label htmlFor='reminderOutcome'>Outcome / note</Label>
        <Textarea
          id='reminderOutcome'
          value={outcome}
          onChange={(event) => setOutcome(event.target.value)}
          rows={4}
          placeholder='What happened on this touch? Family replied, promised a date, requested plan details, no answer, etc.'
          disabled={submitting}
        />
      </div>
    </div>
  );

  const footer = (
    <>
      <Button variant='outline' disabled={submitting} onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button disabled={submitting || !billingProfileId || !outcome.trim()} onClick={handleSubmit}>
        {submitting ? <Icons.spinner className='mr-2 h-4 w-4 animate-spin' /> : null}Log reminder
      </Button>
    </>
  );

  if (isMobile)
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className='w-full max-w-full overflow-x-hidden'>
          <DrawerHeader>
            <DrawerTitle>Log finance reminder</DrawerTitle>
            <DrawerDescription>
              Capture the outreach touch, its outcome, and the next collections step for this
              student account.
            </DrawerDescription>
          </DrawerHeader>
          <div className='max-h-[70vh] min-w-0 overflow-x-hidden overflow-y-auto px-4'>
            {content}
          </div>
          <DrawerFooter className='min-w-0'>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full max-w-full overflow-x-hidden sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>Log finance reminder</SheetTitle>
          <SheetDescription>
            Capture the outreach touch, its outcome, and the next collections step for this student
            account.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid min-w-0 gap-4'>{content}</div>
        <SheetFooter className='mt-6'>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function FinanceFamilyPaymentSheet({
  open,
  onOpenChange,
  familyAccount,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyAccount: {
    id: string;
    accountLabel: string;
    primaryGuardianName: string;
    members: Array<{
      profileId: string;
      studentName: string;
      className: string;
      academicYear: string;
      totalOutstanding: number;
    }>;
  } | null;
  onSaved?: () => void;
}) {
  const isMobile = useIsMobile();
  const allocateFamilyPayment = useMutation(api.finance.allocateFamilyPayment);
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<
    'Bank Transfer' | 'Cash' | 'Card' | 'Wallet' | 'Scholarship Credit'
  >('Bank Transfer');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !familyAccount) return;
    setPaidAt(new Date().toISOString().slice(0, 10));
    setMethod('Bank Transfer');
    setReference('');
    setNote('');
    setAllocations(
      Object.fromEntries(familyAccount.members.map((member) => [member.profileId, '0']))
    );
  }, [familyAccount, open]);

  const totalAllocated = Object.values(allocations).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  const handleSubmit = async () => {
    if (!familyAccount) return;
    const normalizedAllocations = familyAccount.members
      .map((member) => ({
        billingProfileId: member.profileId as Id<'studentBillingProfiles'>,
        amount: Number(allocations[member.profileId] || 0)
      }))
      .filter((allocation) => allocation.amount > 0);

    if (normalizedAllocations.length === 0) {
      toast.error('Add at least one positive allocation amount.');
      return;
    }

    try {
      setSubmitting(true);
      await allocateFamilyPayment({
        familyAccountId: familyAccount.id as Id<'financeFamilyAccounts'>,
        paidAt,
        method,
        reference,
        note,
        allocations: normalizedAllocations
      });
      toast.success('Family payment allocated');
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to allocate family payment');
    } finally {
      setSubmitting(false);
    }
  };

  const content = familyAccount ? (
    <div className='grid min-w-0 gap-4'>
      <div className='min-w-0 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground'>
        <div className='break-words font-medium text-foreground'>{familyAccount.accountLabel}</div>
        <div className='mt-1 break-words'>
          {familyAccount.primaryGuardianName || 'No guardian set'}
        </div>
      </div>
      <div className='grid min-w-0 gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='familyPaidAt'>Paid date</Label>
          <Input
            id='familyPaidAt'
            type='date'
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            disabled={submitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label>Method</Label>
          <Select value={method} onValueChange={(value) => setMethod(value as typeof method)}>
            <SelectTrigger disabled={submitting}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Bank Transfer'>Bank Transfer</SelectItem>
              <SelectItem value='Cash'>Cash</SelectItem>
              <SelectItem value='Card'>Card</SelectItem>
              <SelectItem value='Wallet'>Wallet</SelectItem>
              <SelectItem value='Scholarship Credit'>Scholarship Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className='grid min-w-0 gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='familyReference'>Reference</Label>
          <Input
            id='familyReference'
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            disabled={submitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label>Total allocated</Label>
          <Input value={String(totalAllocated || 0)} disabled />
        </div>
      </div>
      <div className='grid gap-2'>
        <Label htmlFor='familyPaymentNote'>Family payment note</Label>
        <Textarea
          id='familyPaymentNote'
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder='Optional household payment context or allocation note.'
          disabled={submitting}
        />
      </div>
      <div className='grid min-w-0 gap-3'>
        <div className='break-words text-sm font-medium'>Allocate across linked students</div>
        {familyAccount.members.map((member) => (
          <div
            key={member.profileId}
            className='grid min-w-0 gap-3 rounded-xl border border-border/60 p-4 md:grid-cols-[minmax(0,1fr)_140px] md:items-end'
          >
            <div className='min-w-0'>
              <div className='break-words font-medium'>{member.studentName}</div>
              <div className='break-words text-xs text-muted-foreground'>
                {member.className}
                {member.academicYear ? ` • ${member.academicYear}` : ''}
                {member.totalOutstanding
                  ? ` • outstanding ${currency(member.totalOutstanding)}`
                  : ''}
              </div>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor={`allocation-${member.profileId}`}>Allocated amount</Label>
              <Input
                id={`allocation-${member.profileId}`}
                type='number'
                min='0'
                value={allocations[member.profileId] ?? '0'}
                onChange={(event) =>
                  setAllocations((current) => ({
                    ...current,
                    [member.profileId]: event.target.value
                  }))
                }
                disabled={submitting}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div className='text-sm text-muted-foreground'>Choose a family account first.</div>
  );

  const footer = (
    <>
      <Button variant='outline' disabled={submitting} onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button disabled={submitting || !familyAccount || totalAllocated <= 0} onClick={handleSubmit}>
        {submitting ? <Icons.spinner className='mr-2 h-4 w-4 animate-spin' /> : null}
        Allocate family payment
      </Button>
    </>
  );

  if (isMobile)
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className='w-full max-w-full overflow-x-hidden'>
          <DrawerHeader>
            <DrawerTitle>Allocate family payment</DrawerTitle>
            <DrawerDescription>
              Record one household payment and split it across linked student billing profiles.
            </DrawerDescription>
          </DrawerHeader>
          <div className='max-h-[70vh] min-w-0 overflow-x-hidden overflow-y-auto px-4'>
            {content}
          </div>
          <DrawerFooter className='min-w-0'>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full max-w-full overflow-x-hidden sm:max-w-2xl'>
        <SheetHeader>
          <SheetTitle>Allocate family payment</SheetTitle>
          <SheetDescription>
            Record one household payment and split it across linked student billing profiles.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid min-w-0 gap-4'>{content}</div>
        <SheetFooter className='mt-6'>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
