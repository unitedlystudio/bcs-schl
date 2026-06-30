import 'server-only';

import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

function readNormalizedEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function readEmailFromSessionClaims(sessionClaims: Record<string, unknown> | null | undefined) {
  if (!sessionClaims) {
    return '';
  }

  return (
    readNormalizedEmail(sessionClaims.email_address) ||
    readNormalizedEmail(sessionClaims.email) ||
    readNormalizedEmail(sessionClaims.primary_email_address)
  );
}

type TrustedAccessIdentity = {
  email?: string;
  orgId: string;
  orgPermissions: string[];
  orgRole: string;
  subject: string;
};

type ClerkOrganizationMembershipLike = {
  organization?: {
    id?: string | null;
  } | null;
  permissions?: string[] | null;
  role?: string | null;
};

function getRequiredEnv(name: 'CONVEX_DEPLOY_KEY' | 'NEXT_PUBLIC_CONVEX_URL') {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return name === 'NEXT_PUBLIC_CONVEX_URL' ? value.replace(/\/+$/, '') : value;
}

function normalizeMembership(membership: ClerkOrganizationMembershipLike | null | undefined) {
  return {
    orgId: membership?.organization?.id?.trim() ?? '',
    orgPermissions:
      membership?.permissions?.filter((value): value is string => typeof value === 'string') ?? [],
    orgRole: typeof membership?.role === 'string' ? membership.role : ''
  };
}

async function getTrustedIdentity(requestedOrgId?: string): Promise<TrustedAccessIdentity | null> {
  const session = await auth();
  const normalizedRequestedOrgId = requestedOrgId?.trim() ?? '';
  let email = readEmailFromSessionClaims(
    (session.sessionClaims ?? null) as Record<string, unknown> | null
  );
  let membershipFallback: ReturnType<typeof normalizeMembership> | null = null;
  let fallbackMembershipCount = 0;

  if (!session.userId) {
    return null;
  }

  if (
    !email ||
    !session.orgId ||
    (normalizedRequestedOrgId && session.orgId !== normalizedRequestedOrgId)
  ) {
    try {
      const client = await clerkClient();
      const [user, membershipsResponse] = await Promise.all([
        currentUser().catch(() => null),
        client.users.getOrganizationMembershipList({ limit: 100, userId: session.userId })
      ]);
      const memberships = membershipsResponse.data.map((membership) =>
        normalizeMembership({
          organization: { id: membership.organization?.id ?? null },
          permissions: membership.permissions ?? [],
          role: membership.role ?? ''
        })
      );

      email =
        email ||
        user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ||
        user?.emailAddresses?.[0]?.emailAddress?.trim().toLowerCase() ||
        '';
      fallbackMembershipCount = memberships.length;

      if (normalizedRequestedOrgId) {
        membershipFallback =
          memberships.find((membership) => membership.orgId === normalizedRequestedOrgId) ?? null;
      } else if (!session.orgId && memberships.length === 1) {
        membershipFallback = memberships[0] ?? null;
      }
    } catch (error) {
      console.warn('[dashboard-access] failed Clerk membership fallback lookup', error);
    }
  }

  const resolvedOrgId = session.orgId ?? membershipFallback?.orgId ?? '';
  const resolvedOrgRole = session.orgRole ?? membershipFallback?.orgRole ?? '';
  const resolvedOrgPermissions = session.orgPermissions?.length
    ? session.orgPermissions
    : (membershipFallback?.orgPermissions ?? []);

  if (!resolvedOrgId) {
    return null;
  }

  if (normalizedRequestedOrgId && resolvedOrgId !== normalizedRequestedOrgId) {
    console.warn('[dashboard-access] requested org mismatch', {
      requestedOrgId: normalizedRequestedOrgId,
      resolvedOrgId,
      sessionOrgId: session.orgId ?? null,
      hasMembershipFallback: Boolean(membershipFallback?.orgId),
      fallbackMembershipCount
    });
    return null;
  }

  return {
    email: email || undefined,
    orgId: resolvedOrgId,
    orgPermissions: resolvedOrgPermissions,
    orgRole: resolvedOrgRole,
    subject: session.userId
  };
}

function createTrustedConvexClient(identity: TrustedAccessIdentity) {
  const client = new ConvexHttpClient(
    getRequiredEnv('NEXT_PUBLIC_CONVEX_URL')
  ) as ConvexHttpClient & {
    setAdminAuth: (token: string, actingAsIdentity?: Record<string, unknown>) => void;
  };

  client.setAdminAuth(getRequiredEnv('CONVEX_DEPLOY_KEY'), {
    ...(identity.email ? { email: identity.email } : {}),
    orgId: identity.orgId,
    orgPermissions: identity.orgPermissions,
    orgRole: identity.orgRole,
    subject: identity.subject,
    tokenIdentifier: `trusted-next:${identity.subject}`
  });

  return client;
}

export async function getTrustedDashboardAccess(requestedOrgId?: string) {
  const identity = await getTrustedIdentity(requestedOrgId);

  if (!identity) {
    return null;
  }

  const client = createTrustedConvexClient(identity);
  return client.query(api.schoolOrganization.getCurrentAccess, { orgId: identity.orgId });
}

export async function claimTrustedDashboardInvite(requestedOrgId?: string) {
  const identity = await getTrustedIdentity(requestedOrgId);

  if (!identity?.email) {
    return null;
  }

  const client = createTrustedConvexClient(identity);
  return client.mutation(api.schoolOrganization.claimCurrentUserInvite, { orgId: identity.orgId });
}
