import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { api, internal } from '../../convex/_generated/api';
import schema from '../../convex/schema';
import {
  normalizeSecretConfiguration,
  validateSecretConfigurationWrite
} from '../../convex/lib/accessSecretConfiguration';
import exportFixture from '../fixtures/school-migration-export.structural.json';

const read = (path: string) => readFileSync(path, 'utf8');
const finalOwnedTables = [
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
] as const;

type MigrationIsPublic = 'schoolOwnershipMigration' extends keyof typeof api ? true : false;
type MigrationIsInternal = 'schoolOwnershipMigration' extends keyof typeof internal ? true : false;
const migrationIsPublic: MigrationIsPublic = false;
const migrationIsInternal: MigrationIsInternal = false;

describe('school ownership finalization', () => {
  it('keeps the sanitized transition evidence without deployable migration artifacts', () => {
    expect(exportFixture.domainRowTotal).toBe(122);
    expect(exportFixture.allApplicationRowTotal).toBe(130);
    expect(Object.keys(exportFixture.nonemptyShapes)).toHaveLength(22);
    expect(JSON.stringify(exportFixture)).not.toMatch(/\b(?:user|org|orginv)_[A-Za-z0-9]+\b/);
    expect(existsSync('convex/schema.final.ts')).toBe(false);
    expect(existsSync('convex/schoolOwnershipMigration.ts')).toBe(false);
    expect(existsSync('tests/migrations/school-ownership-transition.test.ts')).toBe(false);
  });

  it('has no migration module in either generated deployed API surface', () => {
    expect(migrationIsPublic).toBe(false);
    expect(migrationIsInternal).toBe(false);
    expect(read('convex/_generated/api.d.ts')).not.toContain('schoolOwnershipMigration');
  });

  it('keeps final ownership and secret invariants', () => {
    expect(schema).toBeDefined();
    const source = read('convex/schema.ts');
    for (const legacyTable of [
      'schoolStaffAccessProfiles',
      'schoolDashboardRoles',
      'schoolStaffInvites'
    ]) {
      expect(source).not.toContain(`${legacyTable}: defineTable(`);
    }
    expect(source).not.toMatch(/\borgId\s*:/);
    expect(source).not.toMatch(/\bpassword\s*:/);
    expect(source).not.toContain("schoolId: v.optional(v.id('schools'))");
    expect(validateSecretConfigurationWrite({})).toEqual({});
    expect(
      validateSecretConfigurationWrite({
        secretManager: '1Password',
        secretReference: 'vault/item'
      })
    ).toEqual({ secretManager: '1Password', secretReference: 'vault/item' });
    expect(() => validateSecretConfigurationWrite({ secretManager: '1Password' })).toThrow(
      'SECRET_CONFIGURATION_PAIR_REQUIRED'
    );
    expect(normalizeSecretConfiguration({})).toEqual({
      secretConfigured: false,
      secretManager: null,
      secretReference: null
    });
  });

  it.each(finalOwnedTables)('%s requires schoolId in the final schema', (table) => {
    const source = read('convex/schema.ts');
    const section =
      source
        .split(new RegExp(`\\n  ${table}: defineTable\\(`))[1]
        ?.split(/\n  [a-zA-Z][a-zA-Z]+: defineTable\(/)[0] ?? '';
    expect(section).toContain("schoolId: v.id('schools')");
    expect(section).not.toContain("schoolId: v.optional(v.id('schools'))");
  });

  it('typechecks the final Convex source set', () => {
    expect(() =>
      execFileSync('bunx', ['tsc', '-p', 'convex/tsconfig.json', '--noEmit'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe'
      })
    ).not.toThrow();
  }, 30_000);
});
