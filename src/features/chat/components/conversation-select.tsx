'use client';

import { useMemo, useState } from 'react';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Conversation, StaffMember } from '../utils/types';

interface ConversationSelectProps {
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

export function ConversationSelect({
  conversations,
  selectedId,
  members,
  startingMemberId,
  onSelect,
  onStartConversation
}: ConversationSelectProps) {
  const [memberSearch, setMemberSearch] = useState('');
  const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false);

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

    return base.slice(0, 6);
  }, [memberSearch, members]);

  const handleStartConversation = (member: StaffMember) => {
    onStartConversation(member);
    setIsMemberSearchOpen(false);
    setMemberSearch('');
  };

  return (
    <div className='border-border/40 bg-background/75 flex flex-col gap-3 rounded-2xl border p-3 backdrop-blur sm:gap-4 sm:rounded-3xl sm:p-4 lg:hidden'>
      <div className='flex items-center justify-between gap-2 sm:gap-3'>
        <div>
          <p className='text-foreground text-xs font-semibold sm:text-sm'>Staff chat</p>
          <p className='text-muted-foreground text-[0.65rem] sm:text-xs'>
            {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary border-border/50 size-9 rounded-full sm:size-10'
          aria-label={isMemberSearchOpen ? 'Close staff search' : 'Start a new chat'}
          aria-expanded={isMemberSearchOpen}
          onClick={() => setIsMemberSearchOpen((open) => !open)}
        >
          {isMemberSearchOpen ? (
            <Icons.close className='h-4 w-4' aria-hidden='true' />
          ) : (
            <Icons.chat className='h-4 w-4' aria-hidden='true' />
          )}
        </Button>
      </div>

      {isMemberSearchOpen ? (
        <div className='space-y-2 rounded-2xl border border-border/40 bg-background/60 p-2.5'>
          <Input
            type='search'
            value={memberSearch}
            onChange={(event) => setMemberSearch(event.target.value)}
            placeholder='Search staff member'
            className='h-10 rounded-xl text-base sm:text-sm'
          />
          <div className='max-h-44 space-y-1 overflow-y-auto'>
            {filteredMembers.map((member) => (
              <Button
                key={member.userId}
                type='button'
                variant='ghost'
                className='h-auto w-full justify-start rounded-xl px-2 py-2 text-left'
                disabled={startingMemberId === member.userId}
                onClick={() => handleStartConversation(member)}
              >
                <Avatar className='mr-2 h-7 w-7 rounded-xl'>
                  <AvatarFallback className='bg-primary/15 text-primary rounded-xl text-[0.65rem]'>
                    {initialsFor(member.name)}
                  </AvatarFallback>
                </Avatar>
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-xs font-medium'>{member.name}</span>
                  <span className='text-muted-foreground block truncate text-[0.65rem]'>
                    {member.role}
                  </span>
                </span>
              </Button>
            ))}
            {filteredMembers.length === 0 ? (
              <p className='text-muted-foreground py-2 text-center text-xs'>
                No staff members found
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className='space-y-1.5 sm:space-y-2'>
        <label
          htmlFor='messenger-conversation'
          className='text-muted-foreground text-[0.65rem] font-medium sm:text-xs'
        >
          Conversation
        </label>
        <select
          id='messenger-conversation'
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className='border-border/40 bg-background/70 text-foreground focus:border-primary/40 focus:ring-primary/30 w-full rounded-xl border px-2.5 py-1.5 text-base focus:ring-2 focus:outline-none sm:rounded-2xl sm:px-3 sm:py-2 sm:text-sm'
        >
          {conversations.length === 0 ? <option value=''>No conversations yet</option> : null}
          {conversations.map((conversation) => (
            <option key={conversation.id} value={conversation.id}>
              {conversation.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
