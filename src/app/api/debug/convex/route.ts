import { NextResponse } from 'next/server';

function normalizeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export async function GET() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim() ?? '';
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim() ?? '';
  const deployment = process.env.CONVEX_DEPLOYMENT?.trim() ?? '';

  return NextResponse.json({
    convexHost: normalizeHost(convexUrl),
    convexSiteHost: normalizeHost(convexSiteUrl),
    convexDeployment: deployment || null,
    hasConvexDeployKey: Boolean(process.env.CONVEX_DEPLOY_KEY?.trim())
  });
}
