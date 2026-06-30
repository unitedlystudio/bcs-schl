'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useOrganizationList } from '@clerk/nextjs';

export default function ActiveOrganizationSync() {
  const router = useRouter();
  const pathname = usePathname();
  const { orgId } = useAuth();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: {
      infinite: true,
      keepPreviousData: false
    }
  });
  const lastActivationAttempt = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || orgId) {
      return;
    }

    const memberships = userMemberships?.data ?? [];

    if (memberships.length === 1) {
      const soleOrganizationId = memberships[0]?.organization.id;

      if (!soleOrganizationId || lastActivationAttempt.current === soleOrganizationId) {
        return;
      }

      lastActivationAttempt.current = soleOrganizationId;
      void setActive?.({ organization: soleOrganizationId });
      return;
    }

    if (memberships.length > 1 && pathname !== '/dashboard/workspaces') {
      router.replace('/dashboard/workspaces');
    }
  }, [isLoaded, orgId, pathname, router, setActive, userMemberships]);

  return null;
}
