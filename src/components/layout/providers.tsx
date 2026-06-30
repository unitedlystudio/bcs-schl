'use client';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useAuth } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import React, { useMemo } from 'react';
import { Icons } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { clerkRouteConfig } from '@/lib/clerk-routes';
import { getConvexClient } from '@/lib/convex';
import { ActiveThemeProvider } from '../themes/active-theme';
import QueryProvider from './query-provider';

function ConvexMissingConfigNotice() {
  return (
    <div className='flex min-h-screen items-center justify-center px-6'>
      <div className='w-full max-w-xl'>
        <Alert variant='destructive'>
          <Icons.alertCircle className='h-4 w-4' />
          <AlertTitle>Convex environment is missing</AlertTitle>
          <AlertDescription>
            <p>
              NEXT_PUBLIC_CONVEX_URL is not set in the deployed environment, so the dashboard cannot
              connect to Convex.
            </p>
            <p>
              Add the Convex frontend URL in Vercel project environment variables, then redeploy.
            </p>
          </AlertDescription>
        </Alert>
      </div>
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
  const { resolvedTheme } = useTheme();
  const convex = useMemo(() => getConvexClient(), []);

  return (
    <>
      <ActiveThemeProvider initialTheme={activeThemeValue}>
        <ClerkProvider
          signInUrl={clerkRouteConfig.signInUrl}
          signUpUrl={clerkRouteConfig.signUpUrl}
          signInFallbackRedirectUrl={clerkRouteConfig.signInFallbackRedirectUrl}
          signUpFallbackRedirectUrl={clerkRouteConfig.signUpFallbackRedirectUrl}
          signUpForceRedirectUrl={clerkRouteConfig.signUpForceRedirectUrl}
          appearance={{
            baseTheme: resolvedTheme === 'dark' ? dark : undefined,
            variables: {
              colorPrimary: 'var(--primary)',
              colorPrimaryForeground: 'var(--primary-foreground)',
              colorDanger: 'var(--destructive)',
              colorBackground: 'var(--card)',
              colorForeground: 'var(--foreground)',
              colorMuted: 'var(--muted)',
              colorMutedForeground: 'var(--muted-foreground)',
              colorInput: 'var(--input)',
              colorInputForeground: 'var(--foreground)',
              colorBorder: 'var(--border)',
              colorRing: 'var(--ring)',
              fontFamily: 'var(--font-sans)'
            }
          }}
        >
          {convex ? (
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
              <QueryProvider>{children}</QueryProvider>
            </ConvexProviderWithClerk>
          ) : (
            <QueryProvider>
              <ConvexMissingConfigNotice />
            </QueryProvider>
          )}
        </ClerkProvider>
      </ActiveThemeProvider>
    </>
  );
}
