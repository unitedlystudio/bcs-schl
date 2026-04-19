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
  overrideDate: new Date().toISOString().slice(0, 10),
  academicYear: '',
  className: '',
  timeSlotId: '',
  overrideType: 'Cover' as
    | 'Cover'
    | 'Medical'
    | 'Lunch'
    | 'Specialist'
    | 'Room Change'
    | 'Trip'
    | 'Absence'
    | 'General',
  status: 'Open' as 'Open' | 'Confirmed' | 'Resolved',
  teacherId: '',
  studentId: '',
  title: '',
  summary: ''
};

export function OperationsOverrideSheet({
  open,
  onOpenChange,
  overrideId,
  defaultAcademicYear,
  defaultClassName,
  defaultDate
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overrideId?: string | null;
  defaultAcademicYear?: string;
  defaultClassName?: string;
  defaultDate?: string;
}) {
  const isMobile = useIsMobile();
  const filters = useQuery(api.operations.listFilters, {});
  const override = useQuery(
    api.operations.getOverrideById,
    overrideId ? { overrideId: overrideId as Id<'operationsOverrides'> } : 'skip'
  );
  const createOverride = useMutation(api.operations.createOverride);
  const updateOverride = useMutation(api.operations.updateOverride);
  const [values, setValues] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(overrideId);

  const classOptions = useMemo(() => {
    if (!filters) return [];
    return filters.classes.filter((item) => {
      if (!values.academicYear) return true;
      return item.academicYear === values.academicYear;
    });
  }, [filters, values.academicYear]);

  const studentOptions = useMemo(() => {
    if (!filters) return [];
    return filters.students.filter((student) => {
      if (values.className && student.className !== values.className) return false;
      if (values.academicYear && student.academicYear !== values.academicYear) return false;
      return true;
    });
  }, [filters, values.academicYear, values.className]);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      if (!override) return;
      setValues({
        overrideDate: override.overrideDate,
        academicYear: override.academicYear,
        className: override.className,
        timeSlotId: override.timeSlotId ?? '',
        overrideType: override.overrideType,
        status: override.status,
        teacherId: override.teacherId ?? '',
        studentId: override.studentId ?? '',
        title: override.title,
        summary: override.summary
      });
      return;
    }

    setValues({
      ...DEFAULT_FORM,
      overrideDate: defaultDate ?? DEFAULT_FORM.overrideDate,
      academicYear: defaultAcademicYear ?? filters?.academicYears[0] ?? '',
      className: defaultClassName ?? ''
    });
  }, [open, isEdit, override, defaultAcademicYear, defaultClassName, defaultDate, filters]);

  useEffect(() => {
    if (!open || isEdit) return;
    if (!classOptions.length) return;
    if (!values.className || !classOptions.some((item) => item.className === values.className)) {
      setValues((current) => ({ ...current, className: classOptions[0].className }));
    }
  }, [classOptions, isEdit, open, values.className]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const payload = {
        overrideDate: values.overrideDate,
        academicYear: values.academicYear || undefined,
        className: values.className || undefined,
        timeSlotId: values.timeSlotId
          ? (values.timeSlotId as Id<'operationsTimeSlots'>)
          : undefined,
        overrideType: values.overrideType,
        status: values.status,
        teacherId: values.teacherId ? (values.teacherId as Id<'teachers'>) : undefined,
        studentId: values.studentId ? (values.studentId as Id<'students'>) : undefined,
        title: values.title,
        summary: values.summary
      };

      if (overrideId) {
        await updateOverride({ overrideId: overrideId as Id<'operationsOverrides'>, ...payload });
      } else {
        await createOverride(payload);
      }

      toast.success(isEdit ? 'Override updated' : 'Override added');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save override');
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className='grid gap-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='overrideDate'>Date</Label>
          <Input
            id='overrideDate'
            type='date'
            value={values.overrideDate}
            onChange={(event) =>
              setValues((current) => ({ ...current, overrideDate: event.target.value }))
            }
            disabled={submitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label>Override type</Label>
          <Select
            value={values.overrideType}
            onValueChange={(value) =>
              setValues((current) => ({
                ...current,
                overrideType: value as typeof values.overrideType
              }))
            }
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Cover'>Cover</SelectItem>
              <SelectItem value='Medical'>Medical</SelectItem>
              <SelectItem value='Lunch'>Lunch</SelectItem>
              <SelectItem value='Specialist'>Specialist</SelectItem>
              <SelectItem value='Room Change'>Room Change</SelectItem>
              <SelectItem value='Trip'>Trip</SelectItem>
              <SelectItem value='Absence'>Absence</SelectItem>
              <SelectItem value='General'>General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label>Academic year</Label>
          <Select
            value={values.academicYear || '__none'}
            onValueChange={(value) =>
              setValues((current) => ({
                ...current,
                academicYear: value === '__none' ? '' : value
              }))
            }
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue placeholder='Optional academic year' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__none'>No academic year</SelectItem>
              {filters?.academicYears.map((academicYear) => (
                <SelectItem key={academicYear} value={academicYear}>
                  {academicYear}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label>Class</Label>
          <Select
            value={values.className || '__none'}
            onValueChange={(value) =>
              setValues((current) => ({ ...current, className: value === '__none' ? '' : value }))
            }
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue placeholder='Optional class' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__none'>No class</SelectItem>
              {classOptions.map((item) => (
                <SelectItem key={`${item.academicYear}::${item.className}`} value={item.className}>
                  {item.className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='grid gap-2'>
          <Label>Time slot</Label>
          <Select
            value={values.timeSlotId || '__none'}
            onValueChange={(value) =>
              setValues((current) => ({ ...current, timeSlotId: value === '__none' ? '' : value }))
            }
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue placeholder='Optional time slot' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__none'>Whole day</SelectItem>
              {filters?.timeSlots.map((slot) => (
                <SelectItem key={slot.id} value={slot.id}>
                  {slot.label} • {slot.startTime}–{slot.endTime}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label>Status</Label>
          <Select
            value={values.status}
            onValueChange={(value) =>
              setValues((current) => ({ ...current, status: value as typeof values.status }))
            }
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Open'>Open</SelectItem>
              <SelectItem value='Confirmed'>Confirmed</SelectItem>
              <SelectItem value='Resolved'>Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label>Teacher</Label>
          <Select
            value={values.teacherId || '__none'}
            onValueChange={(value) =>
              setValues((current) => ({ ...current, teacherId: value === '__none' ? '' : value }))
            }
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue placeholder='Optional teacher' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__none'>No teacher</SelectItem>
              {filters?.teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-2'>
        <Label>Student</Label>
        <Select
          value={values.studentId || '__none'}
          onValueChange={(value) =>
            setValues((current) => ({ ...current, studentId: value === '__none' ? '' : value }))
          }
        >
          <SelectTrigger disabled={submitting}>
            <SelectValue placeholder='Optional student' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__none'>No student</SelectItem>
            {studentOptions.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='overrideTitle'>Title</Label>
        <Input
          id='overrideTitle'
          value={values.title}
          onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
          placeholder='Lunch cover shift needed'
          disabled={submitting}
        />
      </div>
      <div className='grid gap-2'>
        <Label htmlFor='overrideSummary'>Summary</Label>
        <Textarea
          id='overrideSummary'
          value={values.summary}
          onChange={(event) =>
            setValues((current) => ({ ...current, summary: event.target.value }))
          }
          placeholder='What changed today, who is affected, and what needs follow-up?'
          rows={4}
          disabled={submitting}
        />
      </div>
    </div>
  );

  const footer = (
    <>
      <Button variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={submitting}>
        {submitting ? <Icons.spinner className='mr-2 h-4 w-4 animate-spin' /> : null}
        {isEdit ? 'Save changes' : 'Add override'}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{isEdit ? 'Edit override' : 'Add override'}</DrawerTitle>
            <DrawerDescription>
              Record the day-specific changes that should not permanently rewrite the timetable.
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
      <SheetContent className='sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit override' : 'Add override'}</SheetTitle>
          <SheetDescription>
            Record the day-specific changes that should not permanently rewrite the timetable.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid gap-4'>{content}</div>
        <SheetFooter className='mt-6'>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
