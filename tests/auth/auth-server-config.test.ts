import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspectPublicAuthConfig, requirePublicAuthConfig } from '../../src/lib/auth-server-config';

const valid = {
  NEXT_PUBLIC_CONVEX_URL: 'https://steady-otter-123.convex.cloud',
  NEXT_PUBLIC_CONVEX_SITE_URL: 'https://steady-otter-123.convex.site',
  NEXT_PUBLIC_SITE_URL: 'https://school.example',
  SITE_URL: 'https://school.example'
};

describe('public auth configuration', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('reports missing URL pairs without supplying fallback URLs', () => {
    expect(inspectPublicAuthConfig({}, 'production')).toEqual({
      ok: false,
      error:
        'Authentication configuration error: NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_CONVEX_SITE_URL, and NEXT_PUBLIC_SITE_URL must all be configured.'
    });
  });

  it('rejects local URLs in production', () => {
    const result = inspectPublicAuthConfig(
      {
        NEXT_PUBLIC_CONVEX_URL: 'http://127.0.0.1:3210',
        NEXT_PUBLIC_CONVEX_SITE_URL: 'http://127.0.0.1:3211',
        NEXT_PUBLIC_SITE_URL: 'https://school.example',
        SITE_URL: 'https://school.example'
      },
      'production'
    );
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toContain('must use matching https://*.convex.cloud');
  });

  it('accepts a complete local pair outside production', () => {
    expect(
      inspectPublicAuthConfig(
        {
          NEXT_PUBLIC_CONVEX_URL: 'http://127.0.0.1:3210',
          NEXT_PUBLIC_CONVEX_SITE_URL: 'http://127.0.0.1:3211',
          NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
          SITE_URL: 'http://localhost:3000'
        },
        'development'
      )
    ).toEqual({
      ok: true,
      convexUrl: 'http://127.0.0.1:3210',
      convexSiteUrl: 'http://127.0.0.1:3211',
      siteUrl: 'http://localhost:3000'
    });
  });

  it('rejects mismatched Convex deployments', () => {
    const result = inspectPublicAuthConfig(
      { ...valid, NEXT_PUBLIC_CONVEX_SITE_URL: 'https://different-otter-456.convex.site' },
      'production'
    );
    expect(result).toEqual({
      ok: false,
      error:
        'Authentication configuration error: Convex cloud and site URLs must target the same deployment.'
    });
  });

  it('accepts a valid matching production pair', () => {
    expect(inspectPublicAuthConfig(valid, 'production')).toEqual({
      ok: true,
      convexUrl: valid.NEXT_PUBLIC_CONVEX_URL,
      convexSiteUrl: valid.NEXT_PUBLIC_CONVEX_SITE_URL,
      siteUrl: valid.NEXT_PUBLIC_SITE_URL
    });
  });

  it('fails closed with an explicit configuration error at runtime', () => {
    expect(() => requirePublicAuthConfig({}, 'production')).toThrowError(
      'Authentication configuration error: SITE_URL must be configured on the server.'
    );
  });

  it('rejects a frontend/backend canonical origin mismatch', () => {
    expect(
      inspectPublicAuthConfig({ ...valid, SITE_URL: 'https://other.example' }, 'production')
    ).toEqual({
      ok: false,
      error:
        'Authentication configuration error: NEXT_PUBLIC_SITE_URL and SITE_URL must be identical canonical origins.'
    });
  });

  it('rejects non-origin, trailing slash, and insecure production app URLs', () => {
    for (const siteUrl of [
      'https://school.example/',
      'https://school.example/path',
      'http://school.example'
    ]) {
      expect(
        inspectPublicAuthConfig({ ...valid, NEXT_PUBLIC_SITE_URL: siteUrl }, 'production').ok
      ).toBe(false);
    }
  });
});
