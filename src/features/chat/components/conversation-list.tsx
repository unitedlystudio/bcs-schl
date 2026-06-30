'use client';

import { useMemo, useState } from 'react';
import { Icons } from '@/components/icons';
import { motion } from 'motion/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Conversation, StaffMember } from '../utils/types';

const statusDotColor = {
  online: 'bg-green-500',
  offline: 'bg-red-500'
} as const;

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string;
  members: StaffMember[];
  startingMemberId?: string | null;
  onSelect: (id: string) => void;
  onStartConversation: (member: StaffMember) => void;
}

function initialsFor(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'ST'
  );
}

export function ConversationList({
  conversations,
  selectedId,
  members,
  startingMemberId,
  onSelect,
  onStartConversation
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) => c.name.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const base = q
      ? members.filter(
          (member) =>
            member.name.toLowerCase().includes(q) ||
            member.email.toLowerCase().includes(q) ||
            member.role.toLowerCase().includes(q)
        )
      : members;

    return base.slice(0, 8);
  }, [memberSearch, members]);

  return (
    <div className='border-border/40 bg-background/75 hidden h-full flex-col gap-4 overflow-hidden rounded-2xl border p-3 backdrop-blur lg:col-start-1 lg:col-end-2 lg:flex lg:rounded-3xl lg:p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <p className='text-foreground text-sm font-semibold'>Staff chat</p>
          <p className='text-muted-foreground text-xs'>
            {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
          </p>
        </div>
        <Badge
          variant='outline'
          className='bg-primary/15 text-primary hover:bg-primary/15 hover:text-primary border-border/50 rounded-full border px-3 py-1 text-[0.7rem] tracking-[0.24em] uppercase'
        >
          Inbox
        </Badge>
      </div>

      <div className='space-y-2 rounded-2xl border border-border/40 bg-background/60 p-3'>
        <div className='flex items-center justify-between gap-2'>
          <div>
            <p className='text-sm font-medium'>New chat</p>
            <p className='text-muted-foreground text-xs'>Search staff, owners, and admins</p>
          </div>
        </div>
        <label htmlFor='member-search' className='sr-only'>
          Search staff members
        </label>
        <div className='relative'>
          <Icons.search
            className='text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2'
            aria-hidden='true'
          />
          <Input
            id='member-search'
            type='search'
            value={memberSearch}
            onChange={(event) => setMemberSearch(event.target.value)}
            placeholder='Search member name, role, email'
            className='border-border/40 bg-background/80 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-primary/40 w-full rounded-2xl pl-10 text-sm focus-visible:ring-2'
          />
        </div>
        <div className='max-h-48 space-y-1 overflow-y-auto pr-1'>
          {filteredMembers.length === 0 ? (
            <p className='text-muted-foreground py-3 text-center text-xs'>No staff members found</p>
          ) : null}
          {filteredMembers.map((member) => (
            <Button
              key={member.userId}
              type='button'
              variant='ghost'
              className='h-auto w-full justify-start rounded-xl px-2 py-2 text-left'
              disabled={startingMemberId === member.userId}
              onClick={() => onStartConversation(member)}
            >
              <Avatar className='mr-2 h-8 w-8 rounded-xl'>
                <AvatarFallback className='bg-primary/15 text-primary rounded-xl text-xs'>
                  {initialsFor(member.name)}
                </AvatarFallback>
              </Avatar>
              <span className='min-w-0 flex-1'>
                <span className='block truncate text-sm font-medium'>{member.name}</span>
                <span className='text-muted-foreground block truncate text-xs'>{member.role}</span>
              </span>
              <span className='text-muted-foreground text-xs'>
                {startingMemberId === member.userId ? 'Starting…' : 'Chat'}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <label htmlFor='messenger-search' className='sr-only'>
        Search conversations
      </label>
      <div className='relative'>
        <Icons.search
          className='text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2'
          aria-hidden='true'
        />
        <Input
          id='messenger-search'
          type='search'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search conversations'
          className='border-border/40 bg-background/60 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-primary/40 w-full rounded-2xl pl-10 text-sm focus-visible:ring-2'
        />
      </div>

      <div
        className='flex-1 space-y-2 overflow-y-auto pr-1'
        aria-label='Conversation list'
        role='list'
      >
        {filtered.length === 0 ? (
          <p className='text-muted-foreground py-8 text-center text-xs'>No conversations yet</p>
        ) : null}
        {filtered.map((conversation) => {
          const isActive = conversation.id === selectedId;
          const lastMessage = conversation.messages[conversation.messages.length - 1];
          return (
            <motion.button
              key={conversation.id}
              type='button'
              onClick={() => onSelect(conversation.id)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'focus-visible:ring-primary/50 group focus-visible:ring-offset-background relative flex w-full items-start gap-3 rounded-2xl border border-transparent p-3 text-left transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                isActive
                  ? 'border-primary/40 bg-primary/10'
                  : 'bg-background/70 hover:border-border/40 hover:bg-muted/40'
              )}
              role='listitem'
            >
              <div className='relative shrink-0'>
                <Avatar className='border-border/40 bg-background/80 text-foreground h-10 w-10 rounded-2xl border'>
                  <AvatarFallback className='bg-primary/15 text-primary rounded-2xl text-sm font-medium'>
                    {conversation.initials}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    'border-background absolute right-0 bottom-0 inline-flex h-3 w-3 rounded-full border-2',
                    statusDotColor[conversation.status]
                  )}
                  aria-label={conversation.status === 'online' ? 'Online' : 'Offline'}
                />
              </div>
              <div className='min-w-0 flex-1 space-y-1'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0 flex-1'>
                    <p className='text-foreground text-sm font-semibold'>{conversation.name}</p>
                    <p className='text-muted-foreground text-xs'>{conversation.title}</p>
                  </div>
                  {lastMessage && (
                    <span className='text-muted-foreground shrink-0 text-[0.65rem]'>
                      {lastMessage.timestamp}
                    </span>
                  )}
                </div>
                {lastMessage ? (
                  <p className='text-muted-foreground line-clamp-2 text-xs'>
                    {lastMessage.author}: {lastMessage.text}
                  </p>
                ) : (
                  <p className='text-muted-foreground text-xs'>No messages yet</p>
                )}
              </div>
              {conversation.unread > 0 && (
                <span className='bg-primary text-primary-foreground ml-2 inline-flex min-h-[1.5rem] min-w-[1.5rem] items-center justify-center rounded-full text-[0.7rem] font-semibold shadow-lg'>
                  {conversation.unread}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
