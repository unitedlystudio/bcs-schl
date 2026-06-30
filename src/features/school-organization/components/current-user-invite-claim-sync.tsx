'use client';

import { useEffect, useRef } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

const DASHBOARD_ACCESS_UPDATED_EVENT = 'schly-dashboard-access-updated';

export default function CurrentUserInviteClaimSync() {
  const { organization } = useOrganization();
  const { user, isLoaded } = useUser();
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
        const response = await fetch(
          `/api/dashboard-access/claim?orgId=${encodeURIComponent(organization.id)}`,
          {
            method: 'POST',
            credentials: 'same-origin'
          }
        );

        if (!response.ok) {
          throw new Error(`dashboard invite claim failed with ${response.status}`);
        }

        const result = (await response.json()) as {
          claimed: boolean;
          dashboardRole?: string;
        };

        if (result.claimed) {
          toast.success(`Your ${result.dashboardRole} dashboard access is now active.`);
          window.dispatchEvent(new Event(DASHBOARD_ACCESS_UPDATED_EVENT));
        }
      } catch (error) {
        console.error(error);
      }
    })();
  }, [isLoaded, organization, user?.primaryEmailAddress?.emailAddress]);

  return null;
}
