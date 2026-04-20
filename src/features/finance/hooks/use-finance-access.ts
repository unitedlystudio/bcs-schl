'use client';

import { useMemo } from 'react';
import { useOrganization } from '@clerk/nextjs';

export function useFinanceAccess() {
  const { membership, organization } = useOrganization();

  return useMemo(() => {
    const permissions = (membership?.permissions ?? []) as string[];
    const role = membership?.role?.toLowerCase() ?? '';
    const hasFinancePermission =
      permissions.includes('org:finance:read') ||
      permissions.includes('org:finance:write') ||
      permissions.includes('org:admin:manage');
    const hasFinanceWritePermission =
      permissions.includes('org:finance:write') || permissions.includes('org:admin:manage');
    const hasFinanceRole = role.includes('admin') || role.includes('account');

    return {
      hasFinanceAccess: Boolean(organization) && (hasFinancePermission || hasFinanceRole),
      hasFinanceWriteAccess: Boolean(organization) && (hasFinanceWritePermission || hasFinanceRole),
      hasOrg: Boolean(organization),
      role
    };
  }, [membership?.permissions, membership?.role, organization]);
}
