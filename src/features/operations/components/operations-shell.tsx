'use client';

import Link from 'next/link';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { OperationsOverrideSheet } from './operations-override-sheet';
import { OperationsTimeSlotSheet } from './operations-timeslot-sheet';
import { TimetableEntrySheet } from './operations-entry-sheet';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

function blockVariant(value: string) {
  if (value === 'Lunch') return 'secondary' as const;
  if (value === 'Break') return 'outline' as const;
  if (value === 'Assembly') return 'default' as const;
  if (value === 'Dismissal') return 'outline' as const;
  return 'outline' as const;
}

function overrideVariant(value: 'Open' | 'Confirmed' | 'Resolved') {
  if (value === 'Open') return 'destructive' as const;
  if (value === 'Confirmed') return 'secondary' as const;
  return 'default' as const;
}

export default function OperationsShell() {
  const filters = useQuery(api.operations.listFilters, {});
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeSlotSheetOpen, setTimeSlotSheetOpen] = useState(false);
  const [activeTimeSlotId, setActiveTimeSlotId] = useState<string | null>(null);
  const [entrySheetOpen, setEntrySheetOpen] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [entryDefaults, setEntryDefaults] = useState<{ weekday?: string; timeSlotId?: string }>({});
  const [overrideSheetOpen, setOverrideSheetOpen] = useState(false);
  const [activeOverrideId, setActiveOverrideId] = useState<string | null>(null);
  const resolveOverride = useMutation(api.operations.resolveOverride);

  const classOptions = useMemo(() => {
    if (!filters) return [];
    return filters.classes.filter((item) => {
      if (!selectedAcademicYear) return true;
      return item.academicYear === selectedAcademicYear;
    });
  }, [filters, selectedAcademicYear]);

  useEffect(() => {
    if (!filters || selectedAcademicYear) return;
    if (filters.academicYears[0]) {
      setSelectedAcademicYear(filters.academicYears[0]);
    }
  }, [filters, selectedAcademicYear]);

  useEffect(() => {
    if (!classOptions.length) {
      setSelectedClassName('');
      return;
    }
    if (!selectedClassName || !classOptions.some((item) => item.className === selectedClassName)) {
      setSelectedClassName(classOptions[0].className);
    }
  }, [classOptions, selectedClassName]);

  const summary = useQuery(
    api.operations.summary,
    selectedAcademicYear || selectedClassName
      ? {
          date: selectedDate,
          academicYear: selectedAcademicYear || undefined,
          className: selectedClassName || undefined
        }
      : { date: selectedDate }
  );
  const week = useQuery(
    api.operations.getClassWeek,
    selectedAcademicYear && selectedClassName
      ? { academicYear: selectedAcademicYear, className: selectedClassName }
      : 'skip'
  );
  const dayBoard = useQuery(
    api.operations.getDayBoard,
    selectedDate
      ? {
          date: selectedDate,
          academicYear: selectedAcademicYear || undefined,
          className: selectedClassName || undefined
        }
      : 'skip'
  );

  if (
    !filters ||
    !summary ||
    (selectedAcademicYear && selectedClassName && week === undefined) ||
    !dayBoard
  ) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Loading timetable and operations workflow...
      </div>
    );
  }

  const handleResolveOverride = async (overrideId: string) => {
    try {
      await resolveOverride({ overrideId: overrideId as Id<'operationsOverrides'> });
      toast.success('Override resolved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resolve override');
    }
  };

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>Timetable & operations</CardTitle>
          <CardDescription>
            Split timetable structure, school-day timing, lunch flow, medical visibility, and daily
            operational overrides away from loose spreadsheets.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          <div className='grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_auto]'>
            <div className='grid gap-2'>
              <div className='text-sm font-medium'>Academic year</div>
              <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                <SelectTrigger>
                  <SelectValue placeholder='Choose academic year' />
                </SelectTrigger>
                <SelectContent>
                  {filters.academicYears.map((academicYear) => (
                    <SelectItem key={academicYear} value={academicYear}>
                      {academicYear}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <div className='text-sm font-medium'>Class</div>
              <Select value={selectedClassName} onValueChange={setSelectedClassName}>
                <SelectTrigger>
                  <SelectValue placeholder='Choose class' />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map((item) => (
                    <SelectItem
                      key={`${item.academicYear}::${item.className}`}
                      value={item.className}
                    >
                      {item.className}
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
            <div className='flex flex-wrap items-end gap-2 xl:justify-end'>
              <Button
                variant='outline'
                onClick={() => {
                  setActiveTimeSlotId(null);
                  setTimeSlotSheetOpen(true);
                }}
              >
                <Icons.add className='mr-2 h-4 w-4' />
                Manage times
              </Button>
              <Button
                variant='outline'
                onClick={() => {
                  setActiveEntryId(null);
                  setEntryDefaults({});
                  setEntrySheetOpen(true);
                }}
              >
                <Icons.add className='mr-2 h-4 w-4' />
                Add timetable block
              </Button>
              <Button
                variant='outline'
                onClick={() => {
                  setActiveOverrideId(null);
                  setOverrideSheetOpen(true);
                }}
              >
                <Icons.add className='mr-2 h-4 w-4' />
                Add override
              </Button>
            </div>
          </div>
          <div className='text-sm text-muted-foreground'>
            Use weekly timetable blocks for the stable school structure, then log day-specific
            changes as operational overrides instead of rewriting the timetable every time.
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-6'>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>School day slots</CardDescription>
            <CardTitle className='text-2xl'>{summary.timeSlots}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Active classes</CardDescription>
            <CardTitle className='text-2xl'>{summary.activeClasses}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Timetable blocks</CardDescription>
            <CardTitle className='text-2xl'>{summary.timetableBlocks}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Specialist blocks</CardDescription>
            <CardTitle className='text-2xl'>{summary.specialistBlocks}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Open overrides</CardDescription>
            <CardTitle className='text-2xl'>{summary.openOverrides}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Medical flags</CardDescription>
            <CardTitle className='text-2xl'>{summary.medicalFlags}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.9fr)]'>
        <div className='grid gap-4'>
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedClassName && selectedAcademicYear
                  ? `${selectedClassName} weekly timetable`
                  : 'Weekly timetable'}
              </CardTitle>
              <CardDescription>
                {selectedAcademicYear && selectedClassName
                  ? `${selectedAcademicYear} • stable class schedule backbone`
                  : 'Choose a class to inspect the weekly structure.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedAcademicYear || !selectedClassName || !week ? (
                <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                  Choose an academic year and class to view the timetable grid.
                </div>
              ) : week.timeSlots.length === 0 ? (
                <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                  No school-day time slots exist yet. Add the day structure first.
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full min-w-[960px] border-separate border-spacing-0'>
                    <thead>
                      <tr>
                        <th className='sticky left-0 z-10 w-48 border-b bg-background px-4 py-3 text-left text-sm font-medium'>
                          Time slot
                        </th>
                        {WEEKDAYS.map((weekday) => (
                          <th
                            key={weekday}
                            className='border-b bg-background px-4 py-3 text-left text-sm font-medium'
                          >
                            {weekday}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {week.timeSlots.map((slot) => (
                        <tr key={slot.id}>
                          <td className='sticky left-0 z-10 min-w-48 border-b bg-background align-top'>
                            <div className='px-4 py-4'>
                              <div className='font-medium'>{slot.label}</div>
                              <div className='mt-1 text-sm text-muted-foreground'>
                                {slot.timeRangeLabel}
                              </div>
                              <div className='mt-2'>
                                <Badge variant={blockVariant(slot.blockType)}>
                                  {slot.blockType}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          {WEEKDAYS.map((weekday) => {
                            const entry = slot.entries[weekday];
                            return (
                              <td
                                key={`${slot.id}-${weekday}`}
                                className='min-w-56 border-b align-top'
                              >
                                <div className='h-full px-3 py-3'>
                                  {entry ? (
                                    <div className='rounded-xl border border-border/60 bg-muted/20 p-3'>
                                      <div className='flex items-start justify-between gap-2'>
                                        <div className='font-medium'>{entry.activityTitle}</div>
                                        <Button
                                          variant='ghost'
                                          size='sm'
                                          onClick={() => {
                                            setActiveEntryId(entry.id);
                                            setEntryDefaults({});
                                            setEntrySheetOpen(true);
                                          }}
                                        >
                                          Manage
                                        </Button>
                                      </div>
                                      <div className='mt-2 text-sm text-muted-foreground'>
                                        {entry.leadTeacherName}
                                        {entry.location ? ` • ${entry.location}` : ''}
                                      </div>
                                      {entry.note ? (
                                        <div className='mt-2 text-sm text-muted-foreground'>
                                          {entry.note}
                                        </div>
                                      ) : null}
                                      <div className='mt-3 flex flex-wrap gap-2'>
                                        {entry.area ? (
                                          <Badge variant='outline'>{entry.area}</Badge>
                                        ) : null}
                                        {entry.specialistLabel ? (
                                          <Badge variant='secondary'>{entry.specialistLabel}</Badge>
                                        ) : null}
                                        {entry.lunchLabel ? (
                                          <Badge variant='outline'>{entry.lunchLabel}</Badge>
                                        ) : null}
                                        {entry.themeLabel ? (
                                          <Badge variant='outline'>{entry.themeLabel}</Badge>
                                        ) : null}
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type='button'
                                      className='flex h-full min-h-28 w-full items-center justify-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground'
                                      onClick={() => {
                                        setActiveEntryId(null);
                                        setEntryDefaults({ weekday, timeSlotId: slot.id });
                                        setEntrySheetOpen(true);
                                      }}
                                    >
                                      Add block
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className='grid gap-4'>
          <Card>
            <CardHeader>
              <CardTitle>School day structure</CardTitle>
              <CardDescription>
                Stable day timings from the spreadsheet’s Times tab. Manage these first, then place
                weekly class blocks into them.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {filters.timeSlots.length === 0 ? (
                <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                  No time slots yet. Add the first school-day block.
                </div>
              ) : (
                filters.timeSlots.map((slot) => (
                  <div key={slot.id} className='rounded-xl border border-border/60 p-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div>
                        <div className='font-medium'>{slot.label}</div>
                        <div className='mt-1 text-sm text-muted-foreground'>
                          {slot.startTime}–{slot.endTime}
                        </div>
                      </div>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => {
                          setActiveTimeSlotId(slot.id);
                          setTimeSlotSheetOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                    <div className='mt-2 flex flex-wrap gap-2'>
                      <Badge variant={blockVariant(slot.blockType)}>{slot.blockType}</Badge>
                      {!slot.isActive ? <Badge variant='outline'>Inactive</Badge> : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{dayBoard.weekday} operations board</CardTitle>
              <CardDescription>
                Today’s class blocks and overrides should stay visible without rewriting the
                timetable.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-3'>
                <div className='text-sm font-medium'>Scheduled blocks</div>
                {dayBoard.blocks.length === 0 ? (
                  <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                    No scheduled blocks for this class/date yet.
                  </div>
                ) : (
                  dayBoard.blocks.map((block) => (
                    <div key={block.id} className='rounded-xl border border-border/60 p-3'>
                      <div className='flex items-start justify-between gap-2'>
                        <div>
                          <div className='font-medium'>{block.activityTitle}</div>
                          <div className='mt-1 text-sm text-muted-foreground'>
                            {block.timeSlotLabel} • {block.timeRangeLabel}
                          </div>
                          <div className='mt-1 text-sm text-muted-foreground'>
                            {block.leadTeacherName}
                            {block.location ? ` • ${block.location}` : ''}
                          </div>
                        </div>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => {
                            setActiveEntryId(block.id);
                            setEntryDefaults({});
                            setEntrySheetOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className='space-y-3'>
                <div className='flex items-center justify-between gap-2'>
                  <div className='text-sm font-medium'>Overrides</div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      setActiveOverrideId(null);
                      setOverrideSheetOpen(true);
                    }}
                  >
                    Add
                  </Button>
                </div>
                {dayBoard.overrides.length === 0 ? (
                  <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                    No overrides for this date.
                  </div>
                ) : (
                  dayBoard.overrides.map((override) => (
                    <div key={override.id} className='rounded-xl border border-border/60 p-3'>
                      <div className='flex items-start justify-between gap-2'>
                        <div>
                          <div className='flex flex-wrap items-center gap-2'>
                            <div className='font-medium'>{override.title}</div>
                            <Badge variant='outline'>{override.overrideType}</Badge>
                            <Badge variant={overrideVariant(override.status)}>
                              {override.status}
                            </Badge>
                          </div>
                          <div className='mt-1 text-sm text-muted-foreground'>
                            {override.timeSlotLabel}
                            {override.className ? ` • ${override.className}` : ''}
                          </div>
                          <div className='mt-1 text-sm text-muted-foreground'>
                            {override.teacherName || 'No teacher linked'}
                            {override.studentName ? ` • ${override.studentName}` : ''}
                          </div>
                          <div className='mt-2 text-sm'>{override.summary}</div>
                        </div>
                        <div className='flex flex-col gap-2'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                              setActiveOverrideId(override.id);
                              setOverrideSheetOpen(true);
                            }}
                          >
                            Manage
                          </Button>
                          {override.status !== 'Resolved' ? (
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleResolveOverride(override.id)}
                            >
                              Resolve
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medical visibility</CardTitle>
              <CardDescription>
                Reuse core student medical flags here so daily operations can see them without
                turning timetable rows into a data dump.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {dayBoard.medicalFlags.length === 0 ? (
                <div className='rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
                  No medical flags surfaced for this class.
                </div>
              ) : (
                dayBoard.medicalFlags.map((item) => (
                  <div key={item.studentId} className='rounded-xl border border-border/60 p-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div>
                        <div className='font-medium'>{item.studentName}</div>
                        <div className='mt-1 text-sm text-muted-foreground'>
                          {item.className}
                          {item.academicYear ? ` • ${item.academicYear}` : ''}
                        </div>
                        <div className='mt-2 text-sm'>{item.medicalFlag}</div>
                      </div>
                      <Button asChild variant='ghost' size='sm'>
                        <Link href='/dashboard/students'>Students</Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <OperationsTimeSlotSheet
        open={timeSlotSheetOpen}
        onOpenChange={setTimeSlotSheetOpen}
        timeSlotId={activeTimeSlotId}
      />
      <TimetableEntrySheet
        open={entrySheetOpen}
        onOpenChange={setEntrySheetOpen}
        entryId={activeEntryId}
        defaultAcademicYear={selectedAcademicYear}
        defaultClassName={selectedClassName}
        defaultWeekday={entryDefaults.weekday}
        defaultTimeSlotId={entryDefaults.timeSlotId}
      />
      <OperationsOverrideSheet
        open={overrideSheetOpen}
        onOpenChange={setOverrideSheetOpen}
        overrideId={activeOverrideId}
        defaultAcademicYear={selectedAcademicYear}
        defaultClassName={selectedClassName}
        defaultDate={selectedDate}
      />
    </div>
  );
}
