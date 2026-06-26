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
  teacherId: '',
  leaveType: 'Annual' as
    | 'Annual'
    | 'Sick'
    | 'Emergency'
    | 'Personal'
    | 'Training'
    | 'Unpaid'
    | 'Other',
  startDate: '',
  endDate: '',
  status: 'Requested' as 'Requested' | 'Approved' | 'Rejected' | 'Cancelled',
  reason: '',
  notesSummary: '',
  requestedBy: ''
};

type LeaveRequestFormValues = typeof DEFAULT_FORM;

function LeaveRequestFormFields({
  values,
  onChange,
  isSubmitting,
  teacherOptions
}: {
  values: LeaveRequestFormValues;
  onChange: <K extends keyof LeaveRequestFormValues>(
    key: K,
    value: LeaveRequestFormValues[K]
  ) => void;
  isSubmitting: boolean;
  teacherOptions: Array<{ id: string; label: string; role: string }>;
}) {
  return (
    <div className='grid gap-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label>Teacher</Label>
          <Select value={values.teacherId} onValueChange={(value) => onChange('teacherId', value)}>
            <SelectTrigger disabled={isSubmitting}>
              <SelectValue placeholder='Choose teacher' />
            </SelectTrigger>
            <SelectContent>
              {teacherOptions.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.label} • {teacher.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label>Leave type</Label>
          <Select
            value={values.leaveType}
            onValueChange={(value) =>
              onChange('leaveType', value as LeaveRequestFormValues['leaveType'])
            }
          >
            <SelectTrigger disabled={isSubmitting}>
              <SelectValue placeholder='Choose leave type' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Annual'>Annual</SelectItem>
              <SelectItem value='Sick'>Sick</SelectItem>
              <SelectItem value='Emergency'>Emergency</SelectItem>
              <SelectItem value='Personal'>Personal</SelectItem>
              <SelectItem value='Training'>Training</SelectItem>
              <SelectItem value='Unpaid'>Unpaid</SelectItem>
              <SelectItem value='Other'>Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='staffing-start-date'>Start date</Label>
          <Input
            id='staffing-start-date'
            type='date'
            value={values.startDate}
            onChange={(event) => onChange('startDate', event.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='staffing-end-date'>End date</Label>
          <Input
            id='staffing-end-date'
            type='date'
            value={values.endDate}
            onChange={(event) => onChange('endDate', event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-2'>
          <Label>Status</Label>
          <Select
            value={values.status}
            onValueChange={(value) => onChange('status', value as LeaveRequestFormValues['status'])}
          >
            <SelectTrigger disabled={isSubmitting}>
              <SelectValue placeholder='Choose status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Requested'>Requested</SelectItem>
              <SelectItem value='Approved'>Approved</SelectItem>
              <SelectItem value='Rejected'>Rejected</SelectItem>
              <SelectItem value='Cancelled'>Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='staffing-requested-by'>Requested by</Label>
          <Input
            id='staffing-requested-by'
            value={values.requestedBy}
            onChange={(event) => onChange('requestedBy', event.target.value)}
            placeholder='Accounts / Admin / Teacher'
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='staffing-reason'>Reason</Label>
        <Textarea
          id='staffing-reason'
          value={values.reason}
          onChange={(event) => onChange('reason', event.target.value)}
          placeholder='High-level leave context and timing.'
          disabled={isSubmitting}
          rows={4}
        />
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='staffing-notes-summary'>Notes summary</Label>
        <Textarea
          id='staffing-notes-summary'
          value={values.notesSummary}
          onChange={(event) => onChange('notesSummary', event.target.value)}
          placeholder='Optional handoff notes for leadership / cover planning.'
          disabled={isSubmitting}
          rows={3}
        />
      </div>
    </div>
  );
}

export function StaffLeaveRequestSheet({
  open,
  onOpenChange,
  leaveRequestId,
  defaultTeacherId,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveRequestId?: string | null;
  defaultTeacherId?: string | null;
  onSaved?: () => void;
}) {
  const isMobile = useIsMobile();
  const isEdit = Boolean(leaveRequestId);
  const filters = useQuery(api.staffing.listFilters, {});
  const leaveRequest = useQuery(
    api.staffing.getById,
    leaveRequestId ? { leaveRequestId: leaveRequestId as Id<'staffLeaveRequests'> } : 'skip'
  );
  const upsertLeaveRequest = useMutation(api.staffing.upsertLeaveRequest);
  const [values, setValues] = useState<LeaveRequestFormValues>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (isEdit) {
      if (leaveRequest === undefined || !leaveRequest) return;
      setValues({
        teacherId: leaveRequest.teacherId,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        status: leaveRequest.status,
        reason: leaveRequest.reason,
        notesSummary: leaveRequest.notesSummary,
        requestedBy: leaveRequest.requestedBy
      });
      return;
    }

    setValues({
      ...DEFAULT_FORM,
      teacherId: defaultTeacherId ?? '',
      requestedBy: 'Admin'
    });
  }, [open, isEdit, leaveRequest, defaultTeacherId]);

  const handleChange = <K extends keyof LeaveRequestFormValues>(
    key: K,
    value: LeaveRequestFormValues[K]
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!values.teacherId || !values.startDate || !values.endDate || !values.reason.trim()) {
      toast.error('Teacher, dates, and reason are required.');
      return;
    }

    setSubmitting(true);
    try {
      await upsertLeaveRequest({
        leaveRequestId: leaveRequestId ? (leaveRequestId as Id<'staffLeaveRequests'>) : undefined,
        teacherId: values.teacherId as Id<'teachers'>,
        leaveType: values.leaveType,
        startDate: values.startDate,
        endDate: values.endDate,
        status: values.status,
        reason: values.reason,
        notesSummary: values.notesSummary,
        requestedBy: values.requestedBy || 'Admin'
      });
      toast.success(isEdit ? 'Leave request updated' : 'Leave request created');
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const body = (
    <div className='grid gap-6 px-4 py-1 sm:px-0'>
      <LeaveRequestFormFields
        values={values}
        onChange={handleChange}
        isSubmitting={submitting}
        teacherOptions={(filters?.teachers ?? []).map((teacher) => ({
          id: teacher.id,
          label: teacher.label,
          role: teacher.role
        }))}
      />
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className='max-h-[85dvh] min-h-0'>
          <DrawerHeader className='shrink-0 text-left'>
            <DrawerTitle>{isEdit ? 'Edit leave request' : 'New leave request'}</DrawerTitle>
            <DrawerDescription>
              Keep teacher leave as a dated workflow so cover planning stays operational.
            </DrawerDescription>
          </DrawerHeader>
          <div className='min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-4'>{body}</div>
          <DrawerFooter className='shrink-0'>
            <Button onClick={handleSubmit} disabled={submitting || !filters}>
              {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create leave request'}
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
      <SheetContent className='w-full overflow-y-auto sm:max-w-2xl'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit leave request' : 'New leave request'}</SheetTitle>
          <SheetDescription>
            Keep teacher leave as a dated workflow so cover planning stays operational.
          </SheetDescription>
        </SheetHeader>
        {body}
        <SheetFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !filters}>
            {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create leave request'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
