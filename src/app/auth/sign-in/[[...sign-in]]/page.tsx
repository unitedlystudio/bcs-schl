import { Metadata } from 'next';
import SignInViewPage from '@/features/auth/components/sign-in-view';

export const metadata: Metadata = {
  title: 'Sign In | Schly',
  description: 'Sign in to Schly.'
};

export default function Page() {
  return <SignInViewPage />;
}
