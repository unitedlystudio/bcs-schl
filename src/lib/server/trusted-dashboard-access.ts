import 'server-only';

import { auth, currentUser } from '@clerk/nextjs/server';
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
  email: string;
  orgId: string;
  orgPermissions: string[];
  orgRole: string;
  subject: string;
};

function getRequiredEnv(name: 'CONVEX_DEPLOY_KEY' | 'NEXT_PUBLIC_CONVEX_URL') {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

async function getTrustedIdentity(): Promise<TrustedAccessIdentity | null> {
  const session = await auth();
  let email = readEmailFromSessionClaims(
    (session.sessionClaims ?? null) as Record<string, unknown> | null
  );

  if (!email) {
    try {
      const user = await currentUser();
      email =
        user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ??
        user?.emailAddresses?.[0]?.emailAddress?.trim().toLowerCase() ??
        '';
    } catch (error) {
      console.warn(
        'Falling back to Clerk session claims for trusted dashboard access email lookup.',
        error
      );
    }
  }

  if (!session.userId || !session.orgId || !email) {
    return null;
  }

  return {
    email,
    orgId: session.orgId,
    orgPermissions: session.orgPermissions ?? [],
    orgRole: session.orgRole ?? '',
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
    email: identity.email,
    orgId: identity.orgId,
    orgPermissions: identity.orgPermissions,
    orgRole: identity.orgRole,
    subject: identity.subject,
    tokenIdentifier: `trusted-next:${identity.subject}`
  });

  return client;
}

export async function getTrustedDashboardAccess() {
  const identity = await getTrustedIdentity();

  if (!identity) {
    return null;
  }

  const client = createTrustedConvexClient(identity);
  return client.query(api.schoolOrganization.getCurrentAccess, { orgId: identity.orgId });
}

export async function claimTrustedDashboardInvite() {
  const identity = await getTrustedIdentity();

  if (!identity) {
    return null;
  }

  const client = createTrustedConvexClient(identity);
  return client.mutation(api.schoolOrganization.claimCurrentUserInvite, { orgId: identity.orgId });
}
