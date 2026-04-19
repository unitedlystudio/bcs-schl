'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ConcernFormSheet } from './concern-form-sheet';

function severityVariant(value: 'Low' | 'Medium' | 'High' | 'Critical') {
  if (value === 'Critical') return 'destructive' as const;
  if (value === 'High') return 'secondary' as const;
  return 'outline' as const;
}

function statusVariant(value: 'Open' | 'Monitoring' | 'Escalated' | 'Resolved') {
  if (value === 'Resolved') return 'default' as const;
  if (value === 'Escalated') return 'secondary' as const;
  return 'outline' as const;
}

function formatDate(value?: string) {
  return value?.trim() ? value : 'No review date set';
}

export default function ConcernsShell() {
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const searchArgs = search.trim() ? { search } : {};
  const summary = useQuery(api.concerns.summary, {});
  const casesQuery = useQuery(api.concerns.list, searchArgs);
  const addUpdate = useMutation(api.concerns.addUpdate);

  const cases = useMemo(() => casesQuery ?? [], [casesQuery]);
  const selectedCase = useQuery(
    api.concerns.getById,
    selectedCaseId ? { caseId: selectedCaseId as Id<'concernCases'> } : 'skip'
  );

  const hasSearch = search.trim().length > 0;
  const openCases = cases.filter((item) => item.status !== 'Resolved').length;
  const restrictedCases = cases.filter((item) => item.visibility === 'Restricted').length;
  const escalatedCases = cases.filter((item) => item.status === 'Escalated').length;
  const resolutionRate = cases.length
    ? Math.round((cases.filter((item) => item.status === 'Resolved').length / cases.length) * 100)
    : 0;

  if (!summary || casesQuery === undefined) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Loading concerns workflow...
      </div>
    );
  }

  const handleAddUpdate = async () => {
    if (!selectedCaseId || !noteDraft.trim()) {
      return;
    }

    try {
      setSubmittingNote(true);
      await addUpdate({
        caseId: selectedCaseId as Id<'concernCases'>,
        note: noteDraft,
        authorLabel: 'Schly operator'
      });
      setNoteDraft('');
      toast.success('Concern note added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add concern note');
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>Concerns & support workflow</CardTitle>
          <CardDescription>
            Student-linked intervention cases with severity, ownership, review dates, and note
            history.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search by student, title, category, teacher, severity, or summary'
              className='max-w-xl'
            />
            <Button
              onClick={() => {
                setActiveCaseId(null);
                setSheetOpen(true);
              }}
              variant='outline'
            >
              <Icons.add className='mr-2 h-4 w-4' />
              Add concern case
            </Button>
          </div>
          <div className='text-sm text-muted-foreground'>
            {hasSearch
              ? `${cases.length} concern case${cases.length === 1 ? '' : 's'} match your search.`
              : `${cases.length} concern case${cases.length === 1 ? '' : 's'} currently in the support workflow.`}
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Total cases</CardDescription>
            <CardTitle className='text-2xl'>{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Open / live</CardDescription>
            <CardTitle className='text-2xl'>{openCases}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Escalated</CardDescription>
            <CardTitle className='text-2xl'>{escalatedCases}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Restricted</CardDescription>
            <CardTitle className='text-2xl'>{restrictedCases}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Resolution rate</CardDescription>
            <CardTitle className='text-2xl'>{resolutionRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {cases.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-start gap-4 p-6'>
            <div>
              <div className='font-medium'>
                {hasSearch
                  ? `No concern cases found for “${search.trim()}”.`
                  : 'No concern cases yet.'}
              </div>
              <div className='mt-1 text-sm text-muted-foreground'>
                {hasSearch
                  ? 'Try a broader search once more intervention work has been logged.'
                  : 'Create the first concern case so support work stops living in ad-hoc notes.'}
              </div>
            </div>
            {!hasSearch ? (
              <Button
                onClick={() => {
                  setActiveCaseId(null);
                  setSheetOpen(true);
                }}
              >
                Add first concern case
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]'>
          <div className='grid gap-4'>
            {cases.map((item) => (
              <Card
                key={item.id}
                className={selectedCaseId === item.id ? 'border-primary/60 shadow-sm' : undefined}
              >
                <CardContent className='p-5'>
                  <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <div className='font-medium'>{item.title}</div>
                        <Badge variant='outline'>{item.category}</Badge>
                        <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                        <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                        <Badge variant={item.visibility === 'Restricted' ? 'secondary' : 'outline'}>
                          {item.visibility}
                        </Badge>
                      </div>
                      <div className='mt-2 text-sm text-muted-foreground'>
                        {item.studentName} • {item.studentClassName}
                        {item.studentAcademicYear ? ` • ${item.studentAcademicYear}` : ''}
                      </div>
                      <div className='mt-1 text-sm text-muted-foreground'>
                        Owner: {item.assignedTeacherName} • Next review:{' '}
                        {formatDate(item.nextReviewDate)}
                      </div>
                      <div className='mt-3 text-sm leading-6'>{item.summary}</div>
                    </div>
                    <div className='flex flex-wrap gap-2 lg:justify-end'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setSelectedCaseId(item.id)}
                      >
                        View timeline
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setActiveCaseId(item.id);
                          setSheetOpen(true);
                        }}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className='grid gap-4'>
            <Card>
              <CardHeader>
                <CardTitle>Operational health</CardTitle>
                <CardDescription>
                  Use this to keep intervention work case-based, reviewable, and less dependent on
                  memory.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>Resolved cases</span>
                  <span className='font-medium'>{resolutionRate}%</span>
                </div>
                <Progress value={resolutionRate} />
                <div className='grid gap-2 text-sm text-muted-foreground'>
                  <div>• Restricted cases stay visibly distinct</div>
                  <div>• Ownership is explicit instead of implied</div>
                  <div>• Review dates make follow-up operational</div>
                  <div>• Notes/history live on the case, not in loose comments</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{selectedCase ? selectedCase.title : 'Select a concern case'}</CardTitle>
                <CardDescription>
                  {selectedCase
                    ? `${selectedCase.studentName} • ${selectedCase.assignedTeacherName}`
                    : 'Pick a case from the list to review history and add updates.'}
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {!selectedCaseId ? (
                  <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                    Choose a case to open its note history and action context.
                  </div>
                ) : selectedCase === undefined ? (
                  <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                    Loading case timeline...
                  </div>
                ) : !selectedCase ? (
                  <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                    Concern case could not be loaded.
                  </div>
                ) : (
                  <>
                    <div className='rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-6'>
                      {selectedCase.summary}
                    </div>
                    <div className='grid gap-2 text-sm text-muted-foreground'>
                      <div>Severity: {selectedCase.severity}</div>
                      <div>Status: {selectedCase.status}</div>
                      <div>Visibility: {selectedCase.visibility}</div>
                      <div>Next review: {formatDate(selectedCase.nextReviewDate)}</div>
                    </div>
                    <div className='space-y-3'>
                      <div className='text-sm font-medium'>Case history</div>
                      {selectedCase.updates.length === 0 ? (
                        <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                          No timeline notes yet. Add the first operational note below.
                        </div>
                      ) : (
                        selectedCase.updates.map((update) => (
                          <div key={update.id} className='rounded-xl border border-border/60 p-4'>
                            <div className='text-sm'>{update.note}</div>
                            <div className='mt-2 text-xs text-muted-foreground'>
                              {update.authorLabel} • {new Date(update.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className='grid gap-2'>
                      <Label htmlFor='concern-note-draft'>Add follow-up note</Label>
                      <Textarea
                        id='concern-note-draft'
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder='Log meeting outcomes, next steps, or restricted context.'
                        rows={4}
                        disabled={submittingNote}
                      />
                      <Button
                        onClick={handleAddUpdate}
                        disabled={submittingNote || !noteDraft.trim()}
                      >
                        {submittingNote ? (
                          <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                        ) : null}
                        Add note
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <ConcernFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        caseId={activeCaseId}
        onSaved={() => {
          setActiveCaseId(null);
        }}
      />
    </div>
  );
}
