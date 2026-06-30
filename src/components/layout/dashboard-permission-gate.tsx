'use client';

import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardAccess } from '@/hooks/use-dashboard-access';
import {
  DASHBOARD_PERMISSION_CATALOG,
  type DashboardPermissionKey
} from '@/lib/school-permissions';

type DashboardPermissionGateProps = {
  permission: DashboardPermissionKey;
  children: ReactNode;
  areaLabel?: string;
};

export function DashboardPermissionGate({
  permission,
  children,
  areaLabel
}: DashboardPermissionGateProps) {
  const dashboardAccess = useDashboardAccess();
  const permissionMeta = DASHBOARD_PERMISSION_CATALOG.find((entry) => entry.key === permission);
  const resolvedAreaLabel = areaLabel ?? permissionMeta?.label ?? 'Dashboard area';

  if (dashboardAccess.isLoadingManagedProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checking {resolvedAreaLabel.toLowerCase()} access</CardTitle>
          <CardDescription>
            Schly is resolving your school dashboard permissions before opening this area.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (dashboardAccess.hasPermission(permission)) {
    return <>{children}</>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{resolvedAreaLabel} access required</CardTitle>
        <CardDescription>
          {permissionMeta?.description ??
            'This area is only available to staff with the required dashboard permission.'}
        </CardDescription>
      </CardHeader>
      <CardContent className='text-sm text-muted-foreground'>
        {dashboardAccess.hasOrg
          ? 'Your current organization membership does not include access to this dashboard area.'
          : 'Switch into an organization with the required dashboard permission to open this area.'}
      </CardContent>
    </Card>
  );
}
