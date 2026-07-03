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
const DASHBOARD_ACCESS_CACHE_TTL_MS = 5 * 60 * 1000;

const trustedAccessCache = new Map<
  string,
  { payload: TrustedDashboardAccessResponse; loadedAt: number }
>();
const trustedAccessRequests = new Map<string, Promise<TrustedDashboardAccessResponse>>();

function readCachedTrustedAccess(organizationId?: string) {
  if (!organizationId) return null;

  const cached = trustedAccessCache.get(organizationId);
  if (!cached) return null;

  if (Date.now() - cached.loadedAt > DASHBOARD_ACCESS_CACHE_TTL_MS) {
    trustedAccessCache.delete(organizationId);
    return null;
  }

  return cached.payload;
}

async function loadTrustedDashboardAccess(organizationId: string) {
  const cached = readCachedTrustedAccess(organizationId);
  if (cached) return cached;

  const existingRequest = trustedAccessRequests.get(organizationId);
  if (existingRequest) return existingRequest;

  const request = fetch(`/api/dashboard-access?orgId=${encodeURIComponent(organizationId)}`, {
    cache: 'no-store',
    credentials: 'same-origin'
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`dashboard access bootstrap failed with ${response.status}`);
      }

      const payload = (await response.json()) as TrustedDashboardAccessResponse;
      trustedAccessCache.set(organizationId, { payload, loadedAt: Date.now() });
      return payload;
    })
    .finally(() => {
      trustedAccessRequests.delete(organizationId);
    });

  trustedAccessRequests.set(organizationId, request);
  return request;
}

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
  const [trustedAccess, setTrustedAccess] = useState<TrustedDashboardAccessResponse | null>(() =>
    readCachedTrustedAccess(organizationId)
  );
  const [trustedAccessLoaded, setTrustedAccessLoaded] = useState(() =>
    Boolean(!organizationId || readCachedTrustedAccess(organizationId))
  );

  useEffect(() => {
    if (!organizationId) {
      setTrustedAccess(null);
      setTrustedAccessLoaded(true);
      return;
    }

    let cancelled = false;

    const loadTrustedAccess = async () => {
      const cached = readCachedTrustedAccess(organizationId);
      if (cached) {
        setTrustedAccess(cached);
        setTrustedAccessLoaded(true);
        return;
      }

      setTrustedAccessLoaded(Boolean(trustedAccess));

      try {
        const payload = await loadTrustedDashboardAccess(organizationId);

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
      trustedAccessCache.delete(organizationId);
      void loadTrustedAccess();
    };

    window.addEventListener(DASHBOARD_ACCESS_UPDATED_EVENT, refreshTrustedAccess);

    return () => {
      cancelled = true;
      window.removeEventListener(DASHBOARD_ACCESS_UPDATED_EVENT, refreshTrustedAccess);
    };
  }, [organizationId, trustedAccess]);

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
    const isDirectAccessPending =
      Boolean(organizationId) && !trustedAccess && storedAccess === undefined;

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
