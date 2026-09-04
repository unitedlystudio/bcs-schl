import { describe, expect, it } from 'vitest';
import {
  digestInviteToken,
  generateInviteToken,
  isInviteToken,
  normalizeEmail,
  requireAbsoluteOrigin,
  safeDashboardPath
} from '../../convex/lib/authPolicy';

describe('authentication policy primitives', () => {
  it('normalizes email without provider-specific rewriting', () => {
    expect(normalizeEmail('  Don+school@Unitedly.co ')).toBe('don+school@unitedly.co');
    expect(normalizeEmail('not-an-email')).toBe('');
  });

  it('accepts only canonical HTTPS origins or localhost during development', () => {
    expect(requireAbsoluteOrigin('https://school.example', 'SITE_URL')).toBe(
      'https://school.example'
    );
    expect(requireAbsoluteOrigin('http://localhost:3000', 'SITE_URL')).toBe(
      'http://localhost:3000'
    );
    expect(() => requireAbsoluteOrigin('http://school.example', 'SITE_URL')).toThrow();
    expect(() => requireAbsoluteOrigin('https://school.example/path', 'SITE_URL')).toThrow();
  });

  it('generates 256-bit base64url invite tokens and keyed digests', async () => {
    const token = generateInviteToken();
    expect(isInviteToken(token)).toBe(true);
    expect(token).toHaveLength(43);
    const digest = await digestInviteToken(token, 'a'.repeat(32));
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toContain(token);
    expect(await digestInviteToken(token, 'b'.repeat(32))).not.toBe(digest);
  });

  it('accepts only relative dashboard redirects', () => {
    expect(safeDashboardPath('/dashboard/students')).toBe('/dashboard/students');
    expect(safeDashboardPath('/dashboard-evil')).toBe('/dashboard');
    expect(safeDashboardPath('//evil.example')).toBe('/dashboard');
    expect(safeDashboardPath('/%5cevil')).toBe('/dashboard');
    expect(safeDashboardPath('https://evil.example')).toBe('/dashboard');
  });
});
