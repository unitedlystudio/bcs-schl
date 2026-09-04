'use client';

import { useApplicationAccess } from '@/components/layout/application-access-gate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfileViewPage() {
  const { user } = useApplicationAccess();
  return (
    <div className='w-full p-4'>
      <Card className='max-w-xl'>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your Better Auth identity and school access are managed separately.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-2'>
          <p>
            <span className='font-medium'>Name:</span> {user?.name ?? 'Not set'}
          </p>
          <p>
            <span className='font-medium'>Email:</span> {user?.email}
          </p>
          <p className='text-sm text-muted-foreground'>
            Password reset is unavailable until verified email delivery is configured.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
