import { SignIn as ClerkSignInForm } from '@clerk/nextjs';

export default function SignInViewPage() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-muted/20 px-4 py-10'>
      <ClerkSignInForm />
    </div>
  );
}
