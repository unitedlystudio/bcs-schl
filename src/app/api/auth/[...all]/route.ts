import { getAuthServer } from '@/lib/auth-server';
import { hasTrustedMutationOrigin, isAllowedAuthRequest } from '@/lib/auth-proxy-policy';
import { requirePublicAuthConfig } from '@/lib/auth-server-config';

export const dynamic = 'force-dynamic';

async function handle(request: Request): Promise<Response> {
  const authServer = getAuthServer();
  const { pathname } = new URL(request.url);
  if (!isAllowedAuthRequest(pathname, request.method)) return new Response(null, { status: 404 });
  if (
    request.method === 'POST' &&
    !hasTrustedMutationOrigin(request, requirePublicAuthConfig().siteUrl)
  )
    return new Response(null, { status: 403 });
  const handler = request.method === 'GET' ? authServer.handler.GET : authServer.handler.POST;
  const response = await handler(request);
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store');
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export const GET = handle;
export const POST = handle;
