import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const ORG_ID = 'org_33Slcbw2nxEhbVSbb5JslO1sNTV';
const USER_ID = 'user_3FpxeDHFv1nu3FpMFVpaLz73OBd';

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
    queryErrorName: null as string | null,
    queryErrorStack: null as string[] | null,
    queryErrorKeys: null as string[] | null,
    queryErrorJson: null as Record<string, string> | null,
    roleTemplateCount: null as number | null,
    accessProfileCount: null as number | null,
    getCurrentAccessOk: false as boolean,
    getCurrentAccessNoEmailOk: false as boolean,
    getCurrentAccessResult: null as unknown,
    getCurrentAccessNoEmailResult: null as unknown,
    getCurrentAccessError: null as string | null,
    getCurrentAccessNoEmailError: null as string | null,
    rawFetchStatus: null as number | null,
    rawFetchText: null as string | null,
    rawFetchHeaders: null as Record<string, string> | null
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
    if (error && typeof error === 'object') {
      summary.queryErrorName = (error as { name?: string }).name ?? null;
      summary.queryErrorKeys = Object.keys(error);
      summary.queryErrorJson = Object.fromEntries(
        Object.entries(error).map(([key, value]) => [
          key,
          typeof value === 'string' ? value : JSON.stringify(value)
        ])
      );
    }
    if (error instanceof Error) {
      summary.queryErrorStack = error.stack?.split('\n').slice(0, 6) ?? null;
    }
  }

  try {
    const client = new ConvexHttpClient(convexUrl) as ConvexHttpClient & {
      setAdminAuth: (token: string, actingAsIdentity?: Record<string, unknown>) => void;
    };
    client.setAdminAuth(deployKey, {
      subject: USER_ID,
      email: 'don@donhphoto.com',
      orgId: ORG_ID,
      orgRole: 'org:member',
      orgPermissions: [],
      tokenIdentifier: USER_ID
    });
    summary.getCurrentAccessResult = await client.query(api.schoolOrganization.getCurrentAccess, {
      orgId: ORG_ID
    });
    summary.getCurrentAccessOk = true;
  } catch (error) {
    summary.getCurrentAccessError =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }

  try {
    const client = new ConvexHttpClient(convexUrl) as ConvexHttpClient & {
      setAdminAuth: (token: string, actingAsIdentity?: Record<string, unknown>) => void;
    };
    client.setAdminAuth(deployKey, {
      subject: USER_ID,
      orgId: ORG_ID,
      orgRole: 'org:member',
      orgPermissions: [],
      tokenIdentifier: USER_ID
    });
    summary.getCurrentAccessNoEmailResult = await client.query(
      api.schoolOrganization.getCurrentAccess,
      {
        orgId: ORG_ID
      }
    );
    summary.getCurrentAccessNoEmailOk = true;
  } catch (error) {
    summary.getCurrentAccessNoEmailError =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }

  try {
    const actingAsIdentity = {
      subject: USER_ID,
      email: 'don@donhphoto.com',
      orgId: ORG_ID,
      orgRole: 'org:member',
      orgPermissions: [],
      tokenIdentifier: USER_ID
    };
    const encodedIdentity = btoa(JSON.stringify(actingAsIdentity));
    const response = await fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Convex ${deployKey}:${encodedIdentity}`
      },
      body: JSON.stringify({
        path: 'schoolOrganization:getCurrentAccess',
        format: 'convex_encoded_json',
        args: [{ orgId: ORG_ID }]
      })
    });
    summary.rawFetchStatus = response.status;
    summary.rawFetchText = (await response.text()).slice(0, 1000);
    summary.rawFetchHeaders = Object.fromEntries(response.headers.entries());
  } catch (error) {
    summary.rawFetchText =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }

  return NextResponse.json(summary);
}
