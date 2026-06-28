import { Metadata } from 'next';
import SignUpViewPage from '@/features/auth/components/sign-up-view';

export const metadata: Metadata = {
  title: 'Sign Up | Schly',
  description: 'Create your Schly account from a school invitation.'
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  const ticket = searchParams.__clerk_ticket;
  const hasInvitationTicket = typeof ticket === 'string' && ticket.length > 0;

  return <SignUpViewPage hasInvitationTicket={hasInvitationTicket} />;
}
