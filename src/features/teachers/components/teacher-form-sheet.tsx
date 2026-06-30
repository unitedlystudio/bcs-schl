'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
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

const DEFAULT_FORM = {
  fullName: '',
  preferredName: '',
  role: 'Teacher' as 'Teacher' | 'Homeroom Teacher' | 'Teaching Assistant',
  status: 'Active' as 'Active' | 'On Leave',
  academicYear: '',
  homeroomClass: '',
  email: '',
  phone: ''
};

type TeacherFormValues = typeof DEFAULT_FORM;

function TeacherFormFields({
  values,
  onChange,
  errors,
  isSubmitting,
  academicYears,
  homeroomClasses
}: {
  values: TeacherFormValues;
  onChange: <K extends keyof TeacherFormValues>(key: K, value: TeacherFormValues[K]) => void;
  errors: Partial<Record<keyof TeacherFormValues, string>>;
  isSubmitting: boolean;
  academicYears: string[];
  homeroomClasses: string[];
}) {
  return (
    <div className='grid gap-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='teacher-full-name'>Full name</Label>
          <Input
            id='teacher-full-name'
            value={values.fullName}
            onChange={(event) => onChange('fullName', event.target.value)}
            placeholder='Alya Rahman'
            disabled={isSubmitting}
          />
          {errors.fullName ? <p className='text-sm text-destructive'>{errors.fullName}</p> : null}
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='teacher-preferred-name'>Preferred name</Label>
          <Input
            id='teacher-preferred-name'
            value={values.preferredName}
            onChange={(event) => onChange('preferredName', event.target.value)}
            placeholder='Alya'
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label>Role</Label>
          <Select
            value={values.role}
            onValueChange={(value) => onChange('role', value as TeacherFormValues['role'])}
          >
            <SelectTrigger disabled={isSubmitting}>
              <SelectValue placeholder='Select role' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Teacher'>Teacher</SelectItem>
              <SelectItem value='Homeroom Teacher'>Homeroom Teacher</SelectItem>
              <SelectItem value='Teaching Assistant'>Teaching Assistant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label>Status</Label>
          <Select
            value={values.status}
            onValueChange={(value) => onChange('status', value as TeacherFormValues['status'])}
          >
            <SelectTrigger disabled={isSubmitting}>
              <SelectValue placeholder='Select status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Active'>Active</SelectItem>
              <SelectItem value='On Leave'>On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label>Academic year</Label>
          <Select
            value={values.academicYear || '__none'}
            onValueChange={(value) => onChange('academicYear', value === '__none' ? '' : value)}
          >
            <SelectTrigger disabled={isSubmitting}>
              <SelectValue placeholder='Choose academic year' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__none'>No academic year yet</SelectItem>
              {academicYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label>Homeroom class</Label>
          <Select
            value={values.homeroomClass || '__none'}
            onValueChange={(value) => onChange('homeroomClass', value === '__none' ? '' : value)}
          >
            <SelectTrigger disabled={isSubmitting}>
              <SelectValue placeholder='Choose homeroom class' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__none'>No homeroom assignment</SelectItem>
              {homeroomClasses.map((className) => (
                <SelectItem key={className} value={className}>
                  {className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='teacher-email'>Email</Label>
          <Input
            id='teacher-email'
            value={values.email}
            onChange={(event) => onChange('email', event.target.value)}
            placeholder='alya@schly.school'
            disabled={isSubmitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='teacher-phone'>Phone</Label>
          <Input
            id='teacher-phone'
            value={values.phone}
            onChange={(event) => onChange('phone', event.target.value)}
            placeholder='+62 812 5555 2001'
            disabled={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}

export function TeacherFormSheet({
  open,
  onOpenChange,
  teacherId,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId?: string | null;
  onSaved?: () => void;
}) {
  const isEdit = Boolean(teacherId);
  const createTeacher = useMutation(api.teachers.create);
  const updateTeacher = useMutation(api.teachers.update);
  const teacher = useQuery(
    api.teachers.getById,
    teacherId ? { teacherId: teacherId as Id<'teachers'> } : 'skip'
  );
  const studentFilterOptions = useQuery(api.students.listFilterOptions, {});
  const [values, setValues] = useState<TeacherFormValues>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof TeacherFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEdit) {
      if (teacher === undefined || !teacher) {
        return;
      }

      setValues({
        fullName: teacher.fullName,
        preferredName: teacher.preferredName,
        role: teacher.role,
        status: teacher.status,
        academicYear: teacher.academicYear,
        homeroomClass: teacher.homeroomClass,
        email: teacher.email,
        phone: teacher.phone
      });
      setErrors({});
      return;
    }

    setValues(DEFAULT_FORM);
    setErrors({});
  }, [open, isEdit, teacher]);

  const handleChange = <K extends keyof TeacherFormValues>(key: K, value: TeacherFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof TeacherFormValues, string>> = {};

    if (!values.fullName.trim()) {
      nextErrors.fullName = 'Teacher full name is required.';
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

      if (isEdit && teacherId) {
        await updateTeacher({
          teacherId: teacherId as Id<'teachers'>,
          ...values
        });
        toast.success('Teacher updated');
      } else {
        await createTeacher(values);
        toast.success('Teacher added to Schly');
      }

      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const academicYears = studentFilterOptions?.academicYears ?? [];
  const homeroomClasses = studentFilterOptions
    ? Array.from(
        new Set(
          Object.values(studentFilterOptions.classesByYear)
            .flat()
            .map((entry) => entry.className)
        )
      )
    : [];

  const content =
    isEdit && teacher === undefined ? (
      <div className='p-4 text-sm text-muted-foreground'>Loading teacher profile...</div>
    ) : isEdit && !teacher ? (
      <div className='p-4 text-sm text-muted-foreground'>Teacher record could not be loaded.</div>
    ) : (
      <TeacherFormFields
        values={values}
        onChange={handleChange}
        errors={errors}
        isSubmitting={submitting}
        academicYears={academicYears}
        homeroomClasses={homeroomClasses}
      />
    );

  const footer = (
    <>
      {isEdit && teacherId ? (
        <Button variant='outline' asChild>
          <Link href={`/dashboard/staffing?teacherId=${teacherId}`}>Open staffing</Link>
        </Button>
      ) : null}
      <Button variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={submitting || (isEdit && teacher === undefined)}>
        {submitting ? <Icons.spinner className='mr-2 h-4 w-4 animate-spin' /> : null}
        {isEdit ? 'Save teacher' : 'Add teacher'}
      </Button>
    </>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-[92vw] overflow-y-auto sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Manage teacher assignment' : 'Add teacher'}</SheetTitle>
          <SheetDescription>
            Keep teacher ownership editable so class/year assignment stays operational, not
            hard-coded.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid gap-4'>{content}</div>
        <SheetFooter className='mt-6'>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function AddTeacherButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick} size='sm'>
      <Icons.add className='mr-2 h-4 w-4' />
      Add teacher
    </Button>
  );
}
