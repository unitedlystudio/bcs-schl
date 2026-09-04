import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api, internal } from '../../convex/_generated/api';
import * as generatedServer from '../../convex/_generated/server';
import * as schoolOwnershipMigration from '../../convex/schoolOwnershipMigration';
import schema from '../../convex/schema';
import finalSchema from '../../convex/schema.final';
import {
  normalizeSecretConfiguration,
  validateSecretConfigurationWrite
} from '../../convex/lib/accessSecretConfiguration';
import exportFixture from '../fixtures/school-migration-export.structural.json';

const modules = {
  '../../convex/_generated/server.ts': async () => generatedServer,
  '../../convex/schoolOwnershipMigration.ts': async () => schoolOwnershipMigration
};

type MigrationIsPublic = 'schoolOwnershipMigration' extends keyof typeof api ? true : false;
type MigrationIsInternal = 'schoolOwnershipMigration' extends keyof typeof internal ? true : false;

const migrationIsPublic: MigrationIsPublic = false;
const migrationIsInternal: MigrationIsInternal = true;

function setup() {
  return convexTest(schema, modules);
}

describe('school ownership transition', () => {
  it('pins the exact sanitized export inventory and every nonempty table shape', () => {
    expect(exportFixture.domainRowTotal).toBe(122);
    expect(exportFixture.allApplicationRowTotal).toBe(130);
    expect(exportFixture.counts).toMatchObject({
      schoolStaffAccessProfiles: 5,
      schoolDashboardRoles: 1,
      schoolStaffInvites: 2
    });
    expect(Object.keys(exportFixture.nonemptyShapes)).toHaveLength(22);
    expect(Object.keys(exportFixture.representativeRows).toSorted()).toEqual(
      Object.keys(exportFixture.nonemptyShapes).toSorted()
    );
    expect(exportFixture.nonemptyShapes.conversations).toContain('orgId');
    expect(exportFixture.nonemptyShapes.accessRecords).toContain('password');
    expect(exportFixture.nonemptyShapes.accessRecords).not.toContain('secretManager');
    expect(exportFixture.nonemptyShapes.accessRecords).not.toContain('secretReference');
    expect(exportFixture.fieldOccurrences).toEqual({
      conversations: { orgId: 3 },
      accessRecords: { password: 14 },
      schoolStaffAccessProfiles: { orgId: 5, userId: 5, updatedByUserId: 5 },
      schoolDashboardRoles: { orgId: 1, updatedByUserId: 1 },
      schoolStaffInvites: {
        orgId: 2,
        email: 2,
        normalizedEmail: 2,
        clerkInvitationId: 2,
        claimedByUserId: 2,
        invitedByUserId: 2
      }
    });
  });

  it('contains only synthetic example emails and identity or invitation identifiers', () => {
    const fixtureText = JSON.stringify(exportFixture);
    const emails = fixtureText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
    expect(emails.length).toBeGreaterThan(0);
    expect(emails.every((email) => email.toLowerCase().endsWith('@example.com'))).toBe(true);
    expect(fixtureText).not.toMatch(/\b(?:user|org|orginv)_[A-Za-z0-9]+\b/);
    expect(fixtureText).not.toContain('local-dev-bypass');
  });

  it('rejects incomplete domain inventory before canonical school creation', async () => {
    const t = setup();
    await expect(t.mutation(internal.schoolOwnershipMigration.migrate, {})).rejects.toThrow(
      'DOMAIN_INVENTORY_MISMATCH'
    );
    expect(await t.run((ctx) => ctx.db.query('schools').collect())).toEqual([]);
  });

  it('keeps every preflight read and inventory assertion before the first write', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../../convex/schoolOwnershipMigration.ts', import.meta.url), 'utf8')
    );
    const migrateSource = source.split('export const migrate =')[1] ?? '';
    const firstWrite = Math.min(
      ...['ctx.db.insert(', 'ctx.db.patch(', 'ctx.db.delete(']
        .map((token) => migrateSource.indexOf(token))
        .filter((index) => index >= 0)
    );
    for (const requiredBeforeWrite of [
      'schoolState(ctx)',
      'loadRows(ctx)',
      'loadLegacyAuthRows(ctx)',
      'assertExpectedDomainInventory(rows)',
      'assertExpectedLegacyAuthInventory(legacyAuthRows)',
      'inspect(rows,'
    ]) {
      expect(migrateSource.indexOf(requiredBeforeWrite), requiredBeforeWrite).toBeLessThan(
        firstWrite
      );
    }
    expect(migrateSource).toContain('after.legacyFields.conversationsOrgId !== 0');
    expect(migrateSource).toContain('after.legacyFields.accessRecordsPassword !== 0');
  });

  it('pins every nonempty exported structural row shape to a transition validator', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../../convex/schema.ts', import.meta.url), 'utf8')
    );
    const tableNames = Object.keys(exportFixture.nonemptyShapes);
    for (const table of tableNames) {
      const section = source
        .split(`${table}: defineTable({`)[1]
        ?.split(/\n  \w+: defineTable\(/)[0];
      expect(section, `missing transition validator for ${table}`).toBeDefined();
      for (const field of exportFixture.nonemptyShapes[
        table as keyof typeof exportFixture.nonemptyShapes
      ]) {
        if (field === '_id' || field === '_creationTime') continue;
        expect(section, `${table}.${field}`).toContain(`${field}:`);
      }
    }
  });

  it('allows honest unconfigured secrets but rejects partial or blank new-write pairs', () => {
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
    expect(() =>
      validateSecretConfigurationWrite({ secretManager: ' ', secretReference: 'vault/item' })
    ).toThrow('SECRET_CONFIGURATION_PAIR_REQUIRED');
    expect(normalizeSecretConfiguration({})).toEqual({
      secretConfigured: false,
      secretManager: null,
      secretReference: null
    });
    expect(() => normalizeSecretConfiguration({ secretReference: 'invented/reference' })).toThrow(
      'INVALID_STORED_SECRET_CONFIGURATION'
    );
  });

  it('accepts normalized affected rows under the final mandatory schema', async () => {
    const t = convexTest(finalSchema, modules);
    await t.run(async (ctx) => {
      const schoolId = await ctx.db.insert('schools', {
        key: 'primary',
        name: 'School',
        createdAt: 1
      });
      const { orgId: _orgId, ...conversation } = exportFixture.representativeRows.conversations;
      const { password: _password, ...accessRecord } =
        exportFixture.representativeRows.accessRecords;
      await ctx.db.insert('conversations', {
        ...conversation,
        status: conversation.status as 'online' | 'offline',
        schoolId
      });
      await ctx.db.insert('accessRecords', {
        ...accessRecord,
        category: accessRecord.category as 'Business Suite' | 'Subscriptions' | 'Social Media',
        status: accessRecord.status as 'Needs setup' | 'Partial' | 'Ready',
        schoolId
      });
    });
  });

  it('reports legacy fields and preserves every row when domain inventory is incomplete', async () => {
    const t = setup();
    await t.run(async (ctx) => {
      const db = ctx.db as typeof ctx.db & {
        insert(table: string, value: Record<string, unknown>): Promise<unknown>;
      };
      await db.insert('conversations', exportFixture.representativeRows.conversations);
      await db.insert('accessRecords', exportFixture.representativeRows.accessRecords);
      for (const [table, count] of [
        ['schoolStaffAccessProfiles', 5],
        ['schoolDashboardRoles', 1],
        ['schoolStaffInvites', 2]
      ] as const) {
        for (let index = 0; index < count; index += 1) {
          await db.insert(table, {
            ...exportFixture.representativeRows[table],
            updatedAt: index + 1
          });
        }
      }
    });

    const preflight = await t.query(internal.schoolOwnershipMigration.validate, {});
    expect(preflight.legacyAuth).toEqual({
      schoolStaffAccessProfiles: { scanned: 5, disposition: 'delete' },
      schoolDashboardRoles: { scanned: 1, disposition: 'delete' },
      schoolStaffInvites: { scanned: 2, disposition: 'delete' }
    });
    expect(preflight.legacyFields).toEqual({
      conversationsOrgId: 1,
      accessRecordsPassword: 1
    });
    await expect(t.mutation(internal.schoolOwnershipMigration.migrate, {})).rejects.toThrow(
      'DOMAIN_INVENTORY_MISMATCH'
    );
    await t.run(async (ctx) => {
      const conversation = (await ctx.db.query('conversations').first()) as Record<string, unknown>;
      const access = (await ctx.db.query('accessRecords').first()) as Record<string, unknown>;
      expect(conversation).toHaveProperty('orgId');
      expect(access).toHaveProperty('password');
      expect(await ctx.db.query('schools').collect()).toEqual([]);
      for (const table of [
        'schoolStaffAccessProfiles',
        'schoolDashboardRoles',
        'schoolStaffInvites'
      ] as const) {
        expect((await ctx.db.query(table).collect()).length).toBe(exportFixture.counts[table]);
      }
    });
  });
  it('rejects a partial domain inventory atomically', async () => {
    const t = setup();
    await t.run(async (ctx) => {
      const studentId = await ctx.db.insert('students', {
        preferredName: 'Private',
        fullName: 'Private',
        sex: 'Unknown',
        className: 'A',
        dateOfBirth: '',
        dateJoined: '',
        nisn: '',
        religion: '',
        status: 'Active',
        guardianName: 'Private',
        guardianPhone: 'Private',
        sortName: 'private'
      });
      const sessionId = await ctx.db.insert('attendanceSessions', {
        className: 'A',
        sessionDate: '2026-01-01',
        status: 'Draft',
        sortKey: '1',
        updatedAt: 1
      });
      await ctx.db.insert('attendanceRecords', {
        sessionId,
        studentId,
        status: 'Present',
        updatedAt: 1
      });
    });

    await expect(t.mutation(internal.schoolOwnershipMigration.migrate, {})).rejects.toThrow(
      'DOMAIN_INVENTORY_MISMATCH'
    );
    expect(await t.run((ctx) => ctx.db.query('schools').collect())).toEqual([]);
  });

  it('rejects ambiguous schools without changing rows', async () => {
    const t = setup();
    await t.run(async (ctx) => {
      await ctx.db.insert('schools', { key: 'primary', name: 'One', createdAt: 1 });
      await ctx.db.insert('schools', { key: 'other', name: 'Two', createdAt: 1 });
      await ctx.db.insert('students', {
        preferredName: 'Private',
        fullName: 'Private',
        sex: 'Unknown',
        className: 'A',
        dateOfBirth: '',
        dateJoined: '',
        nisn: '',
        religion: '',
        status: 'Active',
        guardianName: 'Private',
        guardianPhone: 'Private',
        sortName: 'private'
      });
    });
    await expect(t.mutation(internal.schoolOwnershipMigration.migrate, {})).rejects.toThrow(
      'SCHOOL_CONFIGURATION_AMBIGUOUS'
    );
    const rows = await t.run((ctx) => ctx.db.query('students').collect());
    expect(rows[0].schoolId).toBeUndefined();
  });

  it('rejects missing and mismatched cross-table relationships atomically', async () => {
    const t = setup();
    await t.run(async (ctx) => {
      const schoolId = await ctx.db.insert('schools', {
        key: 'primary',
        name: 'One',
        createdAt: 1
      });
      const otherSchoolId = await ctx.db.insert('schools', {
        key: 'temporary',
        name: 'Two',
        createdAt: 1
      });
      const studentId = await ctx.db.insert('students', {
        schoolId: otherSchoolId,
        preferredName: 'Private',
        fullName: 'Private',
        sex: 'Unknown',
        className: 'A',
        dateOfBirth: '',
        dateJoined: '',
        nisn: '',
        religion: '',
        status: 'Active',
        guardianName: 'Private',
        guardianPhone: 'Private',
        sortName: 'private'
      });
      await ctx.db.insert('studentBillingProfiles', {
        schoolId,
        studentId,
        baseMonthlyFee: 1,
        billingStatus: 'Current',
        arrearsBalance: 0,
        updatedAt: 1
      });
    });
    await expect(t.mutation(internal.schoolOwnershipMigration.migrate, {})).rejects.toThrow(
      'SCHOOL_CONFIGURATION_AMBIGUOUS'
    );
  });

  it('reports broken references without exposing private row content', async () => {
    const t = setup();
    await t.run(async (ctx) => {
      await ctx.db.insert('schools', { key: 'primary', name: 'One', createdAt: 1 });
      const sessionId = await ctx.db.insert('attendanceSessions', {
        className: 'A',
        sessionDate: '2026-01-01',
        status: 'Draft',
        sortKey: '1',
        updatedAt: 1
      });
      const studentId = await ctx.db.insert('students', {
        preferredName: 'Private',
        fullName: 'Private',
        sex: 'Unknown',
        className: 'A',
        dateOfBirth: '',
        dateJoined: '',
        nisn: '',
        religion: '',
        status: 'Active',
        guardianName: 'Private',
        guardianPhone: 'Private',
        sortName: 'private'
      });
      await ctx.db.delete(sessionId);
      await ctx.db.delete(studentId);
      await ctx.db.insert('attendanceRecords', {
        sessionId,
        studentId,
        status: 'Present',
        updatedAt: 1
      });
    });
    const report = await t.query(internal.schoolOwnershipMigration.validate, {});
    expect(report.tables.attendanceRecords).toMatchObject({ unowned: 1, mismatches: 2 });
    expect(JSON.stringify(report)).not.toMatch(/Private|guardian|phone|name/i);
    await expect(t.mutation(internal.schoolOwnershipMigration.migrate, {})).rejects.toThrow(
      'DOMAIN_INVENTORY_MISMATCH'
    );
  });

  it('documents phase-specific recovery and the destructive roll-forward boundary', async () => {
    const runbook = await import('node:fs/promises').then((fs) =>
      fs.readFile(
        new URL('../../docs/setup/school-ownership-transition.md', import.meta.url),
        'utf8'
      )
    );
    for (const required of [
      'Concurrent writes are prohibited',
      'Transition schema deployed; migration not started',
      'Migration invoked but failed',
      'Migration succeeded, before or after final schema',
      'roll-forward-only boundary',
      'verified full restore',
      'Reconcile the live report against the backup',
      'domainRowTotal: 122'
    ]) {
      expect(runbook).toContain(required);
    }
  });

  it('has no public callable migration export and keeps identity tables strict', async () => {
    expect(migrationIsPublic).toBe(false);
    expect(migrationIsInternal).toBe(true);

    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../../convex/schoolOwnershipMigration.ts', import.meta.url), 'utf8')
    );
    expect(source).not.toMatch(/export const \w+ = (query|mutation|action)\s*\(/);
    expect(source).toMatch(/internalQuery\s*\(/);
    expect(source).toMatch(/internalMutation\s*\(/);

    const schemaSource = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../../convex/schema.ts', import.meta.url), 'utf8')
    );
    for (const table of ['appUsers', 'invites']) {
      const section =
        schemaSource.split(`${table}: defineTable({`)[1]?.split(/\n  \w+: defineTable\(/)[0] ?? '';
      expect(section).toContain("schoolId: v.id('schools')");
      expect(section).not.toContain("schoolId: v.optional(v.id('schools'))");
    }
  });
});
