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

type ConversationListProps = {
  conversations: Conversation[];
  selectedId: string;
  members: StaffMember[];
  startingMemberId?: string | null;
  mobileVisible: boolean;
  onSelect: (id: string) => void;
  onStartConversation: (member: StaffMember) => void;
};

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

function previewFor(conversation: Conversation) {
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  if (!lastMessage) return 'No messages yet';
  return lastMessage.text || 'Sent an attachment';
}

export function ConversationList({
  conversations,
  selectedId,
  members,
  startingMemberId,
  mobileVisible,
  onSelect,
  onStartConversation
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const query = search.toLowerCase();
    return conversations.filter(
      (conversation) =>
        conversation.name.toLowerCase().includes(query) ||
        conversation.title.toLowerCase().includes(query)
    );
  }, [conversations, search]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    const matches = query
      ? members.filter(
          (member) =>
            member.name.toLowerCase().includes(query) ||
            member.email.toLowerCase().includes(query) ||
            member.role.toLowerCase().includes(query)
        )
      : members;

    return matches.slice(0, 8);
  }, [memberSearch, members]);

  const startMemberChat = (member: StaffMember) => {
    onStartConversation(member);
    setIsMemberSearchOpen(false);
    setMemberSearch('');
  };

  return (
    <>
      <section
        className={cn(
          'min-h-0 flex-1 flex-col overflow-hidden lg:hidden',
          mobileVisible ? 'flex' : 'hidden'
        )}
        aria-label='Staff chat inbox'
      >
        <div className='flex items-center justify-between gap-3 px-1 pb-4'>
          <div>
            <h1 className='text-lg font-semibold tracking-tight'>Inbox</h1>
            <p className='text-muted-foreground text-sm'>
              {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
            </p>
          </div>
          <Button
            type='button'
            size='icon'
            className='size-10 rounded-full shadow-sm'
            aria-label={isMemberSearchOpen ? 'Close new chat search' : 'Start a new chat'}
            aria-expanded={isMemberSearchOpen}
            onClick={() => setIsMemberSearchOpen((open) => !open)}
          >
            {isMemberSearchOpen ? (
              <Icons.close className='h-4 w-4' />
            ) : (
              <Icons.chat className='h-4 w-4' />
            )}
          </Button>
        </div>

        {isMemberSearchOpen ? (
          <div className='border-border/50 mb-3 rounded-2xl border bg-background p-3 shadow-sm'>
            <label htmlFor='mobile-member-search' className='sr-only'>
              Search staff members
            </label>
            <Input
              id='mobile-member-search'
              type='search'
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder='Search staff member'
              className='h-11 text-base sm:text-sm'
            />
            <div className='mt-2 max-h-52 space-y-1 overflow-y-auto'>
              {filteredMembers.map((member) => (
                <Button
                  key={member.userId}
                  type='button'
                  variant='ghost'
                  className='h-auto w-full justify-start rounded-xl px-2 py-2.5 text-left'
                  disabled={startingMemberId === member.userId}
                  onClick={() => startMemberChat(member)}
                >
                  <Avatar className='mr-3 h-9 w-9'>
                    <AvatarFallback className='bg-primary/15 text-primary text-xs'>
                      {initialsFor(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-sm font-medium'>{member.name}</span>
                    <span className='text-muted-foreground block truncate text-xs'>
                      {member.role}
                    </span>
                  </span>
                </Button>
              ))}
              {filteredMembers.length === 0 ? (
                <p className='text-muted-foreground py-3 text-center text-sm'>
                  No staff members found
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <label htmlFor='mobile-conversation-search' className='sr-only'>
          Search conversations
        </label>
        <div className='relative pb-3'>
          <Icons.search
            className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2'
            aria-hidden='true'
          />
          <Input
            id='mobile-conversation-search'
            type='search'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search conversations'
            className='h-11 pl-10 text-base sm:text-sm'
          />
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto pb-3' role='list'>
          {filtered.map((conversation) => {
            const lastMessage = conversation.messages[conversation.messages.length - 1];
            return (
              <button
                key={conversation.id}
                type='button'
                className='hover:bg-muted/55 focus-visible:ring-primary/50 flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none'
                onClick={() => onSelect(conversation.id)}
                role='listitem'
              >
                <div className='relative shrink-0'>
                  <Avatar className='h-12 w-12'>
                    <AvatarFallback className='bg-primary/15 text-primary text-sm font-semibold'>
                      {conversation.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      'border-background absolute right-0 bottom-0 h-3 w-3 rounded-full border-2',
                      statusDotColor[conversation.status]
                    )}
                  />
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <p className='text-foreground min-w-0 flex-1 truncate text-[0.95rem] font-semibold'>
                      {conversation.name}
                    </p>
                    {lastMessage ? (
                      <span className='text-muted-foreground shrink-0 text-xs'>
                        {lastMessage.timestamp}
                      </span>
                    ) : null}
                  </div>
                  <p className='text-muted-foreground mt-0.5 truncate text-sm'>
                    {previewFor(conversation)}
                  </p>
                </div>
                {conversation.unread > 0 ? (
                  <span className='bg-primary text-primary-foreground inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.65rem] font-semibold'>
                    {conversation.unread}
                  </span>
                ) : null}
              </button>
            );
          })}
          {filtered.length === 0 ? (
            <p className='text-muted-foreground py-10 text-center text-sm'>
              No conversations found
            </p>
          ) : null}
        </div>
      </section>

      <section className='border-border/40 bg-background/75 hidden h-full min-h-0 flex-col gap-4 overflow-hidden rounded-2xl border p-3 backdrop-blur lg:col-start-1 lg:col-end-2 lg:flex lg:rounded-3xl lg:p-4'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <p className='text-foreground text-sm font-semibold'>Staff chat</p>
            <p className='text-muted-foreground text-xs'>
              {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
            </p>
          </div>
          <Badge
            variant='outline'
            className='bg-primary/15 text-primary border-border/50 rounded-full border px-3 py-1 text-[0.7rem] tracking-[0.24em] uppercase'
          >
            Inbox
          </Badge>
        </div>

        <div className='space-y-2 rounded-2xl border border-border/40 bg-background/60 p-3'>
          <p className='text-sm font-medium'>New chat</p>
          <label htmlFor='desktop-member-search' className='sr-only'>
            Search staff members
          </label>
          <div className='relative'>
            <Icons.search className='text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
            <Input
              id='desktop-member-search'
              type='search'
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder='Search staff, role, or email'
              className='w-full pl-10 text-sm'
            />
          </div>
          <div className='max-h-48 space-y-1 overflow-y-auto pr-1'>
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
                  <span className='text-muted-foreground block truncate text-xs'>
                    {member.role}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </div>

        <label htmlFor='desktop-conversation-search' className='sr-only'>
          Search conversations
        </label>
        <div className='relative'>
          <Icons.search className='text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
          <Input
            id='desktop-conversation-search'
            type='search'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search conversations'
            className='w-full pl-10 text-sm'
          />
        </div>

        <div
          className='flex-1 space-y-2 overflow-y-auto pr-1'
          aria-label='Conversation list'
          role='list'
        >
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
                  'focus-visible:ring-primary/50 group relative flex w-full items-start gap-3 rounded-2xl border border-transparent p-3 text-left transition-all focus-visible:ring-2 focus-visible:outline-none',
                  isActive
                    ? 'border-primary/40 bg-primary/10'
                    : 'bg-background/70 hover:border-border/40 hover:bg-muted/40'
                )}
                role='listitem'
              >
                <Avatar className='h-10 w-10 rounded-2xl'>
                  <AvatarFallback className='bg-primary/15 text-primary rounded-2xl text-sm font-medium'>
                    {conversation.initials}
                  </AvatarFallback>
                </Avatar>
                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0 flex-1'>
                      <p className='text-foreground text-sm font-semibold'>{conversation.name}</p>
                      <p className='text-muted-foreground text-xs'>{conversation.title}</p>
                    </div>
                    {lastMessage ? (
                      <span className='text-muted-foreground shrink-0 text-[0.65rem]'>
                        {lastMessage.timestamp}
                      </span>
                    ) : null}
                  </div>
                  <p className='text-muted-foreground line-clamp-2 text-xs'>
                    {previewFor(conversation)}
                  </p>
                </div>
                {conversation.unread > 0 ? (
                  <span className='bg-primary text-primary-foreground ml-2 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full text-[0.7rem] font-semibold'>
                    {conversation.unread}
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </div>
      </section>
    </>
  );
}
