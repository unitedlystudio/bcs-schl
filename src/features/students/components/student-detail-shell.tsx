'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { StudentFormSheetTrigger } from './add-student-sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded-xl border border-border/60 bg-muted/30 p-4'>
      <div className='text-xs uppercase tracking-wide text-muted-foreground'>{label}</div>
      <div className='mt-2 text-2xl font-semibold'>{value}</div>
    </div>
  );
}

export default function StudentDetailShell({ studentId }: { studentId: string }) {
  const student = useQuery(api.students.getById, { studentId: studentId as Id<'students'> });

  if (student === undefined) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Loading student profile shell...
      </div>
    );
  }

  if (!student) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Student not found.
      </div>
    );
  }

  return (
    <div className='grid gap-4 xl:grid-cols-[minmax(0,2fr)_360px]'>
      <div className='grid gap-4'>
        <Card>
          <CardHeader className='gap-4 md:flex-row md:items-start md:justify-between'>
            <div>
              <div className='flex flex-wrap items-center gap-2'>
                <CardTitle>{student.preferredName || student.fullName}</CardTitle>
                <Badge variant={student.status === 'Active' ? 'default' : 'outline'}>
                  {student.status}
                </Badge>
                <Badge variant='secondary'>{student.className}</Badge>
                {student.academicYear ? (
                  <Badge variant='outline'>{student.academicYear}</Badge>
                ) : null}
              </div>
              <CardDescription className='mt-2'>
                {student.fullName}
                {student.nisn ? ` • NISN ${student.nisn}` : ''}
              </CardDescription>
            </div>
            <div className='flex flex-col gap-3 md:items-end'>
              <StudentFormSheetTrigger
                studentId={student.id}
                buttonLabel='Edit student'
                buttonSize='sm'
                buttonVariant='outline'
              />
              <div className='grid min-w-[220px] gap-2 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm'>
                <div className='flex items-center justify-between gap-4'>
                  <span className='text-muted-foreground'>Date joined</span>
                  <span className='font-medium'>{student.dateJoined || '—'}</span>
                </div>
                <div className='flex items-center justify-between gap-4'>
                  <span className='text-muted-foreground'>Date of birth</span>
                  <span className='font-medium'>{student.dateOfBirth || '—'}</span>
                </div>
                <div className='flex items-center justify-between gap-4'>
                  <span className='text-muted-foreground'>Sex</span>
                  <span className='font-medium'>{student.sex}</span>
                </div>
                <div className='flex items-center justify-between gap-4'>
                  <span className='text-muted-foreground'>Religion</span>
                  <span className='font-medium'>{student.religion || '—'}</span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <SummaryStat label='Marked sessions' value={student.attendanceSummary.totalSessions} />
          <SummaryStat label='Present' value={student.attendanceSummary.present} />
          <SummaryStat label='Late' value={student.attendanceSummary.late} />
          <SummaryStat
            label='Absent / excused'
            value={student.attendanceSummary.absent + student.attendanceSummary.excused}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent attendance</CardTitle>
            <CardDescription>
              Latest recorded sessions linked to this student so staff can quickly spot attendance
              issues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {student.recentAttendance.length === 0 ? (
              <div className='rounded-xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground'>
                No attendance history yet. Once attendance is marked, recent sessions will appear
                here.
              </div>
            ) : (
              <div className='space-y-3'>
                {student.recentAttendance.map((record) => (
                  <div
                    key={record.id}
                    className='flex flex-col gap-3 rounded-xl border border-border/60 p-4 md:flex-row md:items-center md:justify-between'
                  >
                    <div>
                      <div className='font-medium'>
                        {record.sessionDate} • {record.className}
                      </div>
                      <div className='mt-1 text-sm text-muted-foreground'>
                        Session status: {record.sessionStatus}
                        {record.note ? ` • ${record.note}` : ''}
                      </div>
                    </div>
                    <Badge
                      variant={
                        record.status === 'Present'
                          ? 'default'
                          : record.status === 'Late'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {record.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admissions trail</CardTitle>
            <CardDescription>
              Related admissions enquiries matched by student name or guardian contact details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {student.relatedAdmissions.length === 0 ? (
              <div className='rounded-xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground'>
                No linked admissions enquiry found yet.
              </div>
            ) : (
              <div className='space-y-3'>
                {student.relatedAdmissions.map((enquiry) => (
                  <div key={enquiry.id} className='rounded-xl border border-border/60 p-4'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='font-medium'>{enquiry.studentName}</div>
                      <Badge variant='secondary'>{enquiry.stage}</Badge>
                      <Badge variant={enquiry.status === 'Won' ? 'default' : 'outline'}>
                        {enquiry.status}
                      </Badge>
                    </div>
                    <div className='mt-2 text-sm text-muted-foreground'>
                      {enquiry.enquiryDate}
                      {enquiry.classInterest ? ` • Interested in ${enquiry.classInterest}` : ''}
                      {enquiry.source ? ` • Source: ${enquiry.source}` : ''}
                    </div>
                    {enquiry.notesSummary ? (
                      <div className='mt-3 text-sm'>{enquiry.notesSummary}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>Guardian contact</CardTitle>
            <CardDescription>
              Quick contact block until the full family/contact management workflow is added.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4'>
            <div>
              <div className='text-xs uppercase tracking-wide text-muted-foreground'>Guardian</div>
              <div className='mt-1 font-medium'>{student.guardianName || '—'}</div>
            </div>
            <div>
              <div className='text-xs uppercase tracking-wide text-muted-foreground'>Phone</div>
              <div className='mt-1 font-medium'>{student.guardianPhone || '—'}</div>
            </div>
            <Separator />
            <div>
              <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                Operational flag
              </div>
              <div className='mt-1 font-medium'>
                {student.medicalFlag || 'No urgent medical/support flag recorded'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes snapshot</CardTitle>
            <CardDescription>
              Short summary carried from intake until the richer student timeline is built.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-6'>
              {student.notesSummary || 'No profile notes recorded yet.'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next recommended upgrades</CardTitle>
            <CardDescription>
              Student editing is now in place, but a few deeper workflows are still missing.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 text-sm text-muted-foreground'>
            <div>• Promote admissions enquiries into a first-class conversion history</div>
            <div>• Add structured support / safeguarding flags with restricted visibility</div>
            <div>• Add timeline entries for attendance, concerns, and communications</div>
            <div>• Add family-level contact management beyond the single guardian block</div>
            <div>
              • Continue from{' '}
              <Link
                className='font-medium text-foreground underline underline-offset-4'
                href='/dashboard/attendance'
              >
                Attendance
              </Link>{' '}
              and{' '}
              <Link
                className='font-medium text-foreground underline underline-offset-4'
                href='/dashboard/admissions'
              >
                Admissions
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
