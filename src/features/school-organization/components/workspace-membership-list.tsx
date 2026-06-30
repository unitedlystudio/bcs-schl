'use client';

import { useState } from 'react';
import { useOrganizationList } from '@clerk/nextjs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

export default function WorkspaceMembershipList() {
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: {
      infinite: true,
      keepPreviousData: false
    }
  });
  const [activatingOrgId, setActivatingOrgId] = useState<string | null>(null);

  const memberships = userMemberships?.data ?? [];

  const openWorkspace = async (organizationId: string) => {
    setActivatingOrgId(organizationId);
    try {
      await setActive?.({
        organization: organizationId,
        redirectUrl: '/dashboard'
      });
    } finally {
      setActivatingOrgId(null);
    }
  };

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className='flex items-center gap-2 p-6 text-sm text-muted-foreground'>
          <Icons.spinner className='size-4 animate-spin' /> Loading school workspaces…
        </CardContent>
      </Card>
    );
  }

  if (memberships.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className='flex items-start gap-3'>
            <div className='rounded-full bg-primary/10 p-2 text-primary'>
              <span className='block text-sm font-semibold'>!</span>
            </div>
            <div className='space-y-1'>
              <CardTitle>No school workspace assigned yet</CardTitle>
              <CardDescription>
                Schly is closed and invite-only. Ask a school owner or admin to invite you before
                creating an account or joining a workspace.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      {memberships.map((membership) => (
        <Card key={membership.id} className='border-border/60'>
          <CardHeader>
            <div className='flex items-start justify-between gap-3'>
              <div className='space-y-1'>
                <CardTitle className='flex items-center gap-2 text-lg'>
                  <span className='inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary'>
                    S
                  </span>
                  {membership.organization.name}
                </CardTitle>
                <CardDescription>
                  Open this invited school workspace and continue into your school dashboard.
                </CardDescription>
              </div>
              <Badge variant='outline'>{membership.roleName}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              className='w-full'
              onClick={() => void openWorkspace(membership.organization.id)}
              disabled={activatingOrgId === membership.organization.id}
            >
              {activatingOrgId === membership.organization.id ? (
                <Icons.spinner className='mr-2 size-4 animate-spin' />
              ) : null}
              Open workspace
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
