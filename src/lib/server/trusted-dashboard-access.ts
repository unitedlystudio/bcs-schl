import 'server-only';

import { auth, currentUser } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

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
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ??
    user?.emailAddresses?.[0]?.emailAddress?.trim().toLowerCase() ??
    '';

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
