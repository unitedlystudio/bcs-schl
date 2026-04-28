'use client';

/**
 * Fully client-side hook for filtering navigation items based on RBAC
 */

import { useMemo } from 'react';
import type { NavGroup, NavItem } from '@/types';
import { MANAGED_NAV_PERMISSION_KEYS } from '@/lib/school-permissions';
import { useDashboardAccess } from '@/hooks/use-dashboard-access';

function shouldAllowPermission(
  permission: string,
  dashboardAccess: ReturnType<typeof useDashboardAccess>
) {
  if (!dashboardAccess.hasOrg) {
    return false;
  }

  if (dashboardAccess.isLoadingManagedProfile) {
    return false;
  }

  if (
    permission === 'org:admin:manage' ||
    permission === 'org:finance:read' ||
    permission === 'org:finance:write'
  ) {
    return dashboardAccess.hasPermission(permission);
  }

  if (permission === 'org:access:read') {
    return dashboardAccess.hasManagedProfile
      ? dashboardAccess.hasPermission(permission)
      : dashboardAccess.hasPermission('org:admin:manage');
  }

  if (MANAGED_NAV_PERMISSION_KEYS.has(permission as never)) {
    return dashboardAccess.hasManagedProfile ? dashboardAccess.hasPermission(permission) : true;
  }

  return dashboardAccess.hasPermission(permission);
}

function isRoleMatch(expectedRole: string | undefined, actualRole: string) {
  if (!expectedRole) {
    return true;
  }

  return actualRole === expectedRole.toLowerCase();
}

function canAccessItem(item: NavItem, dashboardAccess: ReturnType<typeof useDashboardAccess>) {
  if (!item.access) {
    return true;
  }

  if (item.access.requireOrg && !dashboardAccess.hasOrg) {
    return false;
  }

  if (item.access.permission && !shouldAllowPermission(item.access.permission, dashboardAccess)) {
    return false;
  }

  if (!isRoleMatch(item.access.role, dashboardAccess.clerkRole)) {
    return false;
  }

  if (item.access.plan || item.access.feature) {
    console.warn(
      `Plan/feature checks for navigation items require server-side verification. Item "${item.title}" will be shown, but page-level protection should be implemented.`
    );
  }

  return true;
}

export function useFilteredNavItems(items: NavItem[]) {
  const dashboardAccess = useDashboardAccess();

  return useMemo(
    () =>
      items
        .filter((item) => canAccessItem(item, dashboardAccess))
        .map((item) => ({
          ...item,
          items: item.items?.filter((childItem) => canAccessItem(childItem, dashboardAccess)) ?? []
        })),
    [dashboardAccess, items]
  );
}

export function useFilteredNavGroups(groups: NavGroup[]) {
  const allItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const filteredItems = useFilteredNavItems(allItems);

  return useMemo(() => {
    const filteredSet = new Set(filteredItems.map((item) => item.title));
    return groups
      .map((group) => ({
        ...group,
        items: filteredItems.filter((item) =>
          group.items.some(
            (groupItem) => groupItem.title === item.title && filteredSet.has(groupItem.title)
          )
        )
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredItems, groups]);
}
