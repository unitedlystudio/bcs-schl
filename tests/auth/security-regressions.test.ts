import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  captureInviteToken,
  getInviteToken,
  retryInviteClaim
} from '../../src/lib/invite-token-memory';

const read = (path: string) => readFileSync(path, 'utf8');

const readWriteDomains = [
  'students',
  'teachers',
  'admissions',
  'attendance',
  'operations',
  'staffing',
  'conversations',
  'inbox'
] as const;

describe('hostile authorization regressions', () => {
  it('retains memory-only invites across a transient claim failure and clears on retry success', async () => {
    const history = { replaceState: () => undefined };
    const browserWindow = {
      location: { href: 'https://school.example/auth/sign-up?invite=secret-token' },
      history
    } as unknown as Window & typeof globalThis;
    vi.stubGlobal('window', browserWindow);

    expect(captureInviteToken()).toBe('secret-token');
    await expect(
      retryInviteClaim('secret-token', async () => {
        throw new Error('temporary outage');
      })
    ).rejects.toThrow('temporary outage');
    expect(getInviteToken()).toBe('secret-token');

    const claim = vi.fn(async () => ({ status: 'accepted' }));
    await expect(retryInviteClaim('secret-token', claim)).resolves.toBe(true);
    expect(claim).toHaveBeenCalledOnce();
    expect(getInviteToken()).toBeNull();

    const memory = read('src/lib/invite-token-memory.ts');
    expect(memory).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie|console\./i);
    const signUp = read('src/features/auth/components/sign-up-view.tsx');
    expect(signUp).toContain("accountCreated ? 'Retry invitation claim' : 'Create account'");
    expect(signUp).toContain('if (accountCreated)');
    expect(signUp).toContain('await retryClaim()');
    expect(read('src/features/auth/components/sign-in-view.tsx')).toContain('claim({ token })');
    expect(read('src/components/layout/application-access-gate.tsx')).toContain('claim({ token })');
  });
  it.each(readWriteDomains)(
    '%s uses read permission for queries and write for mutations',
    (domain) => {
      const source = read(`convex/${domain}.ts`);
      const exports = source.split(/(?=export const )/).slice(1);
      const queries = exports.filter((section) => section.match(/^export const \w+ = query\(/));
      const mutations = exports.filter((section) =>
        section.match(/^export const \w+ = mutation\(/)
      );
      expect(queries.length).toBeGreaterThan(0);
      expect(
        queries.every((section) =>
          section.includes(
            `org:${domain === 'conversations' ? 'chat' : domain === 'inbox' ? 'notifications' : domain}:read`
          )
        )
      ).toBe(true);
      expect(
        mutations.every((section) =>
          section.includes(
            `org:${domain === 'conversations' ? 'chat' : domain === 'inbox' ? 'notifications' : domain}:write`
          )
        )
      ).toBe(true);
    }
  );

  it('never stores or returns platform passwords and has no reveal API', () => {
    expect(read('convex/schema.final.ts')).not.toMatch(/accessRecords:[\s\S]*?password:/);
    expect(read('convex/schema.ts')).toMatch(/password: v\.optional\(v\.string\(\)\)/);
    expect(read('convex/schoolOwnershipMigration.ts')).toMatch(/password: undefined/);
    expect(read('convex/access.ts')).not.toMatch(/password|reveal/i);
    expect(read('convex/access.ts')).toMatch(/normalizeSecretConfiguration/);
    expect(read('convex/lib/accessSecretConfiguration.ts')).toMatch(
      /secretManager[\s\S]*secretReference/
    );
    expect(read('src/features/access/api/types.ts')).toMatch(/secretConfigured: boolean/);
    expect(read('src/features/access/components/access-table/columns.tsx')).toContain(
      'No reference configured'
    );
  });

  it('enforces safeguarding permission on every concerns surface', () => {
    const source = read('convex/concerns.ts');
    expect(source).toContain('org:safeguarding:manage');
    for (const name of [
      'list',
      'summary',
      'recentForStudent',
      'getById',
      'create',
      'update',
      'addUpdate'
    ]) {
      expect(source).toMatch(new RegExp(`export const ${name} =[\\s\\S]*?enforceSafeguarding`));
    }
  });

  it('keeps transitional domain ownership fields scoped while identity tables stay strict', () => {
    const schema = read('convex/schema.ts');
    const tables = [
      'conversations',
      'messages',
      'inboxItems',
      'accessRecords',
      'students',
      'teachers',
      'concernCases',
      'concernCaseUpdates',
      'financeFamilyAccounts',
      'studentBillingProfiles',
      'financeCharges',
      'financePayments',
      'financeReminderLogs',
      'financePaymentApplications',
      'admissionsEnquiries',
      'attendanceSessions',
      'attendanceRecords',
      'operationsTimeSlots',
      'classTimetableEntries',
      'operationsOverrides',
      'staffLeaveRequests',
      'staffCoverAssignments'
    ];
    for (const table of tables) {
      const section =
        schema
          .split(new RegExp(`\\n  ${table}: defineTable\\(`))[1]
          ?.split(/\n  [a-zA-Z][a-zA-Z]+: defineTable\(/)[0] ?? '';
      expect(section, table).toContain("schoolId: v.optional(v.id('schools'))");
      expect(section, table).toMatch(/\.index\('by_school/);
    }
    for (const table of ['appUsers', 'invites']) {
      const section =
        schema
          .split(new RegExp(`\\n  ${table}: defineTable\\(`))[1]
          ?.split(/\n  [a-zA-Z][a-zA-Z]+: defineTable\(/)[0] ?? '';
      expect(section, table).toContain("schoolId: v.id('schools')");
    }
  });
});
