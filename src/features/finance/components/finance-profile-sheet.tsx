'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
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

const BILLING_ITEM_CATEGORIES = [
  'Lunch Plan',
  'Extra Lesson',
  'Extracurricular',
  'Transport',
  'Other'
] as const;
const BILLING_ITEM_BEHAVIORS = ['Included', 'Charged', 'Available'] as const;

type BillingItemFormValue = {
  id: string;
  label: string;
  category: (typeof BILLING_ITEM_CATEGORIES)[number];
  billingBehavior: (typeof BILLING_ITEM_BEHAVIORS)[number];
  monthlyAmount: string;
  notes: string;
  sortOrder: number;
};

const DEFAULT_FORM = {
  studentId: '',
  baseMonthlyFee: '0',
  billingStatus: 'Current' as 'Current' | 'Overdue' | 'Scholarship' | 'Custom',
  scholarshipType: '',
  scholarshipPercent: '0',
  customMonthlyFee: '0',
  arrearsBalance: '0',
  paymentPlan: '',
  familyLabel: '',
  collectionStage: 'No follow-up' as
    | 'No follow-up'
    | 'Reminder queued'
    | 'In contact'
    | 'Promise to pay'
    | 'Escalated',
  reminderChannel: 'Not set' as 'Email' | 'WhatsApp' | 'Phone' | 'In person' | 'Not set',
  lastReminderDate: '',
  nextActionDate: '',
  billingItems: [] as BillingItemFormValue[],
  notesSummary: ''
};

type ProfileFormValues = typeof DEFAULT_FORM;

function createBillingItem(seed?: Partial<BillingItemFormValue>): BillingItemFormValue {
  return {
    id: seed?.id ?? `billing-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: seed?.label ?? '',
    category: seed?.category ?? 'Lunch Plan',
    billingBehavior: seed?.billingBehavior ?? 'Charged',
    monthlyAmount: seed?.monthlyAmount ?? '0',
    notes: seed?.notes ?? '',
    sortOrder: seed?.sortOrder ?? 0
  };
}

function BillingItemsEditor({
  items,
  onChange,
  disabled
}: {
  items: BillingItemFormValue[];
  onChange: (items: BillingItemFormValue[]) => void;
  disabled: boolean;
}) {
  const updateItem = (id: string, updater: Partial<BillingItemFormValue>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updater } : item)));
  };

  const removeItem = (id: string) => {
    onChange(
      items.filter((item) => item.id !== id).map((item, index) => ({ ...item, sortOrder: index }))
    );
  };

  const addItem = () => {
    onChange([...items, createBillingItem({ sortOrder: items.length })]);
  };

  return (
    <div className='grid min-w-0 gap-3'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='min-w-0'>
          <div className='text-sm font-medium'>Monthly billing items</div>
          <div className='text-sm text-muted-foreground'>
            Model lunch plans, extra lessons, extracurriculars, and included items per student.
          </div>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='w-full sm:w-auto'
          onClick={addItem}
          disabled={disabled}
        >
          <Icons.add className='mr-2 h-4 w-4' />
          Add item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
          No monthly finance items added yet. Add lunch plans, transport, extra lessons, or
          extracurriculars here.
        </div>
      ) : (
        items.map((item, index) => (
          <div key={item.id} className='min-w-0 rounded-xl border border-border/60 p-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex min-w-0 flex-wrap items-center gap-2'>
                <Badge variant='outline'>Item {index + 1}</Badge>
                <Badge variant={item.billingBehavior === 'Charged' ? 'default' : 'secondary'}>
                  {item.billingBehavior}
                </Badge>
              </div>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='w-full sm:w-auto'
                onClick={() => removeItem(item.id)}
                disabled={disabled}
              >
                Remove
              </Button>
            </div>

            <div className='mt-4 grid gap-4 md:grid-cols-2'>
              <div className='grid gap-2'>
                <Label>Label</Label>
                <Input
                  value={item.label}
                  onChange={(event) => updateItem(item.id, { label: event.target.value })}
                  placeholder='Lunch plan / Piano lesson / Football club'
                  disabled={disabled}
                />
              </div>
              <div className='grid gap-2'>
                <Label>Category</Label>
                <Select
                  value={item.category}
                  onValueChange={(value) =>
                    updateItem(item.id, {
                      category: value as BillingItemFormValue['category']
                    })
                  }
                >
                  <SelectTrigger disabled={disabled}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_ITEM_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='mt-4 grid gap-4 md:grid-cols-2'>
              <div className='grid gap-2'>
                <Label>Billing behavior</Label>
                <Select
                  value={item.billingBehavior}
                  onValueChange={(value) =>
                    updateItem(item.id, {
                      billingBehavior: value as BillingItemFormValue['billingBehavior']
                    })
                  }
                >
                  <SelectTrigger disabled={disabled}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_ITEM_BEHAVIORS.map((behavior) => (
                      <SelectItem key={behavior} value={behavior}>
                        {behavior}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label>Monthly amount</Label>
                <Input
                  type='number'
                  value={item.monthlyAmount}
                  onChange={(event) => updateItem(item.id, { monthlyAmount: event.target.value })}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className='mt-4 grid gap-2'>
              <Label>Notes</Label>
              <Textarea
                value={item.notes}
                onChange={(event) => updateItem(item.id, { notes: event.target.value })}
                rows={2}
                placeholder='Included in package / billed monthly / seasonal club etc.'
                disabled={disabled}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ProfileFields({
  values,
  onChange,
  errors,
  students,
  disabled,
  isEdit
}: {
  values: ProfileFormValues;
  onChange: <K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) => void;
  errors: Partial<Record<keyof ProfileFormValues, string>>;
  students: Array<{ id: string; label: string }>;
  disabled: boolean;
  isEdit: boolean;
}) {
  return (
    <div className='grid min-w-0 gap-5'>
      <div className='grid gap-2'>
        <Label>Student</Label>
        <Select value={values.studentId} onValueChange={(value) => onChange('studentId', value)}>
          <SelectTrigger disabled={disabled || isEdit}>
            <SelectValue placeholder='Choose student' />
          </SelectTrigger>
          <SelectContent>
            {students.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.studentId ? <p className='text-sm text-destructive'>{errors.studentId}</p> : null}
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='baseMonthlyFee'>Base monthly tuition</Label>
          <Input
            id='baseMonthlyFee'
            type='number'
            value={values.baseMonthlyFee}
            onChange={(event) => onChange('baseMonthlyFee', event.target.value)}
            disabled={disabled}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='arrearsBalance'>Arrears balance</Label>
          <Input
            id='arrearsBalance'
            type='number'
            value={values.arrearsBalance}
            onChange={(event) => onChange('arrearsBalance', event.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='grid gap-2'>
          <Label>Billing status</Label>
          <Select
            value={values.billingStatus}
            onValueChange={(value) =>
              onChange('billingStatus', value as ProfileFormValues['billingStatus'])
            }
          >
            <SelectTrigger disabled={disabled}>
              <SelectValue placeholder='Choose status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Current'>Current</SelectItem>
              <SelectItem value='Overdue'>Overdue</SelectItem>
              <SelectItem value='Scholarship'>Scholarship</SelectItem>
              <SelectItem value='Custom'>Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label>Scholarship type</Label>
          <Select
            value={values.scholarshipType || '__none'}
            onValueChange={(value) => onChange('scholarshipType', value === '__none' ? '' : value)}
          >
            <SelectTrigger disabled={disabled}>
              <SelectValue placeholder='Optional scholarship type' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__none'>No scholarship type</SelectItem>
              <SelectItem value='Partial Scholarship'>Partial Scholarship</SelectItem>
              <SelectItem value='Full Scholarship'>Full Scholarship</SelectItem>
              <SelectItem value='Sibling Discount'>Sibling Discount</SelectItem>
              <SelectItem value='Hardship Support'>Hardship Support</SelectItem>
              <SelectItem value='Negotiated Custom'>Negotiated Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='scholarshipPercent'>Scholarship %</Label>
          <Input
            id='scholarshipPercent'
            type='number'
            value={values.scholarshipPercent}
            onChange={(event) => onChange('scholarshipPercent', event.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='customMonthlyFee'>Custom tuition amount</Label>
          <Input
            id='customMonthlyFee'
            type='number'
            value={values.customMonthlyFee}
            onChange={(event) => onChange('customMonthlyFee', event.target.value)}
            disabled={disabled}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='paymentPlan'>Payment plan</Label>
          <Input
            id='paymentPlan'
            value={values.paymentPlan}
            onChange={(event) => onChange('paymentPlan', event.target.value)}
            placeholder='Monthly split across 2 transfers'
            disabled={disabled}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='familyLabel'>Family / account label</Label>
          <Input
            id='familyLabel'
            value={values.familyLabel}
            onChange={(event) => onChange('familyLabel', event.target.value)}
            placeholder='Holloway family account'
            disabled={disabled}
          />
        </div>
        <div className='grid gap-2'>
          <Label>Collections stage</Label>
          <Select
            value={values.collectionStage}
            onValueChange={(value) =>
              onChange('collectionStage', value as ProfileFormValues['collectionStage'])
            }
          >
            <SelectTrigger disabled={disabled}>
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
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='grid gap-2'>
          <Label>Reminder channel</Label>
          <Select
            value={values.reminderChannel}
            onValueChange={(value) =>
              onChange('reminderChannel', value as ProfileFormValues['reminderChannel'])
            }
          >
            <SelectTrigger disabled={disabled}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Not set'>Not set</SelectItem>
              <SelectItem value='Email'>Email</SelectItem>
              <SelectItem value='WhatsApp'>WhatsApp</SelectItem>
              <SelectItem value='Phone'>Phone</SelectItem>
              <SelectItem value='In person'>In person</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='lastReminderDate'>Last reminder</Label>
          <Input
            id='lastReminderDate'
            type='date'
            value={values.lastReminderDate}
            onChange={(event) => onChange('lastReminderDate', event.target.value)}
            disabled={disabled}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='nextActionDate'>Next action date</Label>
          <Input
            id='nextActionDate'
            type='date'
            value={values.nextActionDate}
            onChange={(event) => onChange('nextActionDate', event.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <BillingItemsEditor
        items={values.billingItems}
        onChange={(items) => onChange('billingItems', items)}
        disabled={disabled}
      />

      <div className='grid gap-2'>
        <Label htmlFor='notesSummary'>Finance notes</Label>
        <Textarea
          id='notesSummary'
          value={values.notesSummary}
          onChange={(event) => onChange('notesSummary', event.target.value)}
          placeholder='Scholarship context, arrears handling, reminder policy, or family-specific terms.'
          disabled={disabled}
          rows={4}
        />
      </div>
    </div>
  );
}

export function FinanceProfileSheet({
  open,
  onOpenChange,
  billingProfileId,
  defaultStudentId,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billingProfileId?: string | null;
  defaultStudentId?: string | null;
  onSaved?: (billingProfileId?: string) => void;
}) {
  const isMobile = useIsMobile();
  const isEdit = Boolean(billingProfileId);
  const students = useQuery(api.students.list, {});
  const profile = useQuery(
    api.finance.getByProfileId,
    billingProfileId
      ? { billingProfileId: billingProfileId as Id<'studentBillingProfiles'> }
      : 'skip'
  );
  const createProfile = useMutation(api.finance.createProfile);
  const updateProfile = useMutation(api.finance.updateProfile);
  const [values, setValues] = useState<ProfileFormValues>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (isEdit) {
      if (profile === undefined || !profile) return;
      setValues({
        studentId: profile.studentId,
        baseMonthlyFee: String(profile.baseMonthlyFee),
        billingStatus: profile.billingStatus,
        scholarshipType: profile.scholarshipType,
        scholarshipPercent: String(profile.scholarshipPercent),
        customMonthlyFee: String(profile.customMonthlyFee),
        arrearsBalance: String(profile.arrearsBalance),
        paymentPlan: profile.paymentPlan,
        familyLabel: profile.familyLabel,
        collectionStage: profile.collectionStage,
        reminderChannel: profile.reminderChannel,
        lastReminderDate: profile.lastReminderDate,
        nextActionDate: profile.nextActionDate,
        billingItems: (profile.billingItems ?? []).map((item, index) => ({
          id: item.id,
          label: item.label,
          category: item.category,
          billingBehavior: item.billingBehavior,
          monthlyAmount: String(item.monthlyAmount),
          notes: item.notes ?? '',
          sortOrder: item.sortOrder ?? index
        })),
        notesSummary: profile.notesSummary
      });
      setErrors({});
      return;
    }

    setValues({
      ...DEFAULT_FORM,
      studentId: defaultStudentId ?? ''
    });
    setErrors({});
  }, [open, isEdit, profile, defaultStudentId]);

  const studentOptions = useMemo(
    () =>
      (students ?? []).map((student) => ({
        id: student.id,
        label: `${student.fullName} • ${student.className}${student.academicYear ? ` • ${student.academicYear}` : ''}`
      })),
    [students]
  );

  const onChange = <K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof ProfileFormValues, string>> = {};
    if (!values.studentId) nextErrors.studentId = 'Student is required.';
    if (Number(values.baseMonthlyFee) < 0) nextErrors.baseMonthlyFee = 'Fee cannot be negative.';
    if (Number(values.arrearsBalance) < 0) {
      nextErrors.arrearsBalance = 'Arrears cannot be negative.';
    }
    if (
      values.billingItems.some((item) => !item.label.trim() || Number(item.monthlyAmount || 0) < 0)
    ) {
      nextErrors.billingItems = 'Billing items need a label and non-negative monthly amount.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      studentId: values.studentId as Id<'students'>,
      baseMonthlyFee: Number(values.baseMonthlyFee || 0),
      billingStatus: values.billingStatus,
      scholarshipType: values.scholarshipType
        ? (values.scholarshipType as
            | 'Partial Scholarship'
            | 'Full Scholarship'
            | 'Sibling Discount'
            | 'Hardship Support'
            | 'Negotiated Custom')
        : undefined,
      scholarshipPercent:
        Number(values.scholarshipPercent || 0) > 0
          ? Number(values.scholarshipPercent || 0)
          : undefined,
      customMonthlyFee:
        Number(values.customMonthlyFee || 0) > 0 ? Number(values.customMonthlyFee || 0) : undefined,
      arrearsBalance: Number(values.arrearsBalance || 0),
      paymentPlan: values.paymentPlan,
      familyLabel: values.familyLabel,
      collectionStage: values.collectionStage,
      reminderChannel: values.reminderChannel,
      lastReminderDate: values.lastReminderDate || undefined,
      nextActionDate: values.nextActionDate || undefined,
      billingItems: values.billingItems.map((item, index) => ({
        id: item.id,
        label: item.label,
        category: item.category,
        billingBehavior: item.billingBehavior,
        monthlyAmount: Number(item.monthlyAmount || 0),
        notes: item.notes,
        sortOrder: index
      })),
      notesSummary: values.notesSummary
    };

    try {
      setSubmitting(true);
      if (isEdit && billingProfileId) {
        const result = await updateProfile({
          billingProfileId: billingProfileId as Id<'studentBillingProfiles'>,
          ...payload
        });
        toast.success('Billing profile updated');
        onOpenChange(false);
        onSaved?.(result.billingProfileId);
      } else {
        const result = await createProfile(payload);
        toast.success('Billing profile created');
        onOpenChange(false);
        onSaved?.(result.billingProfileId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save billing profile');
    } finally {
      setSubmitting(false);
    }
  };

  const content =
    isEdit && profile === undefined ? (
      <div className='p-4 text-sm text-muted-foreground'>Loading billing profile...</div>
    ) : isEdit && !profile ? (
      <div className='p-4 text-sm text-muted-foreground'>Billing profile could not be loaded.</div>
    ) : (
      <div className='grid gap-2'>
        <ProfileFields
          values={values}
          onChange={onChange}
          errors={errors}
          students={studentOptions}
          disabled={submitting}
          isEdit={isEdit}
        />
        {errors.billingItems ? (
          <p className='text-sm text-destructive'>{errors.billingItems}</p>
        ) : null}
      </div>
    );

  const footer = (
    <>
      <Button variant='outline' disabled={submitting} onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button disabled={submitting || (isEdit && profile === undefined)} onClick={handleSubmit}>
        {submitting ? <Icons.spinner className='mr-2 h-4 w-4 animate-spin' /> : null}
        {isEdit ? 'Save billing profile' : 'Create billing profile'}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className='overflow-x-hidden'>
          <DrawerHeader>
            <DrawerTitle>{isEdit ? 'Manage billing profile' : 'Add billing profile'}</DrawerTitle>
            <DrawerDescription>
              Keep tuition, add-ons, and collection terms attached to the student finance profile.
            </DrawerDescription>
          </DrawerHeader>
          <div className='max-h-[70vh] overflow-x-hidden overflow-y-auto px-4'>{content}</div>
          <DrawerFooter>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='sm:max-w-3xl'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Manage billing profile' : 'Add billing profile'}</SheetTitle>
          <SheetDescription>
            Keep tuition, add-ons, and collection terms attached to the student finance profile.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid gap-4'>{content}</div>
        <SheetFooter className='mt-6'>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
