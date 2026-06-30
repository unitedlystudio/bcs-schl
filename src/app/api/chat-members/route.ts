import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';

import { api } from '../../../../convex/_generated/api';

function getRequiredEnv(name: 'CONVEX_DEPLOY_KEY' | 'NEXT_PUBLIC_CONVEX_URL') {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return name === 'NEXT_PUBLIC_CONVEX_URL' ? value.replace(/\/+$/, '') : value;
}

function normalizeRole(role: string) {
  return role
    .replace(/^org:/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function fullName(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
  const name = [firstName, lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

  return name || fallback?.trim() || 'Unnamed staff member';
}

async function canAccessRequestedOrg(userId: string, requestedOrgId: string) {
  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({ limit: 100, userId });
  return memberships.data.some((membership) => membership.organization?.id === requestedOrgId);
}

export async function GET(request: Request) {
  const session = await auth();
  const requestedOrgId = new URL(request.url).searchParams.get('orgId')?.trim() ?? '';
  const orgId = requestedOrgId || session.orgId || '';

  if (!session.userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (requestedOrgId && session.orgId !== requestedOrgId) {
    const hasMembership = await canAccessRequestedOrg(session.userId, requestedOrgId);

    if (!hasMembership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const [clerk, convexUrl, deployKey] = await Promise.all([
    clerkClient(),
    Promise.resolve(getRequiredEnv('NEXT_PUBLIC_CONVEX_URL')),
    Promise.resolve(getRequiredEnv('CONVEX_DEPLOY_KEY'))
  ]);

  const convex = new ConvexHttpClient(convexUrl) as ConvexHttpClient & {
    setAdminAuth: (token: string, actingAsIdentity?: Record<string, unknown>) => void;
  };

  convex.setAdminAuth(deployKey, {
    orgId,
    orgPermissions: session.orgPermissions ?? [],
    orgRole: session.orgRole ?? '',
    subject: session.userId,
    tokenIdentifier: `chat-members:${session.userId}`
  });

  const [membershipsResponse, accessProfiles, staffInvites] = await Promise.all([
    clerk.organizations.getOrganizationMembershipList({ limit: 100, organizationId: orgId }),
    convex.query(api.schoolOrganization.listAccessProfiles, { orgId }),
    convex.query(api.schoolOrganization.listStaffInvites, { orgId })
  ]);

  const profileByUserId = new Map(accessProfiles.map((profile) => [profile.userId, profile]));
  const inviteByEmail = new Map(
    staffInvites.map((invite) => [invite.email.trim().toLowerCase(), invite])
  );

  const members = membershipsResponse.data
    .map((membership) => {
      const user = membership.publicUserData;
      const email = user?.identifier?.trim().toLowerCase() ?? '';
      const profile = user?.userId ? profileByUserId.get(user.userId) : undefined;
      const invite = email ? inviteByEmail.get(email) : undefined;
      const role =
        profile?.dashboardRole || invite?.dashboardRole || normalizeRole(membership.role);

      return {
        userId: user?.userId ?? '',
        email,
        name: fullName(user?.firstName, user?.lastName, email),
        role: role || 'Staff',
        status: 'Active'
      };
    })
    .filter((member) => member.userId && member.userId !== session.userId)
    .toSorted((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    );

  return NextResponse.json({ members });
}
