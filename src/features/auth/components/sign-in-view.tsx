'use client';

import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '../../../../convex/_generated/api';
import {
  captureInviteToken,
  clearInviteToken,
  getInviteToken,
  isCompletedInviteClaim
} from '@/lib/invite-token-memory';

export default function SignInViewPage() {
  const router = useRouter();
  const claim = useMutation(api.invites.claimCurrent);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => {
    captureInviteToken();
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      setPending(false);
      setError('Email or password is incorrect.');
      return;
    }
    const token = getInviteToken();
    if (token) {
      try {
        const claimed = await claim({ token });
        if (!isCompletedInviteClaim(claimed.status)) throw new Error('Invite claim incomplete');
        clearInviteToken();
      } catch {
        setPending(false);
        setError(
          'Signed in, but school access could not be claimed. Retry to claim the invitation.'
        );
        return;
      }
    }
    setPending(false);
    router.replace('/dashboard');
    router.refresh();
  }
  return (
    <div className='grid min-h-screen place-items-center p-6'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Sign in to Schly</CardTitle>
          <CardDescription>Use your school account email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className='space-y-4'>
            <div>
              <label htmlFor='email' className='text-sm font-medium'>
                Email
              </label>
              <Input
                id='email'
                type='email'
                autoComplete='email'
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor='password' className='text-sm font-medium'>
                Password
              </label>
              <Input
                id='password'
                type='password'
                autoComplete='current-password'
                minLength={12}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? (
              <p role='alert' className='text-sm text-destructive'>
                {error}
              </p>
            ) : null}
            <Button type='submit' className='w-full' isLoading={pending}>
              Sign in
            </Button>
            <p className='text-center text-sm text-muted-foreground'>
              New accounts require a private invitation link.{' '}
              <Link href='/auth/sign-up' className='underline'>
                Learn more
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
