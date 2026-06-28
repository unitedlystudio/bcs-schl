'use client';

import { useEffect, useRef } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { toast } from 'sonner';

export default function CurrentUserInviteClaimSync() {
  const { organization } = useOrganization();
  const { user, isLoaded } = useUser();
  const claimCurrentUserInvite = useMutation(api.schoolOrganization.claimCurrentUserInvite);
  const attemptedKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoaded || !organization || !user?.primaryEmailAddress?.emailAddress) {
      return;
    }

    const syncKey = `${organization.id}:${user.primaryEmailAddress.emailAddress.toLowerCase()}`;
    if (attemptedKeys.current.has(syncKey)) {
      return;
    }

    attemptedKeys.current.add(syncKey);

    void (async () => {
      try {
        const result = await claimCurrentUserInvite({ orgId: organization.id });
        if (result.claimed) {
          toast.success(`Your ${result.dashboardRole} dashboard access is now active.`);
        }
      } catch (error) {
        console.error(error);
      }
    })();
  }, [claimCurrentUserInvite, isLoaded, organization, user?.primaryEmailAddress?.emailAddress]);

  return null;
}
