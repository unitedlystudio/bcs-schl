'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { StaffCoverAssignmentSheet } from './staff-cover-assignment-sheet';
import { StaffLeaveRequestSheet } from './staff-leave-request-sheet';

type CoverAssignmentView = {
  id: string;
  coverDate: string;
  className: string;
  timeSlotLabel: string;
  primaryTeacherId: string;
  primaryTeacherName: string;
  coverTeacherId: string | null;
  coverTeacherName: string;
  status: 'Open' | 'Assigned' | 'Confirmed' | 'Completed';
  note: string;
};

type LeaveRequestView = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherPreferredName: string;
  teacherRole: string;
  teacherAcademicYear: string;
  teacherHomeroomClass: string;
  leaveType: 'Annual' | 'Sick' | 'Emergency' | 'Personal' | 'Training' | 'Unpaid' | 'Other';
  startDate: string;
  endDate: string;
  status: 'Requested' | 'Approved' | 'Rejected' | 'Cancelled';
  reason: string;
  notesSummary: string;
  requestedBy: string;
  updatedAt: number;
  coverAssignments: CoverAssignmentView[];
  coverCounts: Record<'Open' | 'Assigned' | 'Confirmed' | 'Completed', number>;
};

function leaveStatusVariant(status: LeaveRequestView['status']) {
  if (status === 'Approved') return 'default' as const;
  if (status === 'Requested') return 'secondary' as const;
  if (status === 'Rejected') return 'destructive' as const;
  return 'outline' as const;
}

function coverStatusVariant(status: CoverAssignmentView['status']) {
  if (status === 'Open') return 'destructive' as const;
  if (status === 'Assigned') return 'secondary' as const;
  if (status === 'Confirmed') return 'default' as const;
  return 'outline' as const;
}

export default function StaffingShell() {
  const searchParams = useSearchParams();
  const defaultTeacherId = searchParams.get('teacherId');
  const [search, setSearch] = useState('');
  const [teacherFilter, setTeacherFilter] = useState(defaultTeacherId ?? '__all');
  const [statusFilter, setStatusFilter] = useState('__all');
  const [coverStatusFilter, setCoverStatusFilter] = useState('__all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [leaveSheetOpen, setLeaveSheetOpen] = useState(false);
  const [activeLeaveId, setActiveLeaveId] = useState<string | null>(null);
  const [coverSheetOpen, setCoverSheetOpen] = useState(false);
  const [activeCoverAssignment, setActiveCoverAssignment] = useState<CoverAssignmentView | null>(
    null
  );
  const filters = useQuery(api.staffing.listFilters, {});
  const summary = useQuery(api.staffing.summary, {});
  const leaveRequests = useQuery(api.staffing.list, {
    search: search.trim() || undefined,
    teacherId: teacherFilter === '__all' ? undefined : (teacherFilter as Id<'teachers'>),
    status:
      statusFilter === '__all'
        ? undefined
        : (statusFilter as 'Requested' | 'Approved' | 'Rejected' | 'Cancelled'),
    coverStatus:
      coverStatusFilter === '__all'
        ? undefined
        : (coverStatusFilter as 'Open' | 'Assigned' | 'Confirmed' | 'Completed'),
    date: dateFilter || undefined
  });
  const setLeaveStatus = useMutation(api.staffing.setLeaveStatus);

  useEffect(() => {
    if (!leaveRequests) return;
    if (leaveRequests.length === 0) {
      setSelectedLeaveId(null);
      return;
    }

    if (!selectedLeaveId || !leaveRequests.some((item) => item.id === selectedLeaveId)) {
      setSelectedLeaveId(leaveRequests[0].id);
    }
  }, [leaveRequests, selectedLeaveId]);

  const selectedLeave = useMemo(
    () => leaveRequests?.find((item) => item.id === selectedLeaveId) ?? null,
    [leaveRequests, selectedLeaveId]
  );

  const handleStatusChange = async (leaveRequestId: string, status: LeaveRequestView['status']) => {
    try {
      await setLeaveStatus({
        leaveRequestId: leaveRequestId as Id<'staffLeaveRequests'>,
        status
      });
      toast.success(`Leave request marked ${status.toLowerCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update leave request');
    }
  };

  if (!filters || !summary || !leaveRequests) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Loading staffing workflow...
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>Staff leave & cover</CardTitle>
          <CardDescription>
            Keep teacher leave requests, approvals, and cover ownership as one dated operational
            workflow. Invited workspace staff do not appear here until they are added to the teacher
            directory.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          <div className='grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_220px_220px_220px_auto]'>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search teacher, requester, reason, class, or cover note'
            />
            <Select value={teacherFilter} onValueChange={setTeacherFilter}>
              <SelectTrigger>
                <SelectValue placeholder='All teachers' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__all'>All teachers</SelectItem>
                {filters.teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder='All leave states' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__all'>All leave states</SelectItem>
                {filters.leaveStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={coverStatusFilter} onValueChange={setCoverStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder='All cover states' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__all'>All cover states</SelectItem>
                {filters.coverStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className='flex flex-wrap gap-2 xl:justify-end'>
              <Input
                type='date'
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
              <Button variant='outline' asChild>
                <Link href='/dashboard/operations'>Operations board</Link>
              </Button>
              <Button
                onClick={() => {
                  setActiveLeaveId(null);
                  setLeaveSheetOpen(true);
                }}
              >
                <Icons.add className='mr-2 h-4 w-4' />
                Add leave
              </Button>
            </div>
          </div>
          <div className='text-sm text-muted-foreground'>
            Approving a leave request generates dated cover blocks from the timetable so operations
            can see real gaps.
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Leave requests</CardDescription>
            <CardTitle className='text-2xl'>{summary.leaveRequests}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Approved upcoming</CardDescription>
            <CardTitle className='text-2xl'>{summary.approvedUpcoming}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Today on leave</CardDescription>
            <CardTitle className='text-2xl'>{summary.todayOnLeave}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Open cover slots</CardDescription>
            <CardTitle className='text-2xl'>{summary.openCoverSlots}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Non-open cover slots</CardDescription>
            <CardTitle className='text-2xl'>{summary.assignedCoverSlots}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className='grid gap-4 xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.3fr)]'>
        <Card className='flex flex-col'>
          <CardHeader>
            <CardTitle>Leave requests</CardTitle>
            <CardDescription>
              {leaveRequests.length} requests in the current staffing view.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3'>
            {leaveRequests.length === 0 ? (
              <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                No leave requests match the current staffing filters.
              </div>
            ) : (
              leaveRequests.map((leaveRequest) => (
                <button
                  key={leaveRequest.id}
                  type='button'
                  onClick={() => setSelectedLeaveId(leaveRequest.id)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    selectedLeaveId === leaveRequest.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border/60 hover:bg-muted/40'
                  }`}
                >
                  <div className='flex flex-wrap items-center gap-2'>
                    <div className='font-medium'>{leaveRequest.teacherName}</div>
                    <Badge variant={leaveStatusVariant(leaveRequest.status)}>
                      {leaveRequest.status}
                    </Badge>
                    <Badge variant='outline'>{leaveRequest.leaveType}</Badge>
                  </div>
                  <div className='mt-2 text-sm text-muted-foreground'>
                    {leaveRequest.startDate} → {leaveRequest.endDate}
                  </div>
                  <div className='mt-2 text-sm'>{leaveRequest.reason}</div>
                  <div className='mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground'>
                    <span>{leaveRequest.coverAssignments.length} generated cover blocks</span>
                    <span>{leaveRequest.coverCounts.Open} open</span>
                    <span>{leaveRequest.coverCounts.Confirmed} confirmed</span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className='flex flex-col'>
          <CardHeader>
            <CardTitle>
              {selectedLeave ? `${selectedLeave.teacherName} leave detail` : 'Leave detail'}
            </CardTitle>
            <CardDescription>
              {selectedLeave
                ? `${selectedLeave.startDate} → ${selectedLeave.endDate}`
                : 'Choose a leave request to inspect generated cover assignments.'}
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4'>
            {!selectedLeave ? (
              <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                Select a leave request to inspect staffing impact.
              </div>
            ) : (
              <>
                <div className='flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/60 p-4'>
                  <div className='grid gap-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='text-lg font-semibold'>{selectedLeave.teacherName}</div>
                      <Badge variant={leaveStatusVariant(selectedLeave.status)}>
                        {selectedLeave.status}
                      </Badge>
                      <Badge variant='outline'>{selectedLeave.leaveType}</Badge>
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      {selectedLeave.teacherRole}
                      {selectedLeave.teacherAcademicYear
                        ? ` • ${selectedLeave.teacherAcademicYear}`
                        : ''}
                      {selectedLeave.teacherHomeroomClass
                        ? ` • ${selectedLeave.teacherHomeroomClass}`
                        : ''}
                    </div>
                    <div className='text-sm'>{selectedLeave.reason}</div>
                    {selectedLeave.notesSummary ? (
                      <div className='text-sm text-muted-foreground'>
                        {selectedLeave.notesSummary}
                      </div>
                    ) : null}
                    <div className='text-xs text-muted-foreground'>
                      Requested by {selectedLeave.requestedBy}
                    </div>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      variant='outline'
                      onClick={() => {
                        setActiveLeaveId(selectedLeave.id);
                        setLeaveSheetOpen(true);
                      }}
                    >
                      Edit request
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() => handleStatusChange(selectedLeave.id, 'Requested')}
                    >
                      Mark requested
                    </Button>
                    <Button onClick={() => handleStatusChange(selectedLeave.id, 'Approved')}>
                      Approve
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() => handleStatusChange(selectedLeave.id, 'Rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                </div>

                <div className='grid gap-3 sm:grid-cols-4'>
                  <Card>
                    <CardHeader className='pb-2'>
                      <CardDescription>Generated blocks</CardDescription>
                      <CardTitle className='text-2xl'>
                        {selectedLeave.coverAssignments.length}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className='pb-2'>
                      <CardDescription>Open</CardDescription>
                      <CardTitle className='text-2xl'>{selectedLeave.coverCounts.Open}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className='pb-2'>
                      <CardDescription>Assigned</CardDescription>
                      <CardTitle className='text-2xl'>
                        {selectedLeave.coverCounts.Assigned}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className='pb-2'>
                      <CardDescription>Confirmed</CardDescription>
                      <CardTitle className='text-2xl'>
                        {selectedLeave.coverCounts.Confirmed}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <Separator />

                <div className='grid gap-3'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <div className='font-medium'>Cover assignments</div>
                      <div className='text-sm text-muted-foreground'>
                        Dated class blocks generated from the timetable for this leave window.
                      </div>
                    </div>
                    <Button variant='outline' asChild>
                      <Link href='/dashboard/operations'>Open operations board</Link>
                    </Button>
                  </div>

                  {selectedLeave.coverAssignments.length === 0 ? (
                    <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                      No cover blocks yet. Approve the leave request to generate assignments from
                      timetable ownership.
                    </div>
                  ) : (
                    selectedLeave.coverAssignments.map((assignment) => (
                      <div key={assignment.id} className='rounded-xl border border-border/60 p-4'>
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                          <div className='grid gap-1'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <div className='font-medium'>
                                {assignment.className || 'Unassigned class'} •{' '}
                                {assignment.timeSlotLabel || 'Time slot'}
                              </div>
                              <Badge variant={coverStatusVariant(assignment.status)}>
                                {assignment.status}
                              </Badge>
                            </div>
                            <div className='text-sm text-muted-foreground'>
                              {assignment.coverDate} • Primary teacher:{' '}
                              {assignment.primaryTeacherName}
                            </div>
                            <div className='text-sm'>
                              Cover owner: {assignment.coverTeacherName}
                            </div>
                            {assignment.note ? (
                              <div className='text-sm text-muted-foreground'>{assignment.note}</div>
                            ) : null}
                          </div>
                          <Button
                            variant='outline'
                            onClick={() => {
                              setActiveCoverAssignment(assignment);
                              setCoverSheetOpen(true);
                            }}
                          >
                            Manage cover
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <StaffLeaveRequestSheet
        open={leaveSheetOpen}
        onOpenChange={setLeaveSheetOpen}
        leaveRequestId={activeLeaveId}
        defaultTeacherId={defaultTeacherId}
        onSaved={() => {
          if (!activeLeaveId && leaveRequests[0]) {
            setSelectedLeaveId(leaveRequests[0].id);
          }
        }}
      />
      <StaffCoverAssignmentSheet
        open={coverSheetOpen}
        onOpenChange={setCoverSheetOpen}
        assignment={activeCoverAssignment}
      />
    </div>
  );
}
