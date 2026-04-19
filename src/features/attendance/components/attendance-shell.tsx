'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
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

const ATTENDANCE_STATUSES = ['Present', 'Late', 'Absent', 'Excused'] as const;

const summaryCards = [
  { key: 'present', label: 'Present' },
  { key: 'late', label: 'Late' },
  { key: 'absent', label: 'Absent' },
  { key: 'excused', label: 'Excused' },
  { key: 'unmarked', label: 'Unmarked' }
] as const;

function todayLabel() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendanceShell() {
  const classes = useQuery(api.attendance.listClasses, {});
  const recentSessions = useQuery(api.attendance.recentSessions, {});
  const setStudentStatus = useMutation(api.attendance.setStudentStatus);
  const [selectedDate, setSelectedDate] = useState(todayLabel);
  const [selectedClass, setSelectedClass] = useState('');
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedClass && classes && classes.length > 0) {
      setSelectedClass(classes[0]);
    }
  }, [classes, selectedClass]);

  const session = useQuery(
    api.attendance.getSession,
    selectedClass ? { className: selectedClass, sessionDate: selectedDate } : 'skip'
  );

  const classesReady = classes ?? [];
  const recent = recentSessions ?? [];
  const statusTone = useMemo(
    () => ({
      Present: 'default' as const,
      Late: 'secondary' as const,
      Absent: 'destructive' as const,
      Excused: 'outline' as const,
      Unmarked: 'outline' as const
    }),
    []
  );

  const handleStatusChange = async (
    studentId: string,
    status: (typeof ATTENDANCE_STATUSES)[number]
  ) => {
    if (!selectedClass) return;

    setPendingStudentId(studentId);
    try {
      await setStudentStatus({
        className: selectedClass,
        sessionDate: selectedDate,
        studentId: studentId as Id<'students'>,
        status
      });
    } finally {
      setPendingStudentId(null);
    }
  };

  if (!classes || !recentSessions || (selectedClass && session === undefined)) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Loading attendance shell...
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>Class attendance register</CardTitle>
          <CardDescription>
            Mark day-by-day attendance while the fuller attendance workflows are still being built.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-[220px_220px_1fr]'>
          <div className='grid gap-2'>
            <div className='text-sm font-medium'>Class</div>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder='Select class' />
              </SelectTrigger>
              <SelectContent>
                {classesReady.map((className) => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='grid gap-2'>
            <div className='text-sm font-medium'>Date</div>
            <Input
              type='date'
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>

          <div className='rounded-xl border border-border/50 bg-muted/20 p-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <div className='text-sm font-medium'>Session status</div>
              <Badge variant={session?.sessionStatus === 'Completed' ? 'default' : 'outline'}>
                {session?.sessionStatus ?? 'Draft'}
              </Badge>
            </div>
            <div className='mt-2 text-sm text-muted-foreground'>
              {selectedClass
                ? `Attendance for ${selectedClass} on ${selectedDate}.`
                : 'Pick a class to start marking attendance.'}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 xl:grid-cols-[2fr_1fr]'>
        <div className='grid gap-4'>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
            {summaryCards.map((item) => (
              <Card key={item.key}>
                <CardHeader className='pb-2'>
                  <CardDescription>{item.label}</CardDescription>
                  <CardTitle className='text-2xl'>{session?.summary[item.key] ?? 0}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student marks</CardTitle>
              <CardDescription>
                Use the quick actions below to mark each student for the selected class and day.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid gap-3'>
              {session && session.records.length > 0 ? (
                session.records.map((record) => {
                  const isRowPending = pendingStudentId === record.studentId;
                  return (
                    <div
                      key={record.studentId}
                      className='flex flex-col gap-3 rounded-xl border border-border/50 p-4'
                    >
                      <div className='flex flex-col gap-2 md:flex-row md:items-start md:justify-between'>
                        <div className='min-w-0 flex-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <div className='font-medium'>
                              {record.preferredName || record.fullName}
                            </div>
                            <Badge variant={statusTone[record.status]}>{record.status}</Badge>
                            {record.medicalFlag ? (
                              <Badge variant='outline'>{record.medicalFlag}</Badge>
                            ) : null}
                          </div>
                          <div className='text-sm text-muted-foreground'>{record.fullName}</div>
                          <div className='mt-1 text-sm text-muted-foreground'>
                            Guardian: {record.guardianName || '—'}
                            {record.note ? ` • ${record.note}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        {ATTENDANCE_STATUSES.map((status) => (
                          <Button
                            key={status}
                            type='button'
                            size='sm'
                            variant={record.status === status ? 'default' : 'outline'}
                            disabled={isRowPending}
                            onClick={() => handleStatusChange(record.studentId, status)}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className='rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground'>
                  No students found for this class yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent attendance sessions</CardTitle>
            <CardDescription>Latest class-day registers already created in Schly.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3'>
            {recent.length > 0 ? (
              recent.map((item) => (
                <div key={item.id} className='rounded-xl border border-border/50 p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <div className='font-medium'>{item.className}</div>
                      <div className='text-sm text-muted-foreground'>{item.sessionDate}</div>
                    </div>
                    <Badge variant={item.status === 'Completed' ? 'default' : 'outline'}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className='mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground'>
                    <span>Marked: {item.markedCount}</span>
                    <span>Late: {item.lateCount}</span>
                    <span>Absent: {item.absentCount}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className='rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground'>
                No attendance sessions yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
