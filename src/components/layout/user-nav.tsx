'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { useApplicationAccess } from './application-access-gate';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

export function UserNav() {
  const { user } = useApplicationAccess();
  const router = useRouter();
  const queryClient = useQueryClient();
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
          <UserAvatarProfile user={user} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='end' sideOffset={10}>
        <DropdownMenuLabel>
          <p className='text-sm font-medium'>{user.name}</p>
          <p className='text-xs text-muted-foreground'>{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            queryClient.clear();
            void authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  router.replace('/auth/sign-in');
                  router.refresh();
                }
              }
            });
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
