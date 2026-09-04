import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const retiredDemoPaths = [
  'src/app/api/products',
  'src/app/api/users',
  'src/app/dashboard/product',
  'src/app/dashboard/users',
  'src/features/products',
  'src/features/users',
  'src/constants/mock-api-users.ts'
] as const;

describe('retired generic CRUD demos', () => {
  it.each(retiredDemoPaths)('does not ship %s', (path) => {
    expect(existsSync(path)).toBe(false);
  });

  it('removes product CRUD residue while preserving the shared chart delay helper', () => {
    const mockApi = readFileSync('src/constants/mock-api.ts', 'utf8');
    expect(mockApi).toContain('export const delay');
    expect(mockApi).not.toMatch(/Product|fakeProducts/);
    expect(readFileSync('src/config/infoconfig.ts', 'utf8')).not.toContain('productInfoContent');
    expect(readFileSync('docs/forms.md', 'utf8')).not.toMatch(
      /src\/(features\/products|app\/api\/products)/
    );
  });

  it('preserves both management report entry points', () => {
    expect(existsSync('public/schly-management.html')).toBe(true);
    expect(readFileSync('src/app/schly-management/page.tsx', 'utf8')).toContain(
      "permanentRedirect('/schly-management.html')"
    );
  });
});
