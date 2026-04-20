'use client';

import type * as React from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinanceAccess } from '../hooks/use-finance-access';

export function FinanceAccessGate({ children }: { children: React.ReactNode }) {
  const { hasFinanceAccess, hasOrg } = useFinanceAccess();

  if (hasFinanceAccess) {
    return <>{children}</>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finance access required</CardTitle>
        <CardDescription>
          Finance & Fees is restricted to approved school finance roles and admins.
        </CardDescription>
      </CardHeader>
      <CardContent className='text-sm text-muted-foreground'>
        {hasOrg
          ? 'Your current organization membership does not include finance visibility.'
          : 'Switch into an organization with finance access to open student billing and collections.'}
      </CardContent>
    </Card>
  );
}
