'use client';

import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../../convex/_generated/api';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { captureInviteToken, retryInviteClaim } from '@/lib/invite-token-memory';

export default function SignUpViewPage() {
  const router = useRouter();
  const claim = useMutation(api.invites.claimCurrent);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  useEffect(() => {
    setToken(captureInviteToken());
    setReady(true);
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (accountCreated) {
      await retryClaim();
      return;
    }
    setPending(true);
    setError('');
    const result = await authClient.signUp.email({
      email,
      password,
      name,
      fetchOptions: { headers: token ? { 'X-Schly-Invite-Token': token } : {} }
    });
    if (result.error) {
      setPending(false);
      setError('Account creation is not available for these details.');
      return;
    }
    setAccountCreated(true);
    if (token) {
      try {
        if (!(await retryInviteClaim(token, claim))) throw new Error('Invite claim incomplete');
        setToken(null);
      } catch {
        setPending(false);
        setError(
          'Your account was created, but school access could not be claimed. Retry or sign in with the same email.'
        );
        return;
      }
    }
    setPending(false);
    router.replace('/dashboard');
    router.refresh();
  }
  async function retryClaim() {
    if (!token) return;
    setPending(true);
    setError('');
    try {
      if (!(await retryInviteClaim(token, claim))) throw new Error('Invite claim incomplete');
      setToken(null);
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('School access could not be claimed yet. Retry this invitation claim.');
    } finally {
      setPending(false);
    }
  }
  if (!ready) return null;
  return (
    <div className='grid min-h-screen place-items-center p-6'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Create your Schly account</CardTitle>
          <CardDescription>
            {token
              ? 'Your invitation will be checked against this email.'
              : 'A private invitation is required. The configured initial administrator may complete first-time setup here.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className='space-y-4'>
            <div>
              <label htmlFor='name' className='text-sm font-medium'>
                Name
              </label>
              <Input
                id='name'
                autoComplete='name'
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
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
              <label htmlFor='new-password' className='text-sm font-medium'>
                Password
              </label>
              <Input
                id='new-password'
                type='password'
                autoComplete='new-password'
                minLength={12}
                maxLength={128}
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
              {accountCreated ? 'Retry invitation claim' : 'Create account'}
            </Button>
            {token ? (
              <p className='text-center text-sm text-muted-foreground'>
                Already have an account?{' '}
                <Link href='/auth/sign-in' className='underline'>
                  Sign in and claim this invitation
                </Link>
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
