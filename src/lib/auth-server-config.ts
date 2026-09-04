type PublicAuthEnvironment = Partial<
  Record<
    'NEXT_PUBLIC_CONVEX_URL' | 'NEXT_PUBLIC_CONVEX_SITE_URL' | 'NEXT_PUBLIC_SITE_URL' | 'SITE_URL',
    string
  >
>;

type PublicAuthConfigResult =
  | { ok: true; convexUrl: string; convexSiteUrl: string; siteUrl: string }
  | { ok: false; error: string };

const configurationError = (message: string): PublicAuthConfigResult => ({
  ok: false,
  error: `Authentication configuration error: ${message}`
});

export function inspectPublicAuthConfig(
  environment: PublicAuthEnvironment,
  nodeEnvironment = process.env.NODE_ENV
): PublicAuthConfigResult {
  const convexUrl = environment.NEXT_PUBLIC_CONVEX_URL?.trim();
  const convexSiteUrl = environment.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
  const siteUrl = environment.NEXT_PUBLIC_SITE_URL?.trim();
  const backendSiteUrl = environment.SITE_URL?.trim();
  if (!convexUrl || !convexSiteUrl || !siteUrl) {
    return configurationError(
      'NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_CONVEX_SITE_URL, and NEXT_PUBLIC_SITE_URL must all be configured.'
    );
  }
  if (convexUrl.endsWith('/') || convexSiteUrl.endsWith('/')) {
    return configurationError('Convex URLs must be configured without a trailing slash.');
  }

  let cloud: URL;
  let site: URL;
  let application: URL;
  try {
    cloud = new URL(convexUrl);
    site = new URL(convexSiteUrl);
    application = new URL(siteUrl);
  } catch {
    return configurationError('Convex URLs must be valid absolute URLs.');
  }

  const production = nodeEnvironment === 'production';
  const localHosts = new Set(['127.0.0.1', 'localhost']);
  if (application.origin !== siteUrl || siteUrl.endsWith('/')) {
    return configurationError(
      'NEXT_PUBLIC_SITE_URL must be an exact origin without a trailing slash.'
    );
  }
  if (backendSiteUrl !== undefined && backendSiteUrl !== siteUrl) {
    return configurationError(
      'NEXT_PUBLIC_SITE_URL and SITE_URL must be identical canonical origins.'
    );
  }
  const localApplication =
    !production && application.protocol === 'http:' && localHosts.has(application.hostname);
  if (production && application.protocol !== 'https:') {
    return configurationError('NEXT_PUBLIC_SITE_URL must use HTTPS in production.');
  }
  if (!production && application.protocol !== 'https:' && !localApplication) {
    return configurationError(
      'insecure NEXT_PUBLIC_SITE_URL is allowed only for localhost development.'
    );
  }
  const isLocalPair =
    !production &&
    cloud.protocol === 'http:' &&
    site.protocol === 'http:' &&
    localHosts.has(cloud.hostname) &&
    localHosts.has(site.hostname);
  if (isLocalPair) return { ok: true, convexUrl, convexSiteUrl, siteUrl };

  if (
    !cloud.hostname.endsWith('.convex.cloud') ||
    !site.hostname.endsWith('.convex.site') ||
    (production && (cloud.protocol !== 'https:' || site.protocol !== 'https:'))
  ) {
    return configurationError(
      'production auth URLs must use matching https://*.convex.cloud and https://*.convex.site hosts.'
    );
  }

  if (
    cloud.hostname.slice(0, -'.convex.cloud'.length) !==
    site.hostname.slice(0, -'.convex.site'.length)
  ) {
    return configurationError('Convex cloud and site URLs must target the same deployment.');
  }

  return { ok: true, convexUrl, convexSiteUrl, siteUrl };
}

export function requirePublicAuthConfig(
  environment: PublicAuthEnvironment = {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SITE_URL: process.env.SITE_URL
  },
  nodeEnvironment = process.env.NODE_ENV
) {
  if (!environment.SITE_URL?.trim()) {
    throw new Error(
      'Authentication configuration error: SITE_URL must be configured on the server.'
    );
  }
  const result = inspectPublicAuthConfig(environment, nodeEnvironment);
  if (!result.ok) throw new Error(result.error);
  return result;
}
