import { SignUp as ClerkSignUpForm } from '@clerk/nextjs';

export default function SignUpViewPage() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-muted/20 px-4 py-10'>
      <ClerkSignUpForm />
    </div>
  );
}
