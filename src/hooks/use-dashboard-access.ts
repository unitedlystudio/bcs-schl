'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';
import {
  hasDashboardPermission,
  normalizeDashboardPermissions,
  type DashboardPermissionKey
} from '@/lib/school-permissions';

type TrustedDashboardAccessResponse = {
  orgId: string;
  hasManagedProfile: boolean;
  dashboardRole: string;
  roleTemplateId: string | null;
  permissions: string[];
  managedPermissions: string[];
  clerkRole: string;
};

const DASHBOARD_ACCESS_UPDATED_EVENT = 'schly-dashboard-access-updated';

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
  const [trustedAccess, setTrustedAccess] = useState<TrustedDashboardAccessResponse | null>(null);
  const [trustedAccessLoaded, setTrustedAccessLoaded] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      setTrustedAccess(null);
      setTrustedAccessLoaded(true);
      return;
    }

    let cancelled = false;

    const loadTrustedAccess = async () => {
      setTrustedAccessLoaded(false);

      try {
        const response = await fetch(
          `/api/dashboard-access?orgId=${encodeURIComponent(organizationId)}`,
          {
            cache: 'no-store',
            credentials: 'same-origin'
          }
        );

        if (!response.ok) {
          throw new Error(`dashboard access bootstrap failed with ${response.status}`);
        }

        const payload = (await response.json()) as TrustedDashboardAccessResponse;

        if (!cancelled) {
          setTrustedAccess(payload);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setTrustedAccess(null);
        }
      } finally {
        if (!cancelled) {
          setTrustedAccessLoaded(true);
        }
      }
    };

    void loadTrustedAccess();

    const refreshTrustedAccess = () => {
      void loadTrustedAccess();
    };

    window.addEventListener(DASHBOARD_ACCESS_UPDATED_EVENT, refreshTrustedAccess);

    return () => {
      cancelled = true;
      window.removeEventListener(DASHBOARD_ACCESS_UPDATED_EVENT, refreshTrustedAccess);
    };
  }, [organizationId]);

  return useMemo(() => {
    const resolvedAccess = trustedAccess ?? storedAccess;
    const managedPermissions = normalizeDashboardPermissions(
      resolvedAccess?.managedPermissions ?? []
    );
    const hasManagedProfile = Boolean(resolvedAccess?.hasManagedProfile);
    const permissions = hasManagedProfile ? managedPermissions : clerkPermissions;
    const storedRole = resolvedAccess?.dashboardRole?.trim() || 'Inherited';
    const dashboardRole = storedRole;
    const effectiveRole = hasManagedProfile ? '' : clerkRole;
    const isTrustedAccessPending = Boolean(organizationId) && !trustedAccessLoaded;
    const isDirectAccessPending = Boolean(organizationId) && storedAccess === undefined;

    return {
      hasOrg: Boolean(organization),
      organizationId,
      clerkRole,
      clerkPermissions,
      dashboardRole,
      hasManagedProfile,
      permissions,
      isLoadingManagedProfile: isTrustedAccessPending || isDirectAccessPending,
      hasPermission: (permission: DashboardPermissionKey | string) =>
        Boolean(organization) && hasDashboardPermission(permissions, permission, effectiveRole)
    };
  }, [
    clerkPermissions,
    clerkRole,
    organization,
    organizationId,
    storedAccess,
    trustedAccess,
    trustedAccessLoaded
  ]);
}
