'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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

  useEffect(() => {
    if (!selectedCaseId && cases.length > 0) {
      setSelectedCaseId(cases[0].id);
    }
  }, [cases, selectedCaseId]);

  useEffect(() => {
    if (selectedCaseId && !cases.some((item) => item.id === selectedCaseId)) {
      setSelectedCaseId(cases[0]?.id ?? null);
    }
  }, [cases, selectedCaseId]);

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
      <Card className='border-border/60'>
        <CardHeader className='gap-4 pb-4'>
          <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
            <div className='space-y-1'>
              <CardTitle>Concerns & support</CardTitle>
              <CardDescription>
                Keep intervention cases visible, owned, and reviewable instead of burying support
                work in loose notes.
              </CardDescription>
            </div>
            <Button
              variant='outline'
              onClick={() => {
                setActiveCaseId(null);
                setSheetOpen(true);
              }}
            >
              <Icons.add className='mr-2 h-4 w-4' />
              Add concern case
            </Button>
          </div>
          <div className='grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]'>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search student, title, category, owner, severity, or summary'
            />
            <div className='rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground'>
              {hasSearch
                ? `${cases.length} concern case${cases.length === 1 ? '' : 's'} match the current search.`
                : `${cases.length} concern case${cases.length === 1 ? '' : 's'} currently in the support workflow.`}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
        <Card className='border-border/60'>
          <CardHeader className='pb-2'>
            <CardDescription>Total cases</CardDescription>
            <CardTitle className='text-2xl'>{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className='border-border/60'>
          <CardHeader className='pb-2'>
            <CardDescription>Open / live</CardDescription>
            <CardTitle className='text-2xl'>{openCases}</CardTitle>
          </CardHeader>
        </Card>
        <Card className='border-border/60'>
          <CardHeader className='pb-2'>
            <CardDescription>Escalated</CardDescription>
            <CardTitle className='text-2xl'>{escalatedCases}</CardTitle>
          </CardHeader>
        </Card>
        <Card className='border-border/60'>
          <CardHeader className='pb-2'>
            <CardDescription>Restricted</CardDescription>
            <CardTitle className='text-2xl'>{restrictedCases}</CardTitle>
          </CardHeader>
        </Card>
        <Card className='border-border/60'>
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
                  ? 'Try a broader search once more intervention records exist.'
                  : 'Create the first concern case so support work leaves ad-hoc comments and message threads.'}
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
        <div className='grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]'>
          <Card className='border-border/60 xl:h-[calc(100dvh-20rem)]'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base'>Case queue</CardTitle>
              <CardDescription>
                Triage the queue here, then use the detail pane for history, review, and follow-up.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid gap-3 overflow-y-auto pr-2'>
              {cases.map((item) => {
                const isActive = selectedCaseId === item.id;
                return (
                  <button
                    key={item.id}
                    type='button'
                    onClick={() => setSelectedCaseId(item.id)}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      isActive
                        ? 'border-primary/60 bg-primary/5 shadow-sm'
                        : 'border-border/60 hover:bg-muted/30'
                    }`}
                  >
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='font-medium'>{item.title}</div>
                      <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                      <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                    </div>
                    <div className='mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground'>
                      <span>{item.studentName}</span>
                      <span>{item.studentClassName}</span>
                      {item.studentAcademicYear ? <span>{item.studentAcademicYear}</span> : null}
                    </div>
                    <div className='mt-3 flex flex-wrap gap-2'>
                      <Badge variant='outline'>{item.category}</Badge>
                      <Badge variant={item.visibility === 'Restricted' ? 'secondary' : 'outline'}>
                        {item.visibility}
                      </Badge>
                    </div>
                    <div className='mt-3 line-clamp-2 text-sm text-muted-foreground'>
                      {item.summary}
                    </div>
                    <div className='mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2'>
                      <span>Owner: {item.assignedTeacherName}</span>
                      <span>Review: {formatDate(item.nextReviewDate)}</span>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <div className='grid gap-4'>
            <Card className='border-border/60'>
              <CardContent className='grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_240px]'>
                <div className='space-y-4'>
                  {!selectedCaseId ? (
                    <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                      Choose a case to inspect its timeline and follow-up actions.
                    </div>
                  ) : selectedCase === undefined ? (
                    <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                      Loading case detail...
                    </div>
                  ) : !selectedCase ? (
                    <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                      Concern case could not be loaded.
                    </div>
                  ) : (
                    <>
                      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                        <div className='space-y-2'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <h3 className='text-lg font-semibold'>{selectedCase.title}</h3>
                            <Badge variant={statusVariant(selectedCase.status)}>
                              {selectedCase.status}
                            </Badge>
                            <Badge variant={severityVariant(selectedCase.severity)}>
                              {selectedCase.severity}
                            </Badge>
                            <Badge variant='outline'>{selectedCase.category}</Badge>
                            <Badge
                              variant={
                                selectedCase.visibility === 'Restricted' ? 'secondary' : 'outline'
                              }
                            >
                              {selectedCase.visibility}
                            </Badge>
                          </div>
                          <p className='max-w-3xl text-sm text-muted-foreground'>
                            {selectedCase.studentName} • {selectedCase.studentClassName}
                            {selectedCase.studentAcademicYear
                              ? ` • ${selectedCase.studentAcademicYear}`
                              : ''}
                          </p>
                        </div>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setActiveCaseId(selectedCase.id);
                            setSheetOpen(true);
                          }}
                        >
                          Manage case
                        </Button>
                      </div>

                      <div className='rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-6'>
                        {selectedCase.summary}
                      </div>

                      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                        <div className='rounded-xl border border-border/60 p-4'>
                          <div className='text-[11px] uppercase tracking-[0.12em] text-muted-foreground'>
                            Owner
                          </div>
                          <div className='mt-2 font-medium'>{selectedCase.assignedTeacherName}</div>
                        </div>
                        <div className='rounded-xl border border-border/60 p-4'>
                          <div className='text-[11px] uppercase tracking-[0.12em] text-muted-foreground'>
                            Next review
                          </div>
                          <div className='mt-2 font-medium'>
                            {formatDate(selectedCase.nextReviewDate)}
                          </div>
                        </div>
                        <div className='rounded-xl border border-border/60 p-4'>
                          <div className='text-[11px] uppercase tracking-[0.12em] text-muted-foreground'>
                            Visibility
                          </div>
                          <div className='mt-2 font-medium'>{selectedCase.visibility}</div>
                        </div>
                        <div className='rounded-xl border border-border/60 p-4'>
                          <div className='text-[11px] uppercase tracking-[0.12em] text-muted-foreground'>
                            Timeline notes
                          </div>
                          <div className='mt-2 font-medium'>{selectedCase.updates.length}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className='rounded-2xl border border-border/60 bg-muted/20 p-4'>
                  <div className='text-sm font-medium'>Workflow health</div>
                  <div className='mt-1 text-sm text-muted-foreground'>
                    Keep case handling visible enough that escalations and restricted work do not
                    hide.
                  </div>
                  <div className='mt-5 flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Resolved cases</span>
                    <span className='font-medium'>{resolutionRate}%</span>
                  </div>
                  <Progress value={resolutionRate} className='mt-2' />
                  <Separator className='my-4' />
                  <div className='grid gap-2 text-sm text-muted-foreground'>
                    <div>Ownership stays explicit.</div>
                    <div>Restricted work remains visibly distinct.</div>
                    <div>Review dates stop support follow-up from slipping.</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedCase ? (
              <Card className='border-border/60'>
                <CardContent className='grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]'>
                  <div className='grid gap-3'>
                    <div>
                      <div className='text-base font-semibold'>Case timeline</div>
                      <div className='text-sm text-muted-foreground'>
                        A compact timeline keeps intervention history readable during reviews.
                      </div>
                    </div>
                    {selectedCase.updates.length === 0 ? (
                      <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                        No timeline notes yet. Add the first operational update on the right.
                      </div>
                    ) : (
                      <div className='overflow-hidden rounded-xl border border-border/60'>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>When</TableHead>
                              <TableHead>Author</TableHead>
                              <TableHead>Note</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedCase.updates.map((update) => (
                              <TableRow key={update.id}>
                                <TableCell className='whitespace-nowrap text-sm text-muted-foreground'>
                                  {new Date(update.createdAt).toLocaleString()}
                                </TableCell>
                                <TableCell className='whitespace-nowrap'>
                                  {update.authorLabel}
                                </TableCell>
                                <TableCell className='text-sm'>{update.note}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  <div className='grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4'>
                    <div>
                      <div className='text-base font-semibold'>Add follow-up note</div>
                      <div className='text-sm text-muted-foreground'>
                        Log meetings, agreed actions, and restricted context against the case.
                      </div>
                    </div>
                    <div className='grid gap-2'>
                      <Label htmlFor='concern-note-draft'>Update note</Label>
                      <Textarea
                        id='concern-note-draft'
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder='Log meeting outcomes, next steps, or sensitive context.'
                        rows={7}
                        disabled={submittingNote}
                      />
                    </div>
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
                </CardContent>
              </Card>
            ) : null}
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
