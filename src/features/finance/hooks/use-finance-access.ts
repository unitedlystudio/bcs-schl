'use client';

import { useMemo } from 'react';
import { useDashboardAccess } from '@/hooks/use-dashboard-access';

export function useFinanceAccess() {
  const dashboardAccess = useDashboardAccess();

  return useMemo(() => {
    const isLoadingFinanceAccess = dashboardAccess.isLoadingManagedProfile;
    const hasFinanceAccess =
      !isLoadingFinanceAccess && dashboardAccess.hasPermission('org:finance:read');
    const hasFinanceWriteAccess =
      !isLoadingFinanceAccess && dashboardAccess.hasPermission('org:finance:write');

    return {
      hasFinanceAccess,
      hasFinanceWriteAccess,
      canQueryFinance: !isLoadingFinanceAccess && hasFinanceAccess,
      isLoadingFinanceAccess,
      hasOrg: dashboardAccess.hasOrg,
      role: dashboardAccess.clerkRole,
      dashboardRole: dashboardAccess.dashboardRole,
      hasManagedProfile: dashboardAccess.hasManagedProfile
    };
  }, [dashboardAccess]);
}
