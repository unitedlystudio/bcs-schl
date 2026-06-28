'use client';

import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { Icons } from '@/components/icons';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';
import { useEffect } from 'react';

export function OrgSwitcher() {
  const { state } = useSidebar();
  const router = useRouter();
  const { isLoaded, userMemberships } = useOrganizationList({
    userMemberships: {
      infinite: true,
      keepPreviousData: false
    }
  });

  const { orgId } = useAuth();

  useEffect(() => {
    if (userMemberships?.revalidate) {
      void userMemberships.revalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only revalidate when org changes, not on every userMemberships ref change
  }, [orgId]);

  const activeOrganization = userMemberships?.data?.find(
    (membership) => membership.organization.id === orgId
  )?.organization;
  const activeMembership = userMemberships?.data?.find(
    (membership) => membership.organization.id === orgId
  );

  if (!isLoaded) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg' disabled>
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg'>
              <Icons.galleryVerticalEnd className='size-4' />
            </div>
            <div
              className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
                state === 'collapsed'
                  ? 'invisible max-w-0 overflow-hidden opacity-0'
                  : 'visible max-w-full opacity-100'
              }`}
            >
              <span className='truncate font-medium'>Loading...</span>
              <span className='text-muted-foreground truncate text-xs'>School workspace</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!userMemberships?.data || userMemberships.data.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size='lg'
            onClick={() => router.push('/dashboard/workspaces')}
            className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
          >
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
              <Icons.add className='size-4' />
            </div>
            <div
              className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
                state === 'collapsed'
                  ? 'invisible max-w-0 overflow-hidden opacity-0'
                  : 'visible max-w-full opacity-100'
              }`}
            >
              <span className='truncate font-medium'>Invite-only workspace</span>
              <span className='text-muted-foreground truncate text-xs'>
                Ask an admin for access
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const displayOrganization = activeOrganization || userMemberships.data[0]?.organization;
  const displayMembership = activeMembership || userMemberships.data[0];

  if (!displayOrganization) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size='lg' className='cursor-default pointer-events-none select-none'>
          <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
            {displayOrganization.hasImage && displayOrganization.imageUrl ? (
              <Image
                src={displayOrganization.imageUrl}
                alt={displayOrganization.name}
                width={32}
                height={32}
                className='size-full object-cover'
              />
            ) : (
              <Icons.galleryVerticalEnd className='size-4' />
            )}
          </div>
          <div
            className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
              state === 'collapsed'
                ? 'invisible max-w-0 overflow-hidden opacity-0'
                : 'visible max-w-full opacity-100'
            }`}
          >
            <span className='truncate font-medium'>{displayOrganization.name}</span>
            <span className='text-muted-foreground truncate text-xs'>
              {displayMembership?.role || 'School workspace'}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
