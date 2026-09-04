'use client';

import { ConvexBetterAuthProvider, type AuthClient } from '@convex-dev/better-auth/react';
import React, { useMemo } from 'react';
import { Icons } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { authClient } from '@/lib/auth-client';
import { inspectPublicAuthConfig } from '@/lib/auth-server-config';
import { getConvexClient } from '@/lib/convex';
import { ActiveThemeProvider } from '../themes/active-theme';
import QueryProvider from './query-provider';

function MissingConfig({ error }: { error: string }) {
  return (
    <div className='flex min-h-screen items-center justify-center px-6'>
      <Alert variant='destructive' className='max-w-xl'>
        <Icons.alertCircle className='h-4 w-4' />
        <AlertTitle>Authentication configuration is missing</AlertTitle>
        <AlertDescription>
          {error} Configure the matching Convex cloud and site URLs, then rebuild.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  const authConfig = inspectPublicAuthConfig({
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL
  });
  const convex = useMemo(() => (authConfig.ok ? getConvexClient() : null), [authConfig.ok]);
  return (
    <ActiveThemeProvider initialTheme={activeThemeValue}>
      <QueryProvider>
        {convex ? (
          <ConvexBetterAuthProvider
            client={convex}
            authClient={authClient as unknown as AuthClient}
          >
            {children}
          </ConvexBetterAuthProvider>
        ) : (
          <MissingConfig error={authConfig.ok ? '' : authConfig.error} />
        )}
      </QueryProvider>
    </ActiveThemeProvider>
  );
}
