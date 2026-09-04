'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '../../../convex/_generated/api';
import { authClient } from '@/lib/auth-client';
import type { DashboardPermissionKey } from '@/lib/school-permissions';
import { Button } from '@/components/ui/button';
import {
  clearInviteToken,
  getInviteToken,
  isCompletedInviteClaim
} from '@/lib/invite-token-memory';

interface AccessValue {
  state: 'loading' | 'authorized';
  user?: { id: string; authUserId: string; email: string; name?: string };
  roleKeys: string[];
  permissions: string[];
  hasPermission: (permission: DashboardPermissionKey | string) => boolean;
}

const AccessContext = createContext<AccessValue | null>(null);

export function useApplicationAccess(): AccessValue {
  const value = useContext(AccessContext);
  if (!value) throw new Error('Application access must be used inside ApplicationAccessGate');
  return value;
}

export function ApplicationAccessGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const access = useQuery(api.viewer.getAccess);
  const bootstrap = useMutation(api.bootstrap.ensureCurrentUser);
  const claim = useMutation(api.invites.claimCurrent);

  useEffect(() => {
    if (access?.state === 'unauthorized') router.replace('/auth/sign-in');
    if (access?.canBootstrap) void bootstrap({});
    const token = getInviteToken();
    if (access?.state === 'unassigned' && token) {
      void claim({ token })
        .then((result) => {
          if (isCompletedInviteClaim(result.status)) {
            clearInviteToken();
            router.refresh();
          }
        })
        .catch(() => undefined);
    }
  }, [access, bootstrap, claim, router]);

  const value = useMemo<AccessValue>(() => {
    const permissions = access?.state === 'authorized' ? access.permissions : [];
    return {
      state: access?.state === 'authorized' ? 'authorized' : 'loading',
      user: access?.state === 'authorized' ? access.user : undefined,
      roleKeys: access?.state === 'authorized' ? access.roleKeys : [],
      permissions,
      hasPermission: (permission) =>
        new Set<string>(permissions).has(permission) || permissions.includes('org:admin:manage')
    };
  }, [access]);

  if (!access || access.canBootstrap)
    return (
      <div className='grid min-h-screen place-items-center text-sm text-muted-foreground'>
        Checking school access…
      </div>
    );
  if (access.state === 'unauthorized') return null;
  if (access.state !== 'authorized') {
    return (
      <div className='grid min-h-screen place-items-center p-6'>
        <div className='max-w-md space-y-4 text-center'>
          <h1 className='text-xl font-semibold'>School access unavailable</h1>
          <p className='text-muted-foreground'>
            Your account does not have an active role for this school.
          </p>
          <Button
            onClick={() =>
              void authClient.signOut({
                fetchOptions: { onSuccess: () => router.replace('/auth/sign-in') }
              })
            }
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}
