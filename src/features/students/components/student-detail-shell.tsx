'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className='grid gap-4 lg:grid-cols-3'>
      <Card className='lg:col-span-2'>
        <CardHeader>
          <CardTitle>{student.preferredName || student.fullName}</CardTitle>
          <CardDescription>{student.fullName}</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2'>
          <div>
            <div className='text-xs uppercase tracking-wide text-muted-foreground'>Class</div>
            <div className='mt-1 font-medium'>{student.className}</div>
          </div>
          <div>
            <div className='text-xs uppercase tracking-wide text-muted-foreground'>Status</div>
            <div className='mt-1'>
              <Badge variant={student.status == 'Active' ? 'default' : 'outline'}>
                {student.status}
              </Badge>
            </div>
          </div>
          <div>
            <div className='text-xs uppercase tracking-wide text-muted-foreground'>
              Date of birth
            </div>
            <div className='mt-1 font-medium'>{student.dateOfBirth || '—'}</div>
          </div>
          <div>
            <div className='text-xs uppercase tracking-wide text-muted-foreground'>Date joined</div>
            <div className='mt-1 font-medium'>{student.dateJoined || '—'}</div>
          </div>
          <div>
            <div className='text-xs uppercase tracking-wide text-muted-foreground'>NISN</div>
            <div className='mt-1 font-medium'>{student.nisn || '—'}</div>
          </div>
          <div>
            <div className='text-xs uppercase tracking-wide text-muted-foreground'>Religion</div>
            <div className='mt-1 font-medium'>{student.religion || '—'}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guardian summary</CardTitle>
          <CardDescription>
            Starter profile shell until full contact management is built.
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
          <div>
            <div className='text-xs uppercase tracking-wide text-muted-foreground'>
              Medical / notes flag
            </div>
            <div className='mt-1 font-medium'>
              {student.medicalFlag || student.notesSummary || 'No urgent flags yet'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
