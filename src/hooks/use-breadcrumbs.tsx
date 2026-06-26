'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

function getDynamicBreadcrumbs(pathname: string): BreadcrumbItem[] | null {
  if (/^\/dashboard\/students\/[^/]+$/.test(pathname)) {
    return [
      { title: 'Dashboard', link: '/dashboard' },
      { title: 'Students', link: '/dashboard/students' },
      { title: 'Student Profile', link: pathname }
    ];
  }

  if (/^\/dashboard\/billing\/[^/]+$/.test(pathname)) {
    return [
      { title: 'Dashboard', link: '/dashboard' },
      { title: 'Finance & Fees', link: '/dashboard/billing' },
      { title: 'Student Finance', link: pathname }
    ];
  }

  if (/^\/dashboard\/product\/[^/]+$/.test(pathname)) {
    return [
      { title: 'Dashboard', link: '/dashboard' },
      { title: 'Product', link: '/dashboard/product' },
      { title: 'Product Details', link: pathname }
    ];
  }

  if (pathname.startsWith('/dashboard/profile')) {
    return [
      { title: 'Dashboard', link: '/dashboard' },
      { title: 'Profile', link: '/dashboard/profile' }
    ];
  }

  if (pathname.startsWith('/dashboard/workspaces/team')) {
    return [
      { title: 'Dashboard', link: '/dashboard' },
      { title: 'Workspaces', link: '/dashboard/workspaces' },
      { title: 'Team Workspace', link: pathname }
    ];
  }

  return null;
}

// This allows to add custom title as well
const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ title: 'Dashboard', link: '/dashboard' }],
  '/dashboard/employee': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Employee', link: '/dashboard/employee' }
  ],
  '/dashboard/product': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Product', link: '/dashboard/product' }
  ]
  // Add more custom mappings as needed
};

export function useBreadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Check if we have a custom mapping for this exact path
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }

    const dynamicBreadcrumbs = getDynamicBreadcrumbs(pathname);
    if (dynamicBreadcrumbs) {
      return dynamicBreadcrumbs;
    }

    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return {
        title: segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path
      };
    });
  }, [pathname]);

  return breadcrumbs;
}
