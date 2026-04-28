import { Metadata } from 'next';
import SignUpViewPage from '@/features/auth/components/sign-up-view';

export const metadata: Metadata = {
  title: 'Sign Up | Schly',
  description: 'Create your Schly account.'
};

export default function Page() {
  return <SignUpViewPage />;
}
