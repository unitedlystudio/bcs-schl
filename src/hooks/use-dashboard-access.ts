'use client';

import { useMemo } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';
import {
  hasDashboardPermission,
  normalizeDashboardPermissions,
  type DashboardPermissionKey
} from '@/lib/school-permissions';

export function useDashboardAccess() {
  const { organization, membership } = useOrganization();
  const organizationId = organization?.id;
  const clerkPermissions = useMemo(
    () => normalizeDashboardPermissions((membership?.permissions ?? []) as string[]),
    [membership?.permissions]
  );
  const clerkRole = membership?.role?.toLowerCase() ?? '';
  const storedAccess = useQuery(
    api.schoolOrganization.getCurrentAccess,
    organizationId ? { orgId: organizationId } : 'skip'
  );

  return useMemo(() => {
    const managedPermissions = normalizeDashboardPermissions(
      storedAccess?.managedPermissions ?? []
    );
    const hasManagedProfile = Boolean(storedAccess?.hasManagedProfile);
    const permissions = hasManagedProfile ? managedPermissions : clerkPermissions;
    const storedRole = storedAccess?.dashboardRole?.trim() || 'Inherited';
    const dashboardRole = storedRole;
    const effectiveRole = hasManagedProfile ? '' : clerkRole;

    return {
      hasOrg: Boolean(organization),
      organizationId,
      clerkRole,
      clerkPermissions,
      dashboardRole,
      hasManagedProfile,
      permissions,
      isLoadingManagedProfile: organizationId ? storedAccess === undefined : false,
      hasPermission: (permission: DashboardPermissionKey | string) =>
        Boolean(organization) && hasDashboardPermission(permissions, permission, effectiveRole)
    };
  }, [clerkPermissions, clerkRole, organization, organizationId, storedAccess]);
}
