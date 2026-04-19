'use client';

import { useEffect, useState } from 'react';
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
import { useIsMobile } from '@/hooks/use-mobile';

const DEFAULT_FORM = {
  label: '',
  startTime: '07:45',
  endTime: '08:15',
  blockType: 'Arrival' as
    | 'Arrival'
    | 'Lesson'
    | 'Break'
    | 'Lunch'
    | 'Specialist'
    | 'Assembly'
    | 'Dismissal',
  sortOrder: '1',
  isActive: 'true'
};

export function OperationsTimeSlotSheet({
  open,
  onOpenChange,
  timeSlotId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeSlotId?: string | null;
}) {
  const isMobile = useIsMobile();
  const timeSlots = useQuery(api.operations.listTimeSlots, {});
  const upsertTimeSlot = useMutation(api.operations.upsertTimeSlot);
  const [values, setValues] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const slot = timeSlots?.find((item) => item.id === timeSlotId);
  const isEdit = Boolean(timeSlotId);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      if (!slot) return;
      setValues({
        label: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime,
        blockType: slot.blockType,
        sortOrder: String(slot.sortOrder),
        isActive: slot.isActive ? 'true' : 'false'
      });
      return;
    }
    setValues(DEFAULT_FORM);
  }, [open, isEdit, slot]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await upsertTimeSlot({
        timeSlotId: timeSlotId ? (timeSlotId as Id<'operationsTimeSlots'>) : undefined,
        label: values.label,
        startTime: values.startTime,
        endTime: values.endTime,
        blockType: values.blockType,
        sortOrder: Number(values.sortOrder || 0),
        isActive: values.isActive === 'true'
      });
      toast.success(isEdit ? 'Time slot updated' : 'Time slot added');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save time slot');
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className='grid gap-4'>
      <div className='grid gap-2'>
        <Label htmlFor='slotLabel'>Label</Label>
        <Input
          id='slotLabel'
          value={values.label}
          onChange={(event) => setValues((current) => ({ ...current, label: event.target.value }))}
          placeholder='Morning arrival'
          disabled={submitting}
        />
      </div>
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='slotStart'>Start time</Label>
          <Input
            id='slotStart'
            type='time'
            value={values.startTime}
            onChange={(event) =>
              setValues((current) => ({ ...current, startTime: event.target.value }))
            }
            disabled={submitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='slotEnd'>End time</Label>
          <Input
            id='slotEnd'
            type='time'
            value={values.endTime}
            onChange={(event) =>
              setValues((current) => ({ ...current, endTime: event.target.value }))
            }
            disabled={submitting}
          />
        </div>
      </div>
      <div className='grid gap-4 md:grid-cols-3'>
        <div className='grid gap-2'>
          <Label>Block type</Label>
          <Select
            value={values.blockType}
            onValueChange={(value) =>
              setValues((current) => ({ ...current, blockType: value as typeof values.blockType }))
            }
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Arrival'>Arrival</SelectItem>
              <SelectItem value='Lesson'>Lesson</SelectItem>
              <SelectItem value='Break'>Break</SelectItem>
              <SelectItem value='Lunch'>Lunch</SelectItem>
              <SelectItem value='Specialist'>Specialist</SelectItem>
              <SelectItem value='Assembly'>Assembly</SelectItem>
              <SelectItem value='Dismissal'>Dismissal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='slotSortOrder'>Sort order</Label>
          <Input
            id='slotSortOrder'
            type='number'
            value={values.sortOrder}
            onChange={(event) =>
              setValues((current) => ({ ...current, sortOrder: event.target.value }))
            }
            disabled={submitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label>Active</Label>
          <Select
            value={values.isActive}
            onValueChange={(value) => setValues((current) => ({ ...current, isActive: value }))}
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='true'>Active</SelectItem>
              <SelectItem value='false'>Inactive</SelectItem>
            </SelectContent>
          </Select>
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
        {isEdit ? 'Save changes' : 'Add time slot'}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{isEdit ? 'Edit time slot' : 'Add time slot'}</DrawerTitle>
            <DrawerDescription>
              Define the stable school-day slots that weekly timetable blocks sit inside.
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
      <SheetContent className='sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit time slot' : 'Add time slot'}</SheetTitle>
          <SheetDescription>
            Define the stable school-day slots that weekly timetable blocks sit inside.
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 grid gap-4'>{content}</div>
        <SheetFooter className='mt-6'>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
