'use client';

import { useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';

import { api } from '../../../../convex/_generated/api';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

function defaultBillingCycleLabel(date: string) {
  const [year, month] = date.split('-');
  const monthIndex = Number(month) - 1;
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  return monthNames[monthIndex] && year ? `${monthNames[monthIndex]} ${year}` : '';
}

export function FinanceBillingRunSheet({
  open,
  onOpenChange,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const isMobile = useIsMobile();
  const generateBillingCycleCharges = useMutation(api.finance.generateBillingCycleCharges);
  const [cycleDate, setCycleDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [billingCycleLabel, setBillingCycleLabel] = useState(
    defaultBillingCycleLabel(new Date().toISOString().slice(0, 10))
  );
  const [submitting, setSubmitting] = useState(false);

  const previewCycleKey = useMemo(() => cycleDate.slice(0, 7), [cycleDate]);

  const reset = () => {
    const nextDate = new Date().toISOString().slice(0, 10);
    setCycleDate(nextDate);
    setDueDate(nextDate);
    setBillingCycleLabel(defaultBillingCycleLabel(nextDate));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const result = await generateBillingCycleCharges({
        cycleDate,
        dueDate,
        billingCycleLabel
      });
      toast.success(
        result.generatedChargeCount > 0
          ? `Generated ${result.generatedChargeCount} charges for ${result.billingCycleLabel}.`
          : `No new charges were generated for ${result.billingCycleLabel}.`
      );
      onOpenChange(false);
      reset();
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate billing cycle charges'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className='grid min-w-0 gap-4'>
      <div className='grid min-w-0 gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='billingCycleDate'>Cycle charge date</Label>
          <Input
            id='billingCycleDate'
            type='date'
            value={cycleDate}
            onChange={(event) => {
              const nextDate = event.target.value;
              setCycleDate(nextDate);
              if (
                !billingCycleLabel.trim() ||
                billingCycleLabel === defaultBillingCycleLabel(cycleDate)
              ) {
                setBillingCycleLabel(defaultBillingCycleLabel(nextDate));
              }
            }}
            disabled={submitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='billingCycleDueDate'>Cycle due date</Label>
          <Input
            id='billingCycleDueDate'
            type='date'
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='billingCycleLabel'>Billing cycle label</Label>
        <Input
          id='billingCycleLabel'
          value={billingCycleLabel}
          onChange={(event) => setBillingCycleLabel(event.target.value)}
          placeholder='April 2026, Term 2, Registration 2026, etc.'
          disabled={submitting}
        />
      </div>

      <div className='rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground'>
        <div className='font-medium text-foreground'>Billing run preview</div>
        <div className='mt-2'>
          This run will generate recurring tuition and charged monthly billing items for active
          student finance profiles.
        </div>
        <div className='mt-2'>
          Duplicate safeguards use cycle key {previewCycleKey || '—'} plus charge title per student,
          so rerunning the same cycle will skip existing items instead of duplicating them.
        </div>
      </div>
    </div>
  );

  const footer = (
    <>
      <Button variant='outline' disabled={submitting} onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button disabled={submitting || !cycleDate || !dueDate} onClick={handleSubmit}>
        {submitting ? <Icons.spinner className='mr-2 h-4 w-4 animate-spin' /> : null}
        Generate billing run
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className='max-h-[85dvh] min-h-0 w-full max-w-full overflow-x-hidden'>
          <DrawerHeader className='shrink-0'>
            <DrawerTitle>Generate billing run</DrawerTitle>
            <DrawerDescription>
              Create the next cycle’s recurring tuition and charged add-on ledger entries in one
              action.
            </DrawerDescription>
          </DrawerHeader>
          <div className='min-h-0 flex-1 min-w-0 overflow-x-hidden overflow-y-auto px-4 pb-4'>
            {content}
          </div>
          <DrawerFooter className='min-w-0 shrink-0'>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full max-w-full overflow-x-hidden sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>Generate billing run</SheetTitle>
          <SheetDescription>
            Create the next cycle’s recurring tuition and charged add-on ledger entries in one
            action.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid min-w-0 gap-4'>{content}</div>
        <SheetFooter className='mt-6'>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
