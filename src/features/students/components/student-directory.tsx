'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { AddStudentSheetTrigger } from './add-student-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function StudentDirectory() {
  const [search, setSearch] = useState('');
  const studentsQuery = useQuery(api.students.list, search.trim() ? { search } : {});
  const students = useMemo(() => studentsQuery ?? [], [studentsQuery]);

  const grouped = useMemo(() => {
    return students.reduce<Record<string, typeof students>>((acc, student) => {
      acc[student.className] ??= [];
      acc[student.className].push(student);
      return acc;
    }, {});
  }, [students]);

  const hasSearch = search.trim().length > 0;

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>Student Directory</CardTitle>
          <CardDescription>
            Search the canonical student list before building deeper student profile flows.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center'>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search by name, class, guardian, or NISN'
              className='max-w-xl'
            />
            <AddStudentSheetTrigger
              buttonClassName='md:hidden'
              buttonLabel='Add student'
              buttonVariant='outline'
            />
          </div>
          <div className='text-sm text-muted-foreground'>
            {hasSearch
              ? `${students.length} student${students.length === 1 ? '' : 's'} match your search.`
              : `${students.length} student${students.length === 1 ? '' : 's'} in the current directory.`}
          </div>
        </CardContent>
      </Card>

      {studentsQuery === undefined ? (
        <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
          Loading student directory...
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-start gap-4 p-6'>
            <div>
              <div className='font-medium'>
                {hasSearch
                  ? `No students found for “${search.trim()}”.`
                  : 'No students in Schly yet.'}
              </div>
              <div className='mt-1 text-sm text-muted-foreground'>
                {hasSearch
                  ? 'Try another search or add the missing student record now.'
                  : 'Create the first student record so profiles and attendance can start using live data.'}
              </div>
            </div>
            <AddStudentSheetTrigger />
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4'>
          {Object.entries(grouped).map(([className, classStudents]) => (
            <Card key={className}>
              <CardHeader>
                <CardTitle>{className}</CardTitle>
                <CardDescription>{classStudents.length} students</CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3'>
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
                        <Badge variant={student.status === 'Active' ? 'default' : 'outline'}>
                          {student.status}
                        </Badge>
                        {student.medicalFlag ? (
                          <Badge variant='outline'>{student.medicalFlag}</Badge>
                        ) : null}
                      </div>
                      <div className='text-sm text-muted-foreground'>{student.fullName}</div>
                      <div className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground'>
                        <span>NISN: {student.nisn || '—'}</span>
                        <span>Guardian: {student.guardianName || '—'}</span>
                        <span>Phone: {student.guardianPhone || '—'}</span>
                      </div>
                    </div>
                    <Button asChild variant='outline' size='sm'>
                      <Link href={`/dashboard/students/${student.id}`}>Open profile shell</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
