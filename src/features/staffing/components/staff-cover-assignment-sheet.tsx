'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
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

type CoverAssignmentInput = {
  id: string;
  coverDate: string;
  className: string;
  timeSlotLabel: string;
  primaryTeacherId: string;
  primaryTeacherName: string;
  coverTeacherId: string | null;
  status: 'Open' | 'Assigned' | 'Confirmed' | 'Completed';
  note: string;
};

export function StaffCoverAssignmentSheet({
  open,
  onOpenChange,
  assignment,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: CoverAssignmentInput | null;
  onSaved?: () => void;
}) {
  const isMobile = useIsMobile();
  const filters = useQuery(api.staffing.listFilters, {});
  const updateCoverAssignment = useMutation(api.staffing.updateCoverAssignment);
  const [coverTeacherId, setCoverTeacherId] = useState('__none');
  const [status, setStatus] = useState<CoverAssignmentInput['status']>('Open');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !assignment) return;

    setCoverTeacherId(assignment.coverTeacherId ?? '__none');
    setStatus(assignment.status);
    setNote(assignment.note);
  }, [open, assignment]);

  const teacherOptions = (filters?.teachers ?? []).filter(
    (teacher) => teacher.id !== assignment?.primaryTeacherId
  );

  const handleSubmit = async () => {
    if (!assignment) return;

    setSubmitting(true);
    try {
      await updateCoverAssignment({
        coverAssignmentId: assignment.id as Id<'staffCoverAssignments'>,
        coverTeacherId:
          coverTeacherId === '__none' ? undefined : (coverTeacherId as Id<'teachers'>),
        status,
        note
      });
      toast.success('Cover assignment updated');
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update cover assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const body = assignment ? (
    <div className='grid gap-6 px-4 py-1 sm:px-0'>
      <div className='rounded-xl border border-border/60 p-3 text-sm'>
        <div className='font-medium'>
          {assignment.className || 'Unassigned class'} •{' '}
          {assignment.timeSlotLabel || 'Unscheduled block'}
        </div>
        <div className='mt-1 text-muted-foreground'>
          {assignment.coverDate} • Primary teacher: {assignment.primaryTeacherName}
        </div>
      </div>

      <div className='grid gap-4'>
        <div className='grid gap-2'>
          <Label>Cover teacher</Label>
          <Select value={coverTeacherId} onValueChange={setCoverTeacherId}>
            <SelectTrigger disabled={submitting || !filters}>
              <SelectValue placeholder='Choose cover teacher' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__none'>No cover teacher yet</SelectItem>
              {teacherOptions.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.label} • {teacher.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='grid gap-2'>
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as CoverAssignmentInput['status'])}
          >
            <SelectTrigger disabled={submitting}>
              <SelectValue placeholder='Choose status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Open'>Open</SelectItem>
              <SelectItem value='Assigned'>Assigned</SelectItem>
              <SelectItem value='Confirmed'>Confirmed</SelectItem>
              <SelectItem value='Completed'>Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='grid gap-2'>
          <Label>Note</Label>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder='Handoff, room, or prep notes for the cover owner.'
            rows={4}
            disabled={submitting}
          />
        </div>
      </div>
    </div>
  ) : null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className='max-h-[85dvh] min-h-0'>
          <DrawerHeader className='shrink-0 text-left'>
            <DrawerTitle>Update cover assignment</DrawerTitle>
            <DrawerDescription>
              Assign cover ownership and move the block through confirmation.
            </DrawerDescription>
          </DrawerHeader>
          <div className='min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-4'>{body}</div>
          <DrawerFooter className='shrink-0'>
            <Button onClick={handleSubmit} disabled={submitting || !assignment}>
              {submitting ? 'Saving...' : 'Save cover assignment'}
            </Button>
            <Button variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full overflow-y-auto sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>Update cover assignment</SheetTitle>
          <SheetDescription>
            Assign cover ownership and move the block through confirmation.
          </SheetDescription>
        </SheetHeader>
        {body}
        <SheetFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !assignment}>
            {submitting ? 'Saving...' : 'Save cover assignment'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
