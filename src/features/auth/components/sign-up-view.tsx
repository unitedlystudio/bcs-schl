import Link from 'next/link';
import { SignUp as ClerkSignUpForm } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { clerkRouteConfig } from '@/lib/clerk-routes';

export default function SignUpViewPage({ hasInvitationTicket }: { hasInvitationTicket: boolean }) {
  return (
    <div className='flex min-h-screen items-center justify-center bg-muted/20 px-4 py-10'>
      {hasInvitationTicket ? (
        <ClerkSignUpForm
          signInUrl={clerkRouteConfig.signInUrl}
          fallbackRedirectUrl={clerkRouteConfig.signUpFallbackRedirectUrl}
          forceRedirectUrl={clerkRouteConfig.signUpForceRedirectUrl}
        />
      ) : (
        <Card className='w-full max-w-lg'>
          <CardHeader className='space-y-4'>
            <div className='flex size-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
              S
            </div>
            <div className='space-y-2'>
              <CardTitle>Schly is closed and invite-only</CardTitle>
              <CardDescription>
                New accounts can only be created from a school invitation. Ask a school owner or
                admin to send you an invite, then open the link from your email.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className='flex flex-col gap-3'>
            <Button asChild>
              <Link href='/auth/sign-in'>I already have an account</Link>
            </Button>
            <Button asChild variant='outline'>
              <Link href='/'>Back to Schly</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
