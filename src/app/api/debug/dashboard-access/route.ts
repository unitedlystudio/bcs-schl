import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const ORG_ID = 'org_33Slcbw2nxEhbVSbb5JslO1sNTV';

export async function GET() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim() ?? '';
  const deployKey = process.env.CONVEX_DEPLOY_KEY?.trim() ?? '';
  const deployment = process.env.CONVEX_DEPLOYMENT?.trim() ?? '';
  const clerkSecret = process.env.CLERK_SECRET_KEY?.trim() ?? '';

  const summary = {
    hasConvexUrl: Boolean(convexUrl),
    hasDeployKey: Boolean(deployKey),
    hasDeployment: Boolean(deployment),
    hasClerkSecret: Boolean(clerkSecret),
    convexUrlHost: convexUrl ? new URL(convexUrl).host : null,
    deployment,
    adminAuthAvailable: false,
    queryOk: false as boolean,
    queryError: null as string | null,
    roleTemplateCount: null as number | null,
    accessProfileCount: null as number | null
  };

  if (!convexUrl || !deployKey) {
    return NextResponse.json(summary);
  }

  try {
    const client = new ConvexHttpClient(convexUrl) as ConvexHttpClient & {
      setAdminAuth: (token: string, actingAsIdentity?: Record<string, unknown>) => void;
    };
    summary.adminAuthAvailable = typeof client.setAdminAuth === 'function';
    client.setAdminAuth(deployKey, {
      subject: 'debug_public_probe',
      email: 'debug@example.com',
      orgId: ORG_ID,
      orgRole: 'org:admin',
      orgPermissions: ['org:admin:manage'],
      tokenIdentifier: 'debug_public_probe'
    });

    const [roleTemplates, accessProfiles] = await Promise.all([
      client.query(api.schoolOrganization.listRoleTemplates, { orgId: ORG_ID }),
      client.query(api.schoolOrganization.listAccessProfiles, { orgId: ORG_ID })
    ]);

    summary.queryOk = true;
    summary.roleTemplateCount = roleTemplates.length;
    summary.accessProfileCount = accessProfiles.length;
  } catch (error) {
    summary.queryError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }

  return NextResponse.json(summary);
}
