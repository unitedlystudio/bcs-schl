'use client';

import { useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function SchoolOrganizationShell() {
  const invites = useQuery(api.invites.list);
  const createInvite = useAction(api.invites.create);
  const rotateInvite = useAction(api.invites.rotate);
  const revokeInvite = useMutation(api.invites.revoke);
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [revealedUrl, setRevealedUrl] = useState<string | null>(null);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setRevealedUrl(null);
    try {
      const result = await createInvite({ email, roleKey: 'staff' });
      setRevealedUrl(result.url);
      setEmail('');
    } catch {
      toast.error('Unable to create invitation link.');
    } finally {
      setPending(false);
    }
  }
  async function copy() {
    if (!revealedUrl) return;
    await navigator.clipboard.writeText(revealedUrl);
    toast.success('Invitation link copied.');
    setRevealedUrl(null);
  }
  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Create invitation link</CardTitle>
          <CardDescription>
            The link is shown once and no email is sent. It expires after seven days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className='flex gap-2' onSubmit={create}>
            <Input
              aria-label='Invite email'
              type='email'
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder='staff@example.com'
            />
            <Button type='submit' isLoading={pending}>
              Create link
            </Button>
          </form>
          {revealedUrl ? (
            <div className='mt-4 rounded-md border p-3'>
              <p className='break-all font-mono text-xs'>{revealedUrl}</p>
              <Button className='mt-2' onClick={copy}>
                Copy and hide
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            Rotating reveals a new link once and invalidates the old one immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {invites?.map((invite) => (
            <div
              key={invite.id}
              className='flex flex-wrap items-center justify-between gap-3 rounded-md border p-3'
            >
              <div>
                <p className='font-medium'>{invite.email}</p>
                <p className='text-xs text-muted-foreground'>
                  {invite.role} · {invite.status}
                </p>
              </div>
              <div className='flex gap-2'>
                {invite.status === 'pending' ? (
                  <>
                    <Button
                      variant='outline'
                      onClick={async () => {
                        const result = await rotateInvite({ inviteId: invite.id as Id<'invites'> });
                        setRevealedUrl(result.url);
                      }}
                    >
                      Rotate link
                    </Button>
                    <Button
                      variant='destructive'
                      onClick={() => void revokeInvite({ inviteId: invite.id as Id<'invites'> })}
                    >
                      Revoke
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          )) ?? <p className='text-sm text-muted-foreground'>Loading…</p>}
        </CardContent>
      </Card>
    </div>
  );
}
