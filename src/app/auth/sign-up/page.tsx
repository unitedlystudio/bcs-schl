import type { Metadata } from 'next';
import SignUpViewPage from '@/features/auth/components/sign-up-view';

export const metadata: Metadata = {
  title: 'Invite Sign Up | Schly',
  description: 'Create a Schly account from a private invitation.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer'
};
export default function Page() {
  return <SignUpViewPage />;
}
