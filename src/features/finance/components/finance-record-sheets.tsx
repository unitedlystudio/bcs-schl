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
    <div className='grid gap-4'>
      <div className='grid gap-2'>
        <Label htmlFor='chargeTitle'>Charge title</Label>
        <Input
          id='chargeTitle'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className='grid gap-4 md:grid-cols-2'>
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
      <div className='grid gap-4 md:grid-cols-3'>
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
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add finance charge</DrawerTitle>
            <DrawerDescription>
              Log tuition, registration, meal, transport, or custom charges against this student
              billing profile.
            </DrawerDescription>
          </DrawerHeader>
          <div className='max-h-[70vh] overflow-y-auto px-4'>{content}</div>
          <DrawerFooter>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>Add finance charge</SheetTitle>
          <SheetDescription>
            Log tuition, registration, meal, transport, or custom charges against this student
            billing profile.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid gap-4'>{content}</div>
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
    <div className='grid gap-4'>
      <div className='grid gap-4 md:grid-cols-2'>
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
      <div className='grid gap-4 md:grid-cols-2'>
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
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Record payment</DrawerTitle>
            <DrawerDescription>
              Log actual payments separately from pricing rules and outstanding charges.
            </DrawerDescription>
          </DrawerHeader>
          <div className='max-h-[70vh] overflow-y-auto px-4'>{content}</div>
          <DrawerFooter>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>Record payment</SheetTitle>
          <SheetDescription>
            Log actual payments separately from pricing rules and outstanding charges.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid gap-4'>{content}</div>
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
    <div className='grid gap-4'>
      <div className='grid gap-4 md:grid-cols-2'>
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
      <div className='grid gap-4 md:grid-cols-2'>
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
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Log finance reminder</DrawerTitle>
            <DrawerDescription>
              Capture the outreach touch, its outcome, and the next collections step for this
              student account.
            </DrawerDescription>
          </DrawerHeader>
          <div className='max-h-[70vh] overflow-y-auto px-4'>{content}</div>
          <DrawerFooter>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>Log finance reminder</SheetTitle>
          <SheetDescription>
            Capture the outreach touch, its outcome, and the next collections step for this student
            account.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid gap-4'>{content}</div>
        <SheetFooter className='mt-6'>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
