'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { AddStudentSheetTrigger } from './add-student-sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
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

const STATUS_OPTIONS = ['all', 'Active', 'Pending', 'Archived'] as const;

export default function StudentDirectory() {
  const [search, setSearch] = useState('');
  const [academicYear, setAcademicYear] = useState('all');
  const [className, setClassName] = useState('all');
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('all');
  const filterOptions = useQuery(api.students.listFilterOptions, {});
  const studentsQuery = useQuery(api.students.list, {
    ...(search.trim() ? { search } : {}),
    ...(academicYear !== 'all' ? { academicYear } : {}),
    ...(className !== 'all' ? { className } : {}),
    ...(status !== 'all' ? { status } : {})
  });
  const students = useMemo(() => studentsQuery ?? [], [studentsQuery]);

  const academicYears = filterOptions?.academicYears ?? [];
  const classesForSelectedYear = useMemo(() => {
    if (!filterOptions) return [];
    if (academicYear === 'all') {
      const classMap = new Map<string, number>();
      for (const classes of Object.values(filterOptions.classesByYear)) {
        for (const entry of classes) {
          classMap.set(entry.className, (classMap.get(entry.className) ?? 0) + entry.count);
        }
      }
      return Array.from(classMap.entries())
        .reduce<Array<[string, number]>>((acc, entry) => {
          const insertAt = acc.findIndex(
            ([existingClassName]) =>
              existingClassName.localeCompare(entry[0], undefined, { numeric: true }) > 0
          );

          if (insertAt === -1) {
            acc.push(entry);
          } else {
            acc.splice(insertAt, 0, entry);
          }

          return acc;
        }, [])
        .map(([classNameValue, count]) => ({ className: classNameValue, count }));
    }

    return filterOptions.classesByYear[academicYear] ?? [];
  }, [filterOptions, academicYear]);

  useEffect(() => {
    if (className === 'all') {
      return;
    }

    if (!classesForSelectedYear.some((entry) => entry.className === className)) {
      setClassName('all');
    }
  }, [className, classesForSelectedYear]);

  const grouped = useMemo(() => {
    return students.reduce<Record<string, typeof students>>((acc, student) => {
      const groupKey =
        academicYear === 'all'
          ? `${student.academicYear || 'Unassigned'} • ${student.className}`
          : student.className;
      acc[groupKey] ??= [];
      acc[groupKey].push(student);
      return acc;
    }, {});
  }, [academicYear, students]);

  const groupedEntries = useMemo(
    () =>
      Object.entries(grouped).sort(([left], [right]) =>
        left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
      ),
    [grouped]
  );

  const hasSearch = search.trim().length > 0;
  const totalYears = academicYears.length;
  const totalClassesVisible = classesForSelectedYear.length;

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>Student Directory</CardTitle>
          <CardDescription>
            Built for growing enrolment across academic years and multiple classes, not just one
            long list.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
            <div className='flex flex-1 flex-col gap-3 lg:flex-row'>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='Search by name, academic year, class, guardian, or NISN'
                className='max-w-xl'
              />
              <div className='grid gap-3 sm:grid-cols-3'>
                <Select value={academicYear} onValueChange={setAcademicYear}>
                  <SelectTrigger>
                    <SelectValue placeholder='Academic year' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All academic years</SelectItem>
                    {academicYears.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={className} onValueChange={setClassName}>
                  <SelectTrigger>
                    <SelectValue placeholder='Class' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All classes</SelectItem>
                    {classesForSelectedYear.map((entry) => (
                      <SelectItem key={entry.className} value={entry.className}>
                        {entry.className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as (typeof STATUS_OPTIONS)[number])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All statuses</SelectItem>
                    <SelectItem value='Active'>Active</SelectItem>
                    <SelectItem value='Pending'>Pending</SelectItem>
                    <SelectItem value='Archived'>Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <AddStudentSheetTrigger
              buttonClassName='xl:self-start'
              buttonLabel='Add student'
              buttonVariant='outline'
            />
          </div>

          <div className='flex flex-wrap gap-2 text-sm text-muted-foreground'>
            <Badge variant='secondary'>{students.length} students</Badge>
            <Badge variant='outline'>{totalYears} academic years</Badge>
            <Badge variant='outline'>{totalClassesVisible} classes in view</Badge>
            {academicYear !== 'all' ? <Badge variant='outline'>Year: {academicYear}</Badge> : null}
            {className !== 'all' ? <Badge variant='outline'>Class: {className}</Badge> : null}
            {status !== 'all' ? <Badge variant='outline'>Status: {status}</Badge> : null}
          </div>

          <div className='text-sm text-muted-foreground'>
            {hasSearch
              ? `${students.length} student${students.length === 1 ? '' : 's'} match your search and filter set.`
              : `${students.length} student${students.length === 1 ? '' : 's'} visible in the current directory view.`}
          </div>
        </CardContent>
      </Card>

      {studentsQuery === undefined || filterOptions === undefined ? (
        <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
          Loading student directory...
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-start gap-4 p-6'>
            <div>
              <div className='font-medium'>
                {hasSearch || academicYear !== 'all' || className !== 'all' || status !== 'all'
                  ? 'No students match this directory view.'
                  : 'No students in Schly yet.'}
              </div>
              <div className='mt-1 text-sm text-muted-foreground'>
                {hasSearch || academicYear !== 'all' || className !== 'all' || status !== 'all'
                  ? 'Clear or broaden the filters, or add the missing student record now.'
                  : 'Create the first student record so profiles and attendance can start using live data.'}
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <AddStudentSheetTrigger />
              {hasSearch || academicYear !== 'all' || className !== 'all' || status !== 'all' ? (
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setSearch('');
                    setAcademicYear('all');
                    setClassName('all');
                    setStatus('all');
                  }}
                >
                  Reset filters
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]'>
          <Card className='h-fit'>
            <CardHeader>
              <CardTitle>Directory view</CardTitle>
              <CardDescription>
                Desktop: keep years and classes easy to switch. Mobile: use the same controls in one
                compact filter card.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid gap-4'>
              <div className='rounded-xl border border-border/60 p-4'>
                <div className='text-sm font-medium'>Recommended UX direction</div>
                <ul className='mt-3 space-y-2 text-sm text-muted-foreground'>
                  <li>• First filter by academic year, then narrow by class.</li>
                  <li>• Keep search global so staff can jump directly to a student.</li>
                  <li>• Use collapsible class groups instead of one endless list.</li>
                  <li>• Preserve the same filtering logic on desktop and mobile.</li>
                </ul>
              </div>
              <div className='rounded-xl border border-border/60 p-4'>
                <div className='text-sm font-medium'>Classes in scope</div>
                <div className='mt-3 flex flex-wrap gap-2'>
                  {classesForSelectedYear.map((entry) => (
                    <Badge key={entry.className} variant='outline'>
                      {entry.className} • {entry.count}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {academicYear === 'all' ? 'Students by class' : `${academicYear} student groups`}
              </CardTitle>
              <CardDescription>
                Each class collapses cleanly so the directory still works when the school grows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion
                type='multiple'
                defaultValue={groupedEntries.slice(0, 2).map(([groupClassName]) => groupClassName)}
                className='space-y-3'
              >
                {groupedEntries.map(([groupClassName, classStudents]) => (
                  <AccordionItem
                    key={groupClassName}
                    value={groupClassName}
                    className='rounded-xl border border-border/50 px-4'
                  >
                    <AccordionTrigger className='py-4 hover:no-underline'>
                      <div className='flex flex-col items-start gap-1 text-left'>
                        <div className='font-medium'>{groupClassName}</div>
                        <div className='text-sm text-muted-foreground'>
                          {classStudents.length} students
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className='pb-4'>
                      <div className='grid gap-3'>
                        {classStudents.map((student) => (
                          <div
                            key={student.id}
                            className='flex flex-col gap-3 rounded-xl border border-border/50 p-4 md:flex-row md:items-center md:justify-between'
                          >
                            <div className='min-w-0 flex-1'>
                              <div className='flex flex-wrap items-center gap-2'>
                                <div className='font-medium'>
                                  {student.preferredName || student.fullName}
                                </div>
                                <Badge
                                  variant={student.status === 'Active' ? 'default' : 'outline'}
                                >
                                  {student.status}
                                </Badge>
                                {student.academicYear ? (
                                  <Badge variant='outline'>{student.academicYear}</Badge>
                                ) : null}
                                {student.medicalFlag ? (
                                  <Badge variant='outline'>{student.medicalFlag}</Badge>
                                ) : null}
                              </div>
                              <div className='text-sm text-muted-foreground'>
                                {student.fullName}
                              </div>
                              <div className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground'>
                                <span>NISN: {student.nisn || '—'}</span>
                                <span>Guardian: {student.guardianName || '—'}</span>
                                <span>Phone: {student.guardianPhone || '—'}</span>
                              </div>
                            </div>
                            <Button asChild variant='outline' size='sm'>
                              <Link href={`/dashboard/students/${student.id}`}>Open profile</Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
