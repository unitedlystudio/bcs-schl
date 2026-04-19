'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
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

const DEFAULT_FORM = {
  studentId: '',
  baseMonthlyFee: '0',
  billingStatus: 'Current' as 'Current' | 'Overdue' | 'Scholarship' | 'Custom',
  scholarshipType: '',
  scholarshipPercent: '0',
  customMonthlyFee: '0',
  arrearsBalance: '0',
  paymentPlan: '',
  notesSummary: ''
};

type ProfileFormValues = typeof DEFAULT_FORM;

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
    <div className='grid gap-4'>
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
          <Label htmlFor='baseMonthlyFee'>Base monthly fee</Label>
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
          <Label htmlFor='customMonthlyFee'>Custom monthly fee</Label>
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

      <div className='grid gap-2'>
        <Label htmlFor='notesSummary'>Finance notes</Label>
        <Textarea
          id='notesSummary'
          value={values.notesSummary}
          onChange={(event) => onChange('notesSummary', event.target.value)}
          placeholder='Scholarship context, arrears handling, or negotiated terms.'
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
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billingProfileId?: string | null;
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
        notesSummary: profile.notesSummary
      });
      setErrors({});
      return;
    }

    setValues(DEFAULT_FORM);
    setErrors({});
  }, [open, isEdit, profile]);

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
    if (Number(values.arrearsBalance) < 0)
      nextErrors.arrearsBalance = 'Arrears cannot be negative.';
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
      <ProfileFields
        values={values}
        onChange={onChange}
        errors={errors}
        students={studentOptions}
        disabled={submitting}
        isEdit={isEdit}
      />
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
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{isEdit ? 'Manage billing profile' : 'Add billing profile'}</DrawerTitle>
            <DrawerDescription>
              Keep student finance separate from the student identity record while staying linked to
              it.
            </DrawerDescription>
          </DrawerHeader>
          <div className='max-h-[70vh] overflow-y-auto px-4'>{content}</div>
          <DrawerFooter>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='sm:max-w-2xl'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Manage billing profile' : 'Add billing profile'}</SheetTitle>
          <SheetDescription>
            Keep student finance separate from the student identity record while staying linked to
            it.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid gap-4'>{content}</div>
        <SheetFooter className='mt-6'>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
