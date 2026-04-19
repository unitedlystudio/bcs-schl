'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Icons } from '@/components/icons';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
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
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

const DEFAULT_FORM = {
  studentName: '',
  familyName: '',
  classInterest: '',
  guardianName: '',
  guardianPhone: '',
  source: '',
  enquiryDate: new Date().toISOString().slice(0, 10),
  stage: 'New' as
    | 'New'
    | 'Contacted'
    | 'Tour Scheduled'
    | 'Application in Progress'
    | 'Decision Pending'
    | 'Enrolled'
    | 'Closed',
  status: 'Active' as 'Active' | 'Waiting' | 'Won' | 'Lost',
  notesSummary: ''
};

type AdmissionsFormValues = typeof DEFAULT_FORM;

type AdmissionsFormTriggerProps = {
  enquiryId?: string;
  buttonLabel?: string;
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  buttonClassName?: string;
};

function AdmissionsFormFields({
  values,
  onChange,
  errors,
  isSubmitting
}: {
  values: AdmissionsFormValues;
  onChange: <K extends keyof AdmissionsFormValues>(key: K, value: AdmissionsFormValues[K]) => void;
  errors: Partial<Record<keyof AdmissionsFormValues, string>>;
  isSubmitting: boolean;
}) {
  return (
    <div className='grid gap-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='enquiry-student-name'>Student name</Label>
          <Input
            id='enquiry-student-name'
            value={values.studentName}
            onChange={(event) => onChange('studentName', event.target.value)}
            placeholder='Sofia Hartono'
            disabled={isSubmitting}
          />
          {errors.studentName ? (
            <p className='text-sm text-destructive'>{errors.studentName}</p>
          ) : null}
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='enquiry-family-name'>Family name</Label>
          <Input
            id='enquiry-family-name'
            value={values.familyName}
            onChange={(event) => onChange('familyName', event.target.value)}
            placeholder='Hartono'
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='enquiry-class-interest'>Class interest</Label>
          <Input
            id='enquiry-class-interest'
            value={values.classInterest}
            onChange={(event) => onChange('classInterest', event.target.value)}
            placeholder='Class 1'
            disabled={isSubmitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='enquiry-date'>Enquiry date</Label>
          <Input
            id='enquiry-date'
            type='date'
            value={values.enquiryDate}
            onChange={(event) => onChange('enquiryDate', event.target.value)}
            disabled={isSubmitting}
          />
          {errors.enquiryDate ? (
            <p className='text-sm text-destructive'>{errors.enquiryDate}</p>
          ) : null}
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='enquiry-guardian-name'>Guardian name</Label>
          <Input
            id='enquiry-guardian-name'
            value={values.guardianName}
            onChange={(event) => onChange('guardianName', event.target.value)}
            placeholder='Mira Hartono'
            disabled={isSubmitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='enquiry-guardian-phone'>Guardian phone</Label>
          <Input
            id='enquiry-guardian-phone'
            value={values.guardianPhone}
            onChange={(event) => onChange('guardianPhone', event.target.value)}
            placeholder='+62 812 2000 1101'
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='grid gap-2'>
          <Label>Stage</Label>
          <Select
            value={values.stage}
            onValueChange={(value) => onChange('stage', value as AdmissionsFormValues['stage'])}
          >
            <SelectTrigger disabled={isSubmitting}>
              <SelectValue placeholder='Select stage' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='New'>New</SelectItem>
              <SelectItem value='Contacted'>Contacted</SelectItem>
              <SelectItem value='Tour Scheduled'>Tour Scheduled</SelectItem>
              <SelectItem value='Application in Progress'>Application in Progress</SelectItem>
              <SelectItem value='Decision Pending'>Decision Pending</SelectItem>
              <SelectItem value='Enrolled'>Enrolled</SelectItem>
              <SelectItem value='Closed'>Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label>Status</Label>
          <Select
            value={values.status}
            onValueChange={(value) => onChange('status', value as AdmissionsFormValues['status'])}
          >
            <SelectTrigger disabled={isSubmitting}>
              <SelectValue placeholder='Select status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Active'>Active</SelectItem>
              <SelectItem value='Waiting'>Waiting</SelectItem>
              <SelectItem value='Won'>Won</SelectItem>
              <SelectItem value='Lost'>Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='enquiry-source'>Source</Label>
          <Input
            id='enquiry-source'
            value={values.source}
            onChange={(event) => onChange('source', event.target.value)}
            placeholder='Instagram'
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='enquiry-notes'>Notes summary</Label>
        <Textarea
          id='enquiry-notes'
          value={values.notesSummary}
          onChange={(event) => onChange('notesSummary', event.target.value)}
          placeholder='Latest family context, next step, or blockers.'
          rows={4}
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
}

export function AdmissionsFormTrigger({
  enquiryId,
  buttonLabel,
  buttonSize = 'default',
  buttonVariant = 'default',
  buttonClassName
}: AdmissionsFormTriggerProps) {
  const isMobile = useIsMobile();
  const isEdit = Boolean(enquiryId);
  const createEnquiry = useMutation(api.admissions.create);
  const updateEnquiry = useMutation(api.admissions.update);
  const enquiry = useQuery(
    api.admissions.getById,
    enquiryId ? { enquiryId: enquiryId as Id<'admissionsEnquiries'> } : 'skip'
  );

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<AdmissionsFormValues>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof AdmissionsFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEdit) {
      if (enquiry === undefined || !enquiry) {
        return;
      }

      setValues({
        studentName: enquiry.studentName,
        familyName: enquiry.familyName,
        classInterest: enquiry.classInterest,
        guardianName: enquiry.guardianName,
        guardianPhone: enquiry.guardianPhone,
        source: enquiry.source,
        enquiryDate: enquiry.enquiryDate,
        stage: enquiry.stage,
        status: enquiry.status,
        notesSummary: enquiry.notesSummary || ''
      });
      setErrors({});
      return;
    }

    setValues({
      ...DEFAULT_FORM,
      enquiryDate: new Date().toISOString().slice(0, 10)
    });
    setErrors({});
  }, [open, isEdit, enquiry]);

  const handleChange = <K extends keyof AdmissionsFormValues>(
    key: K,
    value: AdmissionsFormValues[K]
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof AdmissionsFormValues, string>> = {};

    if (!values.studentName.trim()) {
      nextErrors.studentName = 'Student name is required.';
    }

    if (!values.enquiryDate.trim()) {
      nextErrors.enquiryDate = 'Enquiry date is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);

      if (isEdit && enquiryId) {
        await updateEnquiry({ enquiryId: enquiryId as Id<'admissionsEnquiries'>, ...values });
        toast.success('Admissions enquiry updated');
      } else {
        await createEnquiry(values);
        toast.success('Admissions enquiry added');
      }

      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save admissions enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const resolvedLabel = buttonLabel || (isEdit ? 'Update' : 'Add enquiry');

  const trigger = (
    <Button
      className={buttonClassName}
      size={buttonSize}
      variant={buttonVariant}
      onClick={() => setOpen(true)}
    >
      {isEdit ? <Icons.edit className='h-4 w-4' /> : <Icons.add className='h-4 w-4' />}{' '}
      {resolvedLabel}
    </Button>
  );

  const content = (
    <>
      {isEdit && enquiry === undefined ? (
        <div className='p-4 text-sm text-muted-foreground'>Loading admissions enquiry...</div>
      ) : (
        <>
          <div className='flex-1 overflow-y-auto px-0 md:px-0'>
            <AdmissionsFormFields
              values={values}
              onChange={handleChange}
              errors={errors}
              isSubmitting={submitting}
            />
          </div>
          <div className='mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end'>
            <Button variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button isLoading={submitting} onClick={handleSubmit}>
              <Icons.check className='h-4 w-4' /> {isEdit ? 'Update enquiry' : 'Create enquiry'}
            </Button>
          </div>
        </>
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>
                {isEdit ? 'Update admissions enquiry' : 'Add admissions enquiry'}
              </DrawerTitle>
              <DrawerDescription>
                Keep the admissions pipeline current with the latest family context and stage.
              </DrawerDescription>
            </DrawerHeader>
            <div className='overflow-y-auto px-4 pb-4'>{content}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className='flex flex-col sm:max-w-xl'>
          <SheetHeader>
            <SheetTitle>
              {isEdit ? 'Update admissions enquiry' : 'Add admissions enquiry'}
            </SheetTitle>
            <SheetDescription>
              Keep the admissions pipeline current with the latest family context and stage.
            </SheetDescription>
          </SheetHeader>
          <div className='flex-1 overflow-y-auto pr-1'>{content}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
