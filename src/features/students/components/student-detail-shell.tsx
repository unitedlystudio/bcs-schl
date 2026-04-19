'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from 'convex/react';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { StudentFormSheetTrigger } from './add-student-sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatField(value?: string) {
  return value?.trim() ? value : '—';
}

function ProfileMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className='rounded-xl border border-border/60 bg-muted/20 p-4'>
      <div className='text-xs uppercase tracking-wide text-muted-foreground'>{label}</div>
      <div className='mt-2 text-base font-semibold'>{value}</div>
      {hint ? <div className='mt-1 text-xs text-muted-foreground'>{hint}</div> : null}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone = 'default'
}: {
  label: string;
  value: number;
  tone?: 'default' | 'muted';
}) {
  return (
    <div className='rounded-xl border border-border/60 bg-background p-4'>
      <div className='text-xs uppercase tracking-wide text-muted-foreground'>{label}</div>
      <div
        className={
          tone === 'muted'
            ? 'mt-2 text-2xl font-semibold text-muted-foreground'
            : 'mt-2 text-2xl font-semibold'
        }
      >
        {value}
      </div>
    </div>
  );
}

function SectionEmpty({
  title,
  description,
  ctaLabel,
  href
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  href?: string;
}) {
  return (
    <div className='rounded-xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground'>
      <div className='font-medium text-foreground'>{title}</div>
      <div className='mt-1'>{description}</div>
      {ctaLabel && href ? (
        <Button asChild variant='outline' size='sm' className='mt-4'>
          <Link href={href}>{ctaLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

function LoadingProfile() {
  return (
    <div className='grid gap-4 xl:grid-cols-[minmax(0,2fr)_360px]'>
      <div className='grid gap-4'>
        <div className='bg-muted h-52 animate-pulse rounded-2xl' />
        <div className='bg-muted h-14 animate-pulse rounded-xl' />
        <div className='bg-muted h-96 animate-pulse rounded-2xl' />
      </div>
      <div className='grid gap-4'>
        <div className='bg-muted h-56 animate-pulse rounded-2xl' />
        <div className='bg-muted h-56 animate-pulse rounded-2xl' />
      </div>
    </div>
  );
}

export default function StudentDetailShell({ studentId }: { studentId: string }) {
  const student = useQuery(api.students.getById, { studentId: studentId as Id<'students'> });
  const teachersQuery = useQuery(
    api.teachers.listForDirectory,
    student ? (student.academicYear ? { academicYear: student.academicYear } : {}) : 'skip'
  );
  const concernCases = useQuery(
    api.concerns.recentForStudent,
    student ? { studentId: student.id as Id<'students'> } : 'skip'
  );

  const homeroomTeacher = useMemo(() => {
    if (!student || !teachersQuery) {
      return null;
    }

    return teachersQuery.find((teacher) => teacher.homeroomClass === student.className) ?? null;
  }, [student, teachersQuery]);

  if (student === undefined) {
    return <LoadingProfile />;
  }

  if (!student) {
    return (
      <Card>
        <CardContent className='flex flex-col items-start gap-4 p-6'>
          <div>
            <div className='font-medium'>Student not found.</div>
            <div className='mt-1 text-sm text-muted-foreground'>
              The requested student profile could not be loaded from Schly.
            </div>
          </div>
          <Button asChild variant='outline'>
            <Link href='/dashboard/students'>Back to Students</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const markedSessions = student.attendanceSummary.totalSessions;
  const attendanceHealth = markedSessions
    ? Math.round(
        ((student.attendanceSummary.present + student.attendanceSummary.late) / markedSessions) *
          100
      )
    : 0;
  const filledFields = [
    student.dateOfBirth,
    student.religion,
    student.guardianName,
    student.guardianPhone,
    student.nisn,
    student.notesSummary,
    student.medicalFlag,
    homeroomTeacher?.fullName ?? ''
  ].filter((value) => value && value.trim()).length;
  const profileCoverage = Math.round((filledFields / 8) * 100);

  return (
    <div className='grid gap-4 xl:grid-cols-[minmax(0,2fr)_360px]'>
      <div className='grid gap-4'>
        <Card className='overflow-hidden border-border/60'>
          <CardContent className='p-0'>
            <div className='border-b border-border/60 bg-muted/20 px-6 py-5'>
              <div className='flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between'>
                <div className='flex items-start gap-4'>
                  <Avatar className='size-16 border border-border/60'>
                    <AvatarFallback className='text-lg font-semibold'>
                      {getInitials(student.preferredName || student.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className='space-y-3'>
                    <div>
                      <div className='flex flex-wrap items-center gap-2'>
                        <h2 className='text-2xl font-semibold tracking-tight'>
                          {student.preferredName || student.fullName}
                        </h2>
                        <Badge variant={student.status === 'Active' ? 'default' : 'outline'}>
                          {student.status}
                        </Badge>
                        <Badge variant='secondary'>{student.className}</Badge>
                        {student.academicYear ? (
                          <Badge variant='outline'>{student.academicYear}</Badge>
                        ) : null}
                      </div>
                      <p className='mt-2 text-sm text-muted-foreground'>
                        Canonical student record for Schly operations.
                        {student.nisn ? ` NISN ${student.nisn}.` : ''}
                      </p>
                    </div>
                    <div className='flex flex-wrap gap-2 text-sm text-muted-foreground'>
                      <Badge variant='outline'>Joined {formatField(student.dateJoined)}</Badge>
                      <Badge variant='outline'>DOB {formatField(student.dateOfBirth)}</Badge>
                      <Badge variant='outline'>Sex {student.sex}</Badge>
                      <Badge variant='outline'>Religion {formatField(student.religion)}</Badge>
                      <Badge variant='outline'>Attendance health {attendanceHealth}%</Badge>
                    </div>
                  </div>
                </div>
                <div className='flex flex-col gap-3 xl:items-end'>
                  <StudentFormSheetTrigger
                    studentId={student.id}
                    buttonLabel='Edit student'
                    buttonSize='sm'
                    buttonVariant='outline'
                  />
                  <div className='grid gap-2 rounded-xl border border-border/60 bg-background p-4 text-sm min-[480px]:grid-cols-2 xl:min-w-[300px]'>
                    <div>
                      <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                        Guardian
                      </div>
                      <div className='mt-1 font-medium'>{formatField(student.guardianName)}</div>
                    </div>
                    <div>
                      <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                        Phone
                      </div>
                      <div className='mt-1 font-medium'>{formatField(student.guardianPhone)}</div>
                    </div>
                    <div>
                      <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                        Homeroom
                      </div>
                      <div className='mt-1 font-medium'>
                        {homeroomTeacher
                          ? homeroomTeacher.preferredName || homeroomTeacher.fullName
                          : 'Not linked yet'}
                      </div>
                    </div>
                    <div>
                      <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                        Medical / support
                      </div>
                      <div className='mt-1 font-medium'>
                        {student.medicalFlag ? 'Flagged' : 'No urgent flag recorded'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='grid gap-3 px-6 py-5 md:grid-cols-2 xl:grid-cols-4'>
              <ProfileMetric
                label='Attendance health'
                value={`${attendanceHealth}%`}
                hint={
                  markedSessions
                    ? 'Present + late against marked sessions'
                    : 'No sessions marked yet'
                }
              />
              <ProfileMetric
                label='Profile coverage'
                value={`${profileCoverage}%`}
                hint='Tracks how complete the student record is today'
              />
              <ProfileMetric
                label='Admissions links'
                value={`${student.relatedAdmissions.length}`}
                hint='Matched enquiries tied into this profile'
              />
              <ProfileMetric
                label='Concern cases'
                value={`${concernCases?.length ?? 0}`}
                hint='Structured support / intervention cases on this student'
              />
              <ProfileMetric
                label='Operational owner'
                value={
                  homeroomTeacher
                    ? homeroomTeacher.preferredName || homeroomTeacher.fullName
                    : 'Unassigned'
                }
                hint='Homeroom ownership for current class/year'
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue='overview' className='space-y-4'>
          <TabsList>
            <TabsTrigger value='overview'>Overview</TabsTrigger>
            <TabsTrigger value='attendance'>Attendance</TabsTrigger>
            <TabsTrigger value='concerns'>Concerns</TabsTrigger>
            <TabsTrigger value='admissions'>Admissions</TabsTrigger>
          </TabsList>

          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>Profile snapshot</CardTitle>
                  <CardDescription>
                    Core student identity and classroom placement, kept separate from deeper module
                    workflows.
                  </CardDescription>
                </CardHeader>
                <CardContent className='grid gap-4 sm:grid-cols-2'>
                  <div>
                    <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                      Full name
                    </div>
                    <div className='mt-1 font-medium'>{student.fullName}</div>
                  </div>
                  <div>
                    <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                      Preferred name
                    </div>
                    <div className='mt-1 font-medium'>{formatField(student.preferredName)}</div>
                  </div>
                  <div>
                    <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                      Academic year
                    </div>
                    <div className='mt-1 font-medium'>{formatField(student.academicYear)}</div>
                  </div>
                  <div>
                    <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                      Class
                    </div>
                    <div className='mt-1 font-medium'>{student.className}</div>
                  </div>
                  <div>
                    <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                      Date joined
                    </div>
                    <div className='mt-1 font-medium'>{formatField(student.dateJoined)}</div>
                  </div>
                  <div>
                    <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                      NISN
                    </div>
                    <div className='mt-1 font-medium'>{formatField(student.nisn)}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Operational notes</CardTitle>
                  <CardDescription>
                    Quick day-to-day context until concerns, family, and timeline modules are built
                    out properly.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='rounded-xl border border-border/60 bg-muted/20 p-4'>
                    <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                      Medical / support flag
                    </div>
                    <div className='mt-2 font-medium'>
                      {student.medicalFlag || 'No urgent medical or support flag recorded.'}
                    </div>
                  </div>
                  <div className='rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-6'>
                    {student.notesSummary || 'No notes snapshot recorded yet.'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value='attendance' className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <SummaryStat
                label='Marked sessions'
                value={student.attendanceSummary.totalSessions}
              />
              <SummaryStat label='Present' value={student.attendanceSummary.present} />
              <SummaryStat label='Late' value={student.attendanceSummary.late} />
              <SummaryStat
                label='Absent / excused'
                value={student.attendanceSummary.absent + student.attendanceSummary.excused}
                tone='muted'
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Attendance health</CardTitle>
                <CardDescription>
                  A quick read on how stable this student’s recent attendance pattern looks.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>Present + late coverage</span>
                  <span className='font-medium'>{attendanceHealth}%</span>
                </div>
                <Progress value={attendanceHealth} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent attendance history</CardTitle>
                <CardDescription>
                  Latest recorded sessions linked to this student, so teachers and operations can
                  scan changes quickly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {student.recentAttendance.length === 0 ? (
                  <SectionEmpty
                    title='No attendance history yet.'
                    description='Once attendance is marked for this student, recent session history will appear here.'
                    ctaLabel='Go to Attendance'
                    href='/dashboard/attendance'
                  />
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
          </TabsContent>

          <TabsContent value='concerns' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Concern cases</CardTitle>
                <CardDescription>
                  Structured support and intervention work linked directly to this student record.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!concernCases ? (
                  <SectionEmpty
                    title='Loading concern cases...'
                    description='Fetching the latest support and intervention work for this student.'
                  />
                ) : concernCases.length === 0 ? (
                  <SectionEmpty
                    title='No concern cases for this student yet.'
                    description='Create a structured case once support, behaviour, safeguarding, or intervention work needs follow-up.'
                    ctaLabel='Open Concerns'
                    href='/dashboard/concerns'
                  />
                ) : (
                  <div className='space-y-3'>
                    {concernCases.map((concern) => (
                      <div key={concern.id} className='rounded-xl border border-border/60 p-4'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <div className='font-medium'>{concern.title}</div>
                          <Badge variant='outline'>{concern.category}</Badge>
                          <Badge variant={concern.status === 'Resolved' ? 'default' : 'secondary'}>
                            {concern.status}
                          </Badge>
                          <Badge variant='outline'>{concern.severity}</Badge>
                        </div>
                        <div className='mt-2 text-sm text-muted-foreground'>
                          Owner: {concern.assignedTeacherName} • Visibility: {concern.visibility} •
                          Next review: {formatField(concern.nextReviewDate)}
                        </div>
                        <div className='mt-3 text-sm'>{concern.summary}</div>
                      </div>
                    ))}
                    <div>
                      <Button asChild variant='outline' size='sm'>
                        <Link href='/dashboard/concerns'>Open concerns workflow</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='admissions' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Admissions trail</CardTitle>
                <CardDescription>
                  Related admissions enquiries matched by student identity and family contact
                  details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {student.relatedAdmissions.length === 0 ? (
                  <SectionEmpty
                    title='No linked admissions enquiry found yet.'
                    description='Once an enquiry is matched or converted, it will appear here as the student history layer.'
                    ctaLabel='Go to Admissions'
                    href='/dashboard/admissions'
                  />
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
          </TabsContent>
        </Tabs>
      </div>

      <div className='grid gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>Guardian & ownership</CardTitle>
            <CardDescription>
              Keep contactability and classroom ownership visible without turning the profile into a
              giant spreadsheet record.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4'>
            <div>
              <div className='text-xs uppercase tracking-wide text-muted-foreground'>Guardian</div>
              <div className='mt-1 font-medium'>{formatField(student.guardianName)}</div>
            </div>
            <div>
              <div className='text-xs uppercase tracking-wide text-muted-foreground'>Phone</div>
              <div className='mt-1 font-medium'>{formatField(student.guardianPhone)}</div>
            </div>
            <Separator />
            <div>
              <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                Homeroom owner
              </div>
              <div className='mt-1 font-medium'>
                {homeroomTeacher ? homeroomTeacher.fullName : 'No homeroom teacher linked yet'}
              </div>
              <div className='mt-1 text-sm text-muted-foreground'>
                {homeroomTeacher
                  ? `${homeroomTeacher.role}${homeroomTeacher.email ? ` • ${homeroomTeacher.email}` : ''}${homeroomTeacher.phone ? ` • ${homeroomTeacher.phone}` : ''}`
                  : 'Use the Teachers directory to assign ownership by academic year and class.'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile integrity</CardTitle>
            <CardDescription>
              Quick completeness signal so records stay operationally useful while modules deepen.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Structured coverage</span>
              <span className='font-medium'>{profileCoverage}%</span>
            </div>
            <Progress value={profileCoverage} />
            <div className='grid gap-2 text-sm text-muted-foreground'>
              <div>• Student identity and placement are present</div>
              <div>
                • Guardian contact is {student.guardianPhone ? 'usable' : 'still incomplete'}
              </div>
              <div>• Homeroom ownership is {homeroomTeacher ? 'linked' : 'still missing'}</div>
              <div>• Concerns, finance, and family modules still need deeper structured data</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next recommended upgrades</CardTitle>
            <CardDescription>
              Keep this profile modular rather than turning it into one overloaded screen.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 text-sm text-muted-foreground'>
            <div>• Add structured concerns / support cases with restricted visibility</div>
            <div>• Add teacher-owned follow-up threads and task handoff</div>
            <div>• Add family-level contact management beyond the single guardian block</div>
            <div>• Add finance and attendance alerts as linked operational modules</div>
            <div>
              • Manage classroom ownership in{' '}
              <Link
                className='font-medium text-foreground underline underline-offset-4'
                href='/dashboard/teachers'
              >
                Teachers
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
