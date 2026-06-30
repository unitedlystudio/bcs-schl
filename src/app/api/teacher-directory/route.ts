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

function compareLabels(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function fullNameFromParts(
  firstName?: string | null,
  lastName?: string | null,
  fallback?: string | null
) {
  const name = [firstName, lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

  return name || fallback?.trim() || 'Unnamed teacher';
}

function isTeacherRole(role: string) {
  return role.toLowerCase().includes('teacher');
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
    tokenIdentifier: `teacher-directory:${session.userId}`
  });

  const [membershipsResponse, teachers] = await Promise.all([
    clerk.organizations.getOrganizationMembershipList({ limit: 100, organizationId: orgId }),
    convex.query(api.teachers.list, {})
  ]);

  const localByEmail = new Map(
    teachers
      .filter((teacher) => teacher.email.trim())
      .map((teacher) => [teacher.email.trim().toLowerCase(), teacher])
  );

  const rows = membershipsResponse.data
    .map((membership) => {
      const user = membership.publicUserData;
      const email = user?.identifier?.trim() ?? '';
      const role = membership.role || '';

      if (!isTeacherRole(role)) {
        return null;
      }

      const localTeacher = email ? localByEmail.get(email.toLowerCase()) : undefined;
      const fullName = fullNameFromParts(user?.firstName, user?.lastName, email);

      return {
        id: localTeacher?.id ?? user?.userId ?? membership.id,
        localTeacherId: localTeacher?.id,
        fullName: localTeacher?.fullName || fullName,
        preferredName:
          localTeacher?.preferredName ||
          user?.firstName?.trim() ||
          fullName.split(' ')[0] ||
          fullName,
        role: localTeacher?.role || 'Teacher',
        status: localTeacher?.status || 'Active',
        academicYear: localTeacher?.academicYear ?? '',
        homeroomClass: localTeacher?.homeroomClass ?? '',
        email,
        phone: localTeacher?.phone ?? ''
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .toSorted((left, right) => compareLabels(left.fullName, right.fullName));

  return NextResponse.json({ rows });
}
