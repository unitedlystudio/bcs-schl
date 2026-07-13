'use client';

import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Conversation } from '../utils/types';

const statusDotColor = {
  online: 'bg-green-500',
  offline: 'bg-red-500'
} as const;

interface ChatHeaderProps {
  conversation: Conversation;
  onBack: () => void;
}

export function ChatHeader({ conversation, onBack }: ChatHeaderProps) {
  return (
    <header className='flex items-center gap-3 sm:gap-4'>
      <div className='flex min-w-0 items-center gap-2 sm:gap-3'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-9 shrink-0 rounded-full lg:hidden'
          onClick={onBack}
          aria-label='Back to inbox'
        >
          <Icons.chevronLeft className='h-5 w-5' aria-hidden='true' />
        </Button>
        <div className='relative shrink-0'>
          <Avatar className='border-border/40 bg-card/80 text-foreground h-10 w-10 rounded-2xl border sm:h-12 sm:w-12 sm:rounded-3xl'>
            <AvatarFallback className='bg-primary/20 text-primary rounded-2xl text-sm font-semibold sm:rounded-3xl sm:text-base'>
              {conversation.initials}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'border-background absolute right-0 bottom-0 inline-flex h-3 w-3 rounded-full border-2 sm:h-3.5 sm:w-3.5',
              statusDotColor[conversation.status]
            )}
            aria-label={conversation.status === 'online' ? 'Online' : 'Offline'}
          />
        </div>
        <div className='min-w-0'>
          <p className='text-foreground truncate text-sm font-semibold sm:text-base'>
            {conversation.name}
          </p>
          <p className='text-muted-foreground truncate text-xs sm:text-sm'>{conversation.title}</p>
        </div>
      </div>
    </header>
  );
}
