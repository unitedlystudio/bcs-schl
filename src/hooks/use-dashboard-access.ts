'use client';

import { useApplicationAccess } from '@/components/layout/application-access-gate';

export function useDashboardAccess() {
  const access = useApplicationAccess();
  return {
    hasMembership: access.state === 'authorized',
    role: access.roleKeys[0] ?? '',
    dashboardRole: access.roleKeys[0] ?? '',
    hasManagedProfile: access.state === 'authorized',
    permissions: access.permissions,
    isLoadingManagedProfile: access.state === 'loading',
    hasPermission: access.hasPermission,
    user: access.user
  };
}
