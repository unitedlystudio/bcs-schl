'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'next/navigation';
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

const DEFAULT_FORM = {
  preferredName: '',
  fullName: '',
  sex: 'Unknown' as 'M' | 'F' | 'Unknown',
  academicYear: '',
  className: '',
  dateOfBirth: '',
  dateJoined: new Date().toISOString().slice(0, 10),
  nisn: '',
  religion: '',
  status: 'Active' as 'Active' | 'Pending' | 'Archived',
  guardianName: '',
  guardianPhone: '',
  medicalFlag: '',
  notesSummary: ''
};

type StudentFormValues = typeof DEFAULT_FORM;

type StudentFormProps = {
  studentId?: string;
  buttonClassName?: string;
  buttonLabel?: string;
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
};

function StudentFormFields({
  values,
  onChange,
  errors,
  isSubmitting
}: {
  values: StudentFormValues;
  onChange: <K extends keyof StudentFormValues>(key: K, value: StudentFormValues[K]) => void;
  errors: Partial<Record<keyof StudentFormValues, string>>;
  isSubmitting: boolean;
}) {
  return (
    <div className='grid gap-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='student-full-name'>Full name</Label>
          <Input
            id='student-full-name'
            value={values.fullName}
            onChange={(event) => onChange('fullName', event.target.value)}
            placeholder='Ava Thompson'
            disabled={isSubmitting}
          />
          {errors.fullName ? <p className='text-sm text-destructive'>{errors.fullName}</p> : null}
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='student-preferred-name'>Preferred name</Label>
          <Input
            id='student-preferred-name'
            value={values.preferredName}
            onChange={(event) => onChange('preferredName', event.target.value)}
            placeholder='Ava'
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='student-academic-year'>Academic year</Label>
          <Input
            id='student-academic-year'
            value={values.academicYear}
            onChange={(event) => onChange('academicYear', event.target.value)}
            placeholder='2025/2026'
            disabled={isSubmitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='student-class'>Class</Label>
          <Input
            id='student-class'
            value={values.className}
            onChange={(event) => onChange('className', event.target.value)}
            placeholder='Class 3'
            disabled={isSubmitting}
          />
          {errors.className ? <p className='text-sm text-destructive'>{errors.className}</p> : null}
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label>Status</Label>
          <Select
            value={values.status}
            onValueChange={(value) => onChange('status', value as StudentFormValues['status'])}
          >
            <SelectTrigger className='w-full' disabled={isSubmitting}>
              <SelectValue placeholder='Select status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Active'>Active</SelectItem>
              <SelectItem value='Pending'>Pending</SelectItem>
              <SelectItem value='Archived'>Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='grid gap-2'>
          <Label>Sex</Label>
          <Select
            value={values.sex}
            onValueChange={(value) => onChange('sex', value as StudentFormValues['sex'])}
          >
            <SelectTrigger className='w-full' disabled={isSubmitting}>
              <SelectValue placeholder='Select sex' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Unknown'>Unknown</SelectItem>
              <SelectItem value='F'>F</SelectItem>
              <SelectItem value='M'>M</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='student-date-of-birth'>Date of birth</Label>
          <Input
            id='student-date-of-birth'
            type='date'
            value={values.dateOfBirth}
            onChange={(event) => onChange('dateOfBirth', event.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='student-date-joined'>Date joined</Label>
          <Input
            id='student-date-joined'
            type='date'
            value={values.dateJoined}
            onChange={(event) => onChange('dateJoined', event.target.value)}
            disabled={isSubmitting}
          />
          {errors.dateJoined ? (
            <p className='text-sm text-destructive'>{errors.dateJoined}</p>
          ) : null}
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='student-nisn'>NISN</Label>
          <Input
            id='student-nisn'
            value={values.nisn}
            onChange={(event) => onChange('nisn', event.target.value)}
            placeholder='SCHLY-0005'
            disabled={isSubmitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='student-religion'>Religion</Label>
          <Input
            id='student-religion'
            value={values.religion}
            onChange={(event) => onChange('religion', event.target.value)}
            placeholder='Hindu'
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='student-guardian-name'>Guardian name</Label>
          <Input
            id='student-guardian-name'
            value={values.guardianName}
            onChange={(event) => onChange('guardianName', event.target.value)}
            placeholder='Sarah Thompson'
            disabled={isSubmitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='student-guardian-phone'>Guardian phone</Label>
          <Input
            id='student-guardian-phone'
            value={values.guardianPhone}
            onChange={(event) => onChange('guardianPhone', event.target.value)}
            placeholder='+62 812 0000 1005'
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='student-medical-flag'>Medical / support flag</Label>
        <Input
          id='student-medical-flag'
          value={values.medicalFlag}
          onChange={(event) => onChange('medicalFlag', event.target.value)}
          placeholder='Nut allergy'
          disabled={isSubmitting}
        />
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='student-notes-summary'>Notes summary</Label>
        <Textarea
          id='student-notes-summary'
          value={values.notesSummary}
          onChange={(event) => onChange('notesSummary', event.target.value)}
          placeholder='Anything operations or teachers should know on day one.'
          disabled={isSubmitting}
          rows={4}
        />
      </div>
    </div>
  );
}

export function StudentFormSheetTrigger({
  studentId,
  buttonClassName,
  buttonLabel,
  buttonSize = 'default',
  buttonVariant = 'default'
}: StudentFormProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const isEdit = Boolean(studentId);
  const createStudent = useMutation(api.students.create);
  const updateStudent = useMutation(api.students.update);
  const student = useQuery(
    api.students.getById,
    studentId ? { studentId: studentId as Id<'students'> } : 'skip'
  );
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<StudentFormValues>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof StudentFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEdit) {
      if (student === undefined || !student) {
        return;
      }

      setValues({
        preferredName: student.preferredName ?? '',
        fullName: student.fullName ?? '',
        sex: student.sex,
        academicYear: student.academicYear ?? '',
        className: student.className ?? '',
        dateOfBirth: student.dateOfBirth ?? '',
        dateJoined: student.dateJoined ?? '',
        nisn: student.nisn ?? '',
        religion: student.religion ?? '',
        status: student.status,
        guardianName: student.guardianName ?? '',
        guardianPhone: student.guardianPhone ?? '',
        medicalFlag: student.medicalFlag ?? '',
        notesSummary: student.notesSummary ?? ''
      });
      setErrors({});
      return;
    }

    setValues({
      ...DEFAULT_FORM,
      dateJoined: new Date().toISOString().slice(0, 10)
    });
    setErrors({});
  }, [open, isEdit, student]);

  const handleChange = <K extends keyof StudentFormValues>(key: K, value: StudentFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof StudentFormValues, string>> = {};

    if (!values.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }

    if (!values.className.trim()) {
      nextErrors.className = 'Class is required.';
    }

    if (!values.dateJoined.trim()) {
      nextErrors.dateJoined = 'Date joined is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setValues({
      ...DEFAULT_FORM,
      dateJoined: new Date().toISOString().slice(0, 10)
    });
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);

      if (isEdit && studentId) {
        const result = await updateStudent({
          studentId: studentId as Id<'students'>,
          ...values
        });
        toast.success('Student profile updated');
        setOpen(false);
        router.push(`/dashboard/students/${result.studentId}`);
        return;
      }

      const result = await createStudent(values);
      toast.success('Student added to Schly');
      setOpen(false);
      resetForm();
      router.push(`/dashboard/students/${result.studentId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to ${isEdit ? 'update' : 'add'} student`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resolvedLabel = buttonLabel || (isEdit ? 'Edit profile' : 'Add Student');

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

  const content =
    isEdit && student === undefined ? (
      <div className='p-4 text-sm text-muted-foreground'>Loading student profile...</div>
    ) : isEdit && !student ? (
      <div className='p-4 text-sm text-muted-foreground'>Student record could not be loaded.</div>
    ) : (
      <StudentFormFields
        values={values}
        onChange={handleChange}
        errors={errors}
        isSubmitting={submitting}
      />
    );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className='max-h-[85dvh] min-h-0'>
            <DrawerHeader className='shrink-0'>
              <DrawerTitle>{isEdit ? 'Edit student profile' : 'Add student'}</DrawerTitle>
              <DrawerDescription>
                {isEdit
                  ? 'Update the student record so attendance, admissions, and operations stay aligned.'
                  : 'Capture the core student record so the profile shell and attendance flows can use it.'}
              </DrawerDescription>
            </DrawerHeader>
            <div className='min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4'>
              {content}
            </div>
            <DrawerFooter className='shrink-0'>
              <Button variant='outline' onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button isLoading={submitting} onClick={handleSubmit}>
                <Icons.check className='h-4 w-4' /> {isEdit ? 'Save changes' : 'Create student'}
              </Button>
            </DrawerFooter>
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
            <SheetTitle>{isEdit ? 'Edit student profile' : 'Add student'}</SheetTitle>
            <SheetDescription>
              {isEdit
                ? 'Update the student record so attendance, admissions, and operations stay aligned.'
                : 'Capture the core student record so the profile shell and attendance flows can use it.'}
            </SheetDescription>
          </SheetHeader>
          <div className='flex-1 overflow-y-auto pr-1'>{content}</div>
          <SheetFooter>
            <Button variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button isLoading={submitting} onClick={handleSubmit}>
              <Icons.check className='h-4 w-4' /> {isEdit ? 'Save changes' : 'Create student'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function AddStudentSheetTrigger(props: Omit<StudentFormProps, 'studentId'>) {
  return <StudentFormSheetTrigger {...props} />;
}
