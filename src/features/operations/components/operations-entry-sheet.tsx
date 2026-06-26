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
  academicYear: '',
  className: '',
  weekday: 'Monday' as 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday',
  timeSlotId: '',
  activityTitle: '',
  area: '',
  leadTeacherId: '',
  location: '',
  specialistLabel: '',
  lunchLabel: '',
  themeLabel: '',
  note: ''
};

export function TimetableEntrySheet({
  open,
  onOpenChange,
  entryId,
  defaultAcademicYear,
  defaultClassName,
  defaultWeekday,
  defaultTimeSlotId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId?: string | null;
  defaultAcademicYear?: string;
  defaultClassName?: string;
  defaultWeekday?: string;
  defaultTimeSlotId?: string;
}) {
  const isMobile = useIsMobile();
  const filters = useQuery(api.operations.listFilters, {});
  const entry = useQuery(
    api.operations.getEntryById,
    entryId ? { entryId: entryId as Id<'classTimetableEntries'> } : 'skip'
  );
  const upsertClassEntry = useMutation(api.operations.upsertClassEntry);
  const [values, setValues] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(entryId);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      if (!entry) return;
      setValues({
        academicYear: entry.academicYear,
        className: entry.className,
        weekday: entry.weekday,
        timeSlotId: entry.timeSlotId,
        activityTitle: entry.activityTitle,
        area: entry.area,
        leadTeacherId: entry.leadTeacherId ?? '',
        location: entry.location,
        specialistLabel: entry.specialistLabel,
        lunchLabel: entry.lunchLabel,
        themeLabel: entry.themeLabel,
        note: entry.note
      });
      return;
    }

    setValues({
      ...DEFAULT_FORM,
      academicYear: defaultAcademicYear ?? filters?.academicYears[0] ?? '',
      className: defaultClassName ?? '',
      weekday: (defaultWeekday as typeof DEFAULT_FORM.weekday) ?? 'Monday',
      timeSlotId: defaultTimeSlotId ?? filters?.timeSlots[0]?.id ?? ''
    });
  }, [
    open,
    isEdit,
    entry,
    defaultAcademicYear,
    defaultClassName,
    defaultWeekday,
    defaultTimeSlotId,
    filters
  ]);

  const classOptions = useMemo(() => {
    if (!filters) return [];
    return filters.classes.filter((item) => {
      if (!values.academicYear) return true;
      return item.academicYear === values.academicYear;
    });
  }, [filters, values.academicYear]);

  useEffect(() => {
    if (!open || isEdit) return;
    if (!classOptions.length) {
      setValues((current) => ({ ...current, className: '' }));
      return;
    }
    if (!classOptions.some((item) => item.className === values.className)) {
      setValues((current) => ({ ...current, className: classOptions[0].className }));
    }
  }, [classOptions, isEdit, open, values.className]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await upsertClassEntry({
        entryId: entryId ? (entryId as Id<'classTimetableEntries'>) : undefined,
        academicYear: values.academicYear,
        className: values.className,
        weekday: values.weekday,
        timeSlotId: values.timeSlotId as Id<'operationsTimeSlots'>,
        activityTitle: values.activityTitle,
        area: values.area || undefined,
        leadTeacherId: values.leadTeacherId ? (values.leadTeacherId as Id<'teachers'>) : undefined,
        location: values.location || undefined,
        specialistLabel: values.specialistLabel || undefined,
        lunchLabel: values.lunchLabel || undefined,
        themeLabel: values.themeLabel || undefined,
        note: values.note || undefined
      });
      toast.success(isEdit ? 'Timetable block updated' : 'Timetable block added');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save timetable block');
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className='grid gap-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label>Academic year</Label>
          <Select
            value={values.academicYear}
            onValueChange={(value) => setValues((current) => ({ ...current, academicYear: value }))}
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue placeholder='Choose academic year' />
            </SelectTrigger>
            <SelectContent>
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
            value={values.className}
            onValueChange={(value) => setValues((current) => ({ ...current, className: value }))}
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue placeholder='Choose class' />
            </SelectTrigger>
            <SelectContent>
              {classOptions.map((item) => (
                <SelectItem key={`${item.academicYear}::${item.className}`} value={item.className}>
                  {item.className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label>Weekday</Label>
          <Select
            value={values.weekday}
            onValueChange={(value) =>
              setValues((current) => ({ ...current, weekday: value as typeof values.weekday }))
            }
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Monday'>Monday</SelectItem>
              <SelectItem value='Tuesday'>Tuesday</SelectItem>
              <SelectItem value='Wednesday'>Wednesday</SelectItem>
              <SelectItem value='Thursday'>Thursday</SelectItem>
              <SelectItem value='Friday'>Friday</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label>Time slot</Label>
          <Select
            value={values.timeSlotId}
            onValueChange={(value) => setValues((current) => ({ ...current, timeSlotId: value }))}
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue placeholder='Choose time slot' />
            </SelectTrigger>
            <SelectContent>
              {filters?.timeSlots.map((slot) => (
                <SelectItem key={slot.id} value={slot.id}>
                  {slot.label} • {slot.startTime}–{slot.endTime}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='activityTitle'>Activity title</Label>
        <Input
          id='activityTitle'
          value={values.activityTitle}
          onChange={(event) =>
            setValues((current) => ({ ...current, activityTitle: event.target.value }))
          }
          placeholder='Numeracy block'
          disabled={submitting}
        />
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='area'>Area / subject</Label>
          <Input
            id='area'
            value={values.area}
            onChange={(event) => setValues((current) => ({ ...current, area: event.target.value }))}
            placeholder='Literacy'
            disabled={submitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label>Lead teacher</Label>
          <Select
            value={values.leadTeacherId || '__none'}
            onValueChange={(value) =>
              setValues((current) => ({
                ...current,
                leadTeacherId: value === '__none' ? '' : value
              }))
            }
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue placeholder='Optional lead teacher' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__none'>No lead teacher</SelectItem>
              {filters?.teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='grid gap-2'>
          <Label htmlFor='location'>Location</Label>
          <Input
            id='location'
            value={values.location}
            onChange={(event) =>
              setValues((current) => ({ ...current, location: event.target.value }))
            }
            placeholder='West wing'
            disabled={submitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='specialistLabel'>Specialist</Label>
          <Input
            id='specialistLabel'
            value={values.specialistLabel}
            onChange={(event) =>
              setValues((current) => ({ ...current, specialistLabel: event.target.value }))
            }
            placeholder='Music'
            disabled={submitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='lunchLabel'>Lunch / flow</Label>
          <Input
            id='lunchLabel'
            value={values.lunchLabel}
            onChange={(event) =>
              setValues((current) => ({ ...current, lunchLabel: event.target.value }))
            }
            placeholder='Infants lunch'
            disabled={submitting}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='themeLabel'>Theme</Label>
          <Input
            id='themeLabel'
            value={values.themeLabel}
            onChange={(event) =>
              setValues((current) => ({ ...current, themeLabel: event.target.value }))
            }
            placeholder='Kindness'
            disabled={submitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='note'>Operational note</Label>
          <Textarea
            id='note'
            value={values.note}
            onChange={(event) => setValues((current) => ({ ...current, note: event.target.value }))}
            placeholder='Any short operational note for this block.'
            rows={3}
            disabled={submitting}
          />
        </div>
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
        {isEdit ? 'Save changes' : 'Add block'}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className='max-h-[85dvh] min-h-0'>
          <DrawerHeader className='shrink-0'>
            <DrawerTitle>{isEdit ? 'Edit timetable block' : 'Add timetable block'}</DrawerTitle>
            <DrawerDescription>
              Keep weekly class structure stable here, then use overrides for day-specific changes.
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
          <SheetTitle>{isEdit ? 'Edit timetable block' : 'Add timetable block'}</SheetTitle>
          <SheetDescription>
            Keep weekly class structure stable here, then use overrides for day-specific changes.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid gap-4'>{content}</div>
        <SheetFooter className='mt-6'>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
