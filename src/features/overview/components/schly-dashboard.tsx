'use client';

import Link from 'next/link';
import { api } from '../../../../convex/_generated/api';
import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useQuery } from 'convex/react';

const cardConfig = [
  {
    key: 'unreadInboxCount',
    label: 'Unread inbox items',
    description: 'Operational follow-up waiting for triage',
    icon: 'notification' as const,
    href: '/dashboard/notifications'
  },
  {
    key: 'activeThreads',
    label: 'Active threads',
    description: 'Live internal and support conversations',
    icon: 'chat' as const,
    href: '/dashboard/chat'
  },
  {
    key: 'accessRecordCount',
    label: 'Platform access records',
    description: 'Structured credential and platform inventory',
    icon: 'lock' as const,
    href: '/dashboard/access'
  },
  {
    key: 'attendanceSessionCount',
    label: 'Attendance sessions',
    description: 'Recorded class-day attendance registers',
    icon: 'calendar' as const,
    href: '/dashboard/attendance'
  }
];

export default function SchlyDashboard() {
  const summary = useQuery(api.dashboard.summary, {});
  const recentActivity = useQuery(api.dashboard.recentActivity, {});

  if (!summary || !recentActivity) {
    return (
      <PageContainer
        pageTitle='Schly Dashboard'
        pageDescription='Live operational snapshot for inbox, chat, and platform access.'
      >
        <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
          Loading Schly dashboard...
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      pageTitle='Schly Dashboard'
      pageDescription='Live operational snapshot for inbox, chat, and platform access.'
      pageHeaderAction={
        <div className='flex gap-2'>
          <Button asChild variant='outline' size='sm'>
            <Link href='/dashboard/notifications'>Open inbox</Link>
          </Button>
          <Button asChild size='sm'>
            <Link href='/dashboard/chat'>Open chat</Link>
          </Button>
        </div>
      }
    >
      <div className='flex flex-1 flex-col gap-4'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {cardConfig.map((card) => {
            const Icon = Icons[card.icon];
            const value = summary[card.key as keyof typeof summary];
            return (
              <Card key={card.key} className='bg-card/80'>
                <CardHeader>
                  <CardDescription>{card.label}</CardDescription>
                  <CardTitle className='text-3xl font-semibold tabular-nums'>{value}</CardTitle>
                  <CardAction>
                    <Badge variant='outline'>
                      <Icon />
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className='justify-between text-sm text-muted-foreground'>
                  <span>{card.description}</span>
                  <Button asChild variant='ghost' size='sm'>
                    <Link href={card.href}>Open</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Inbox status</CardTitle>
              <CardDescription>Current operational workload across the team.</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-3 sm:grid-cols-3'>
              <div className='rounded-xl border border-border/50 bg-muted/30 p-4'>
                <div className='text-muted-foreground text-xs uppercase tracking-wide'>
                  Ready access
                </div>
                <div className='mt-2 text-2xl font-semibold'>{summary.readyAccessCount}</div>
              </div>
              <div className='rounded-xl border border-border/50 bg-muted/30 p-4'>
                <div className='text-muted-foreground text-xs uppercase tracking-wide'>
                  Partial access
                </div>
                <div className='mt-2 text-2xl font-semibold'>{summary.partialAccessCount}</div>
              </div>
              <div className='rounded-xl border border-border/50 bg-muted/30 p-4'>
                <div className='text-muted-foreground text-xs uppercase tracking-wide'>
                  Needs setup
                </div>
                <div className='mt-2 text-2xl font-semibold'>{summary.needsSetupAccessCount}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent conversation threads</CardTitle>
              <CardDescription>Latest active discussions in the Schly workspace.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {recentActivity.conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className='flex items-center justify-between rounded-xl border border-border/50 px-4 py-3'
                >
                  <div>
                    <div className='font-medium'>{conversation.name}</div>
                    <div className='text-sm text-muted-foreground'>{conversation.title}</div>
                  </div>
                  <Badge variant='outline' className='capitalize'>
                    {conversation.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent operational inbox items</CardTitle>
            <CardDescription>
              Most recent Schly tasks and updates requiring attention.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {recentActivity.inbox.map((item) => (
              <div
                key={item.id}
                className='flex items-start justify-between rounded-xl border border-border/50 px-4 py-3'
              >
                <div className='min-w-0 flex-1'>
                  <div className='font-medium'>{item.title}</div>
                  <div className='text-sm text-muted-foreground'>{item.body}</div>
                </div>
                <Badge
                  variant={item.status === 'unread' ? 'default' : 'outline'}
                  className='ml-4 capitalize'
                >
                  {item.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
