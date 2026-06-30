import { SignIn as ClerkSignInForm } from '@clerk/nextjs';
import { clerkRouteConfig } from '@/lib/clerk-routes';

export default function SignInViewPage() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-muted/20 px-4 py-10'>
      <ClerkSignInForm
        signUpUrl={clerkRouteConfig.signUpUrl}
        fallbackRedirectUrl={clerkRouteConfig.signInFallbackRedirectUrl}
      />
    </div>
  );
}
