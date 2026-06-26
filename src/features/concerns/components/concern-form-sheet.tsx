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
  title: '',
  category: 'Learning Support' as
    | 'Learning Support'
    | 'Behaviour'
    | 'Attendance'
    | 'Family'
    | 'Medical'
    | 'Safeguarding',
  severity: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
  status: 'Open' as 'Open' | 'Monitoring' | 'Escalated' | 'Resolved',
  visibility: 'Standard' as 'Standard' | 'Restricted',
  assignedTeacherId: '',
  summary: '',
  nextReviewDate: '',
  initialUpdate: ''
};

type ConcernFormValues = typeof DEFAULT_FORM;

function ConcernFormFields({
  values,
  onChange,
  errors,
  isSubmitting,
  studentOptions,
  teacherOptions,
  isEdit
}: {
  values: ConcernFormValues;
  onChange: <K extends keyof ConcernFormValues>(key: K, value: ConcernFormValues[K]) => void;
  errors: Partial<Record<keyof ConcernFormValues, string>>;
  isSubmitting: boolean;
  studentOptions: Array<{ id: string; label: string }>;
  teacherOptions: Array<{ id: string; label: string }>;
  isEdit: boolean;
}) {
  return (
    <div className='grid gap-4'>
      <div className='grid gap-2'>
        <Label>Student</Label>
        <Select value={values.studentId} onValueChange={(value) => onChange('studentId', value)}>
          <SelectTrigger disabled={isSubmitting || isEdit}>
            <SelectValue placeholder='Choose student' />
          </SelectTrigger>
          <SelectContent>
            {studentOptions.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.studentId ? <p className='text-sm text-destructive'>{errors.studentId}</p> : null}
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='concern-title'>Concern title</Label>
        <Input
          id='concern-title'
          value={values.title}
          onChange={(event) => onChange('title', event.target.value)}
          placeholder='Pattern of escalating lunch-time behaviour'
          disabled={isSubmitting}
        />
        {errors.title ? <p className='text-sm text-destructive'>{errors.title}</p> : null}
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label>Category</Label>
          <Select
            value={values.category}
            onValueChange={(value) => onChange('category', value as ConcernFormValues['category'])}
          >
            <SelectTrigger disabled={isSubmitting}>
              <SelectValue placeholder='Choose category' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Learning Support'>Learning Support</SelectItem>
              <SelectItem value='Behaviour'>Behaviour</SelectItem>
              <SelectItem value='Attendance'>Attendance</SelectItem>
              <SelectItem value='Family'>Family</SelectItem>
              <SelectItem value='Medical'>Medical</SelectItem>
              <SelectItem value='Safeguarding'>Safeguarding</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label>Severity</Label>
          <Select
            value={values.severity}
            onValueChange={(value) => onChange('severity', value as ConcernFormValues['severity'])}
          >
            <SelectTrigger disabled={isSubmitting}>
              <SelectValue placeholder='Choose severity' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Low'>Low</SelectItem>
              <SelectItem value='Medium'>Medium</SelectItem>
              <SelectItem value='High'>High</SelectItem>
              <SelectItem value='Critical'>Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='grid gap-2'>
          <Label>Status</Label>
          <Select
            value={values.status}
            onValueChange={(value) => onChange('status', value as ConcernFormValues['status'])}
          >
            <SelectTrigger disabled={isSubmitting}>
              <SelectValue placeholder='Choose status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Open'>Open</SelectItem>
              <SelectItem value='Monitoring'>Monitoring</SelectItem>
              <SelectItem value='Escalated'>Escalated</SelectItem>
              <SelectItem value='Resolved'>Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label>Visibility</Label>
          <Select
            value={values.visibility}
            onValueChange={(value) =>
              onChange('visibility', value as ConcernFormValues['visibility'])
            }
          >
            <SelectTrigger disabled={isSubmitting}>
              <SelectValue placeholder='Choose visibility' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Standard'>Standard</SelectItem>
              <SelectItem value='Restricted'>Restricted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='next-review-date'>Next review date</Label>
          <Input
            id='next-review-date'
            type='date'
            value={values.nextReviewDate}
            onChange={(event) => onChange('nextReviewDate', event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className='grid gap-2'>
        <Label>Assigned owner</Label>
        <Select
          value={values.assignedTeacherId || '__none'}
          onValueChange={(value) => onChange('assignedTeacherId', value === '__none' ? '' : value)}
        >
          <SelectTrigger disabled={isSubmitting}>
            <SelectValue placeholder='Choose teacher owner' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__none'>Unassigned</SelectItem>
            {teacherOptions.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='concern-summary'>Case summary</Label>
        <Textarea
          id='concern-summary'
          value={values.summary}
          onChange={(event) => onChange('summary', event.target.value)}
          placeholder='Describe the live concern, impact, and why follow-up is needed.'
          disabled={isSubmitting}
          rows={4}
        />
        {errors.summary ? <p className='text-sm text-destructive'>{errors.summary}</p> : null}
      </div>

      {!isEdit ? (
        <div className='grid gap-2'>
          <Label htmlFor='concern-initial-update'>Initial note / evidence</Label>
          <Textarea
            id='concern-initial-update'
            value={values.initialUpdate}
            onChange={(event) => onChange('initialUpdate', event.target.value)}
            placeholder='Add the first operational note, meeting summary, or safeguarding context.'
            disabled={isSubmitting}
            rows={3}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ConcernFormSheet({
  open,
  onOpenChange,
  caseId,
  defaultStudentId,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId?: string | null;
  defaultStudentId?: string | null;
  onSaved?: () => void;
}) {
  const isMobile = useIsMobile();
  const isEdit = Boolean(caseId);
  const createCase = useMutation(api.concerns.create);
  const updateCase = useMutation(api.concerns.update);
  const concern = useQuery(
    api.concerns.getById,
    caseId ? { caseId: caseId as Id<'concernCases'> } : 'skip'
  );
  const students = useQuery(api.students.list, {});
  const teachers = useQuery(api.teachers.list, {});
  const [values, setValues] = useState<ConcernFormValues>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ConcernFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEdit) {
      if (concern === undefined || !concern) {
        return;
      }

      setValues({
        studentId: concern.studentId,
        title: concern.title,
        category: concern.category,
        severity: concern.severity,
        status: concern.status,
        visibility: concern.visibility,
        assignedTeacherId: concern.assignedTeacherId ?? '',
        summary: concern.summary,
        nextReviewDate: concern.nextReviewDate ?? '',
        initialUpdate: ''
      });
      setErrors({});
      return;
    }

    setValues({
      ...DEFAULT_FORM,
      studentId: defaultStudentId ?? ''
    });
    setErrors({});
  }, [open, isEdit, concern, defaultStudentId]);

  const handleChange = <K extends keyof ConcernFormValues>(key: K, value: ConcernFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof ConcernFormValues, string>> = {};

    if (!values.studentId) {
      nextErrors.studentId = 'Student is required.';
    }

    if (!values.title.trim()) {
      nextErrors.title = 'Concern title is required.';
    }

    if (!values.summary.trim()) {
      nextErrors.summary = 'Case summary is required.';
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

      if (isEdit && caseId) {
        await updateCase({
          caseId: caseId as Id<'concernCases'>,
          studentId: values.studentId as Id<'students'>,
          title: values.title,
          category: values.category,
          severity: values.severity,
          status: values.status,
          visibility: values.visibility,
          assignedTeacherId: values.assignedTeacherId
            ? (values.assignedTeacherId as Id<'teachers'>)
            : undefined,
          summary: values.summary,
          nextReviewDate: values.nextReviewDate
        });
        toast.success('Concern case updated');
      } else {
        await createCase({
          studentId: values.studentId as Id<'students'>,
          title: values.title,
          category: values.category,
          severity: values.severity,
          status: values.status,
          visibility: values.visibility,
          assignedTeacherId: values.assignedTeacherId
            ? (values.assignedTeacherId as Id<'teachers'>)
            : undefined,
          summary: values.summary,
          nextReviewDate: values.nextReviewDate,
          initialUpdate: values.initialUpdate
        });
        toast.success('Concern case created');
      }

      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save concern case');
    } finally {
      setSubmitting(false);
    }
  };

  const studentOptions = useMemo(
    () =>
      (students ?? []).map((student) => ({
        id: student.id,
        label: `${student.fullName} • ${student.className}${student.academicYear ? ` • ${student.academicYear}` : ''}`
      })),
    [students]
  );
  const teacherOptions = useMemo(
    () =>
      (teachers ?? []).map((teacher) => ({
        id: teacher.id,
        label: `${teacher.fullName}${teacher.homeroomClass ? ` • ${teacher.homeroomClass}` : ''}`
      })),
    [teachers]
  );

  const content =
    isEdit && concern === undefined ? (
      <div className='p-4 text-sm text-muted-foreground'>Loading concern case...</div>
    ) : isEdit && !concern ? (
      <div className='p-4 text-sm text-muted-foreground'>Concern case could not be loaded.</div>
    ) : (
      <ConcernFormFields
        values={values}
        onChange={handleChange}
        errors={errors}
        isSubmitting={submitting}
        studentOptions={studentOptions}
        teacherOptions={teacherOptions}
        isEdit={isEdit}
      />
    );

  const footer = (
    <>
      <Button variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={submitting || (isEdit && concern === undefined)}>
        {submitting ? <Icons.spinner className='mr-2 h-4 w-4 animate-spin' /> : null}
        {isEdit ? 'Save case' : 'Create case'}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className='max-h-[85dvh] min-h-0'>
          <DrawerHeader className='shrink-0'>
            <DrawerTitle>{isEdit ? 'Manage concern case' : 'Add concern case'}</DrawerTitle>
            <DrawerDescription>
              Keep student support and intervention work in structured cases, not loose spreadsheet
              notes.
            </DrawerDescription>
          </DrawerHeader>
          <div className='min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4'>
            {content}
          </div>
          <DrawerFooter className='shrink-0'>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='sm:max-w-2xl'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Manage concern case' : 'Add concern case'}</SheetTitle>
          <SheetDescription>
            Keep student support and intervention work in structured cases, not loose spreadsheet
            notes.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid gap-4'>{content}</div>
        <SheetFooter className='mt-6'>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
