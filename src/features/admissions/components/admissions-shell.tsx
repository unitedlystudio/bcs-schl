'use client';

import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { AdmissionsConvertButton } from './admissions-convert-button';
import { AdmissionsFormTrigger } from './admissions-form-sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const summaryCards = [
  { key: 'total', label: 'Total enquiries' },
  { key: 'active', label: 'Active' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' }
] as const;

export default function AdmissionsShell() {
  const [search, setSearch] = useState('');
  const searchArgs = search.trim() ? { search } : {};
  const board = useQuery(api.admissions.board, searchArgs);
  const enquiriesQuery = useQuery(api.admissions.list, searchArgs);
  const enquiries = useMemo(() => enquiriesQuery ?? [], [enquiriesQuery]);
  const hasSearch = search.trim().length > 0;

  if (!board || !enquiriesQuery) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Loading admissions shell...
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>Admissions pipeline</CardTitle>
          <CardDescription>
            A starter operational view for enquiries, stage progression, and recent family
            follow-up.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center'>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search by student, family, class, guardian, source, or stage'
              className='max-w-xl'
            />
            <AdmissionsFormTrigger
              buttonClassName='md:hidden'
              buttonLabel='Add enquiry'
              buttonVariant='outline'
            />
          </div>
          <div className='text-sm text-muted-foreground'>
            {hasSearch
              ? `${enquiries.length} enquiry${enquiries.length === 1 ? '' : 'ies'} match your search.`
              : `${enquiries.length} enquiry${enquiries.length === 1 ? '' : 'ies'} currently in the admissions workflow.`}
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
        {summaryCards.map((item) => (
          <Card key={item.key}>
            <CardHeader className='pb-2'>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className='text-2xl'>{board[item.key]}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {enquiries.length === 0 ? (
        <Card>
          <CardContent className='p-6'>
            <div className='font-medium'>
              {hasSearch
                ? `No admissions enquiries found for “${search.trim()}”.`
                : 'No admissions enquiries yet.'}
            </div>
            <div className='mt-1 text-sm text-muted-foreground'>
              {hasSearch
                ? 'Try a broader search once more families move through the pipeline.'
                : 'Create the first enquiry so the admissions workflow can start tracking real families.'}
            </div>
            {!hasSearch ? (
              <div className='mt-4'>
                <AdmissionsFormTrigger buttonLabel='Add first enquiry' />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className='grid gap-4 xl:grid-cols-4'>
            {board.columns.map((column) => (
              <Card key={column.stage}>
                <CardHeader>
                  <CardTitle className='text-base'>{column.stage}</CardTitle>
                  <CardDescription>{column.count} families in this stage</CardDescription>
                </CardHeader>
                <CardContent className='grid gap-3'>
                  {column.items.length > 0 ? (
                    column.items.map((item) => (
                      <div key={item.id} className='rounded-xl border border-border/50 p-4'>
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <div className='font-medium'>{item.studentName}</div>
                            <div className='text-sm text-muted-foreground'>
                              {item.familyName} family
                            </div>
                          </div>
                          <Badge variant={item.status === 'Won' ? 'default' : 'outline'}>
                            {item.status}
                          </Badge>
                        </div>
                        <div className='mt-3 space-y-1 text-sm text-muted-foreground'>
                          <div>Class interest: {item.classInterest || '—'}</div>
                          <div>Guardian: {item.guardianName || '—'}</div>
                          <div>Enquiry date: {item.enquiryDate || '—'}</div>
                        </div>
                        <div className='mt-4 flex flex-wrap gap-2'>
                          <AdmissionsFormTrigger
                            enquiryId={item.id}
                            buttonLabel='Update'
                            buttonVariant='outline'
                            buttonSize='sm'
                          />
                          <AdmissionsConvertButton
                            enquiryId={item.id}
                            convertedStudentId={item.convertedStudentId}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                      No enquiries in this stage.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent enquiry list</CardTitle>
              <CardDescription>
                Lightweight list view for follow-up before a deeper admissions CRM exists.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid gap-3'>
              {enquiries.map((enquiry) => (
                <div
                  key={enquiry.id}
                  className='flex flex-col gap-3 rounded-xl border border-border/50 p-4 lg:flex-row lg:items-center lg:justify-between'
                >
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='font-medium'>{enquiry.studentName}</div>
                      <Badge variant='outline'>{enquiry.stage}</Badge>
                      <Badge variant={enquiry.status === 'Won' ? 'default' : 'secondary'}>
                        {enquiry.status}
                      </Badge>
                      {enquiry.convertedStudentId ? (
                        <Badge variant='secondary'>Student linked</Badge>
                      ) : null}
                    </div>
                    <div className='mt-1 text-sm text-muted-foreground'>
                      {enquiry.familyName} family • {enquiry.classInterest || 'Class not set'} •{' '}
                      {enquiry.source || 'Source not set'}
                    </div>
                    <div className='mt-1 text-sm text-muted-foreground'>
                      Guardian: {enquiry.guardianName || '—'} • {enquiry.guardianPhone || '—'}
                    </div>
                    {enquiry.notesSummary ? (
                      <div className='mt-2 text-sm text-muted-foreground'>
                        {enquiry.notesSummary}
                      </div>
                    ) : null}
                  </div>
                  <div className='flex flex-col gap-3 lg:items-end'>
                    <div className='text-sm text-muted-foreground'>
                      Enquiry date: {enquiry.enquiryDate || '—'}
                    </div>
                    <div className='flex flex-wrap gap-2 lg:justify-end'>
                      <AdmissionsFormTrigger
                        enquiryId={enquiry.id}
                        buttonLabel='Update'
                        buttonVariant='outline'
                        buttonSize='sm'
                      />
                      <AdmissionsConvertButton
                        enquiryId={enquiry.id}
                        convertedStudentId={enquiry.convertedStudentId}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
