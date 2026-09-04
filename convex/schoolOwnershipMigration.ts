import { ConvexError, v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import type { Id, TableNames } from './_generated/dataModel';

const LEGACY_DOMAIN_TABLES = [
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
] as const satisfies readonly TableNames[];

type LegacyTable = (typeof LEGACY_DOMAIN_TABLES)[number];
type SafeTableCount = { scanned: number; unowned: number; mismatches: number };
type Row = { _id: Id<TableNames>; schoolId?: Id<'schools'>; [key: string]: unknown };
type Rows = Record<LegacyTable, Row[]>;

// Generated from /tmp/schly-convex-export/export.zip. Never relax these to fit live data.
const EXPECTED_DOMAIN_COUNTS: Record<LegacyTable, number> = {
  conversations: 6,
  messages: 35,
  inboxItems: 3,
  accessRecords: 14,
  students: 8,
  teachers: 3,
  concernCases: 4,
  concernCaseUpdates: 2,
  financeFamilyAccounts: 0,
  studentBillingProfiles: 3,
  financeCharges: 5,
  financePayments: 2,
  financeReminderLogs: 0,
  financePaymentApplications: 0,
  admissionsEnquiries: 5,
  attendanceSessions: 4,
  attendanceRecords: 6,
  operationsTimeSlots: 9,
  classTimetableEntries: 5,
  operationsOverrides: 3,
  staffLeaveRequests: 3,
  staffCoverAssignments: 2
};

const LEGACY_AUTH_TABLES = [
  'schoolStaffAccessProfiles',
  'schoolDashboardRoles',
  'schoolStaffInvites'
] as const satisfies readonly TableNames[];
type LegacyAuthTable = (typeof LEGACY_AUTH_TABLES)[number];
const EXPECTED_LEGACY_AUTH_COUNTS: Record<LegacyAuthTable, number> = {
  schoolStaffAccessProfiles: 5,
  schoolDashboardRoles: 1,
  schoolStaffInvites: 2
};

type Relationship = {
  from: LegacyTable;
  field: string;
  to: LegacyTable;
};

const RELATIONSHIPS: readonly Relationship[] = [
  { from: 'messages', field: 'conversationId', to: 'conversations' },
  { from: 'concernCases', field: 'studentId', to: 'students' },
  { from: 'concernCases', field: 'assignedTeacherId', to: 'teachers' },
  { from: 'concernCaseUpdates', field: 'caseId', to: 'concernCases' },
  { from: 'studentBillingProfiles', field: 'studentId', to: 'students' },
  { from: 'studentBillingProfiles', field: 'familyAccountId', to: 'financeFamilyAccounts' },
  { from: 'financeCharges', field: 'billingProfileId', to: 'studentBillingProfiles' },
  { from: 'financePayments', field: 'billingProfileId', to: 'studentBillingProfiles' },
  { from: 'financeReminderLogs', field: 'billingProfileId', to: 'studentBillingProfiles' },
  { from: 'financePaymentApplications', field: 'billingProfileId', to: 'studentBillingProfiles' },
  { from: 'financePaymentApplications', field: 'paymentId', to: 'financePayments' },
  { from: 'financePaymentApplications', field: 'chargeId', to: 'financeCharges' },
  { from: 'admissionsEnquiries', field: 'convertedStudentId', to: 'students' },
  { from: 'attendanceRecords', field: 'sessionId', to: 'attendanceSessions' },
  { from: 'attendanceRecords', field: 'studentId', to: 'students' },
  { from: 'classTimetableEntries', field: 'timeSlotId', to: 'operationsTimeSlots' },
  { from: 'classTimetableEntries', field: 'leadTeacherId', to: 'teachers' },
  { from: 'operationsOverrides', field: 'timeSlotId', to: 'operationsTimeSlots' },
  { from: 'operationsOverrides', field: 'teacherId', to: 'teachers' },
  { from: 'operationsOverrides', field: 'studentId', to: 'students' },
  { from: 'staffLeaveRequests', field: 'teacherId', to: 'teachers' },
  { from: 'staffCoverAssignments', field: 'leaveRequestId', to: 'staffLeaveRequests' },
  { from: 'staffCoverAssignments', field: 'primaryTeacherId', to: 'teachers' },
  { from: 'staffCoverAssignments', field: 'coverTeacherId', to: 'teachers' }
];

async function loadRows(ctx: {
  db: { query: (table: TableNames) => { collect: () => Promise<unknown[]> } };
}) {
  const entries = await Promise.all(
    LEGACY_DOMAIN_TABLES.map(
      async (table) => [table, (await ctx.db.query(table).collect()) as Row[]] as const
    )
  );
  return Object.fromEntries(entries) as Rows;
}

async function loadLegacyAuthRows(ctx: {
  db: { query: (table: TableNames) => { collect: () => Promise<unknown[]> } };
}) {
  const entries = await Promise.all(
    LEGACY_AUTH_TABLES.map(async (table) => [table, await ctx.db.query(table).collect()] as const)
  );
  return Object.fromEntries(entries) as Record<LegacyAuthTable, Array<{ _id: Id<TableNames> }>>;
}

function legacyAuthReport(rows: Record<LegacyAuthTable, Array<{ _id: Id<TableNames> }>>) {
  return Object.fromEntries(
    LEGACY_AUTH_TABLES.map((table) => [
      table,
      { scanned: rows[table].length, disposition: 'delete' }
    ])
  ) as Record<LegacyAuthTable, { scanned: number; disposition: 'delete' }>;
}

function assertExpectedLegacyAuthInventory(
  rows: Record<LegacyAuthTable, Array<{ _id: Id<TableNames> }>>
) {
  const counts = LEGACY_AUTH_TABLES.map((table) => rows[table].length);
  if (counts.every((count) => count === 0)) return;
  if (
    LEGACY_AUTH_TABLES.some((table) => rows[table].length !== EXPECTED_LEGACY_AUTH_COUNTS[table])
  ) {
    throw new ConvexError('LEGACY_AUTH_INVENTORY_MISMATCH');
  }
}

function assertExpectedDomainInventory(rows: Rows) {
  if (LEGACY_DOMAIN_TABLES.some((table) => rows[table].length !== EXPECTED_DOMAIN_COUNTS[table])) {
    throw new ConvexError('DOMAIN_INVENTORY_MISMATCH');
  }
}

function inspect(rows: Rows, schoolId: Id<'schools'> | undefined) {
  const tables = Object.fromEntries(
    LEGACY_DOMAIN_TABLES.map((table) => [
      table,
      { scanned: rows[table].length, unowned: 0, mismatches: 0 } satisfies SafeTableCount
    ])
  ) as Record<LegacyTable, SafeTableCount>;

  for (const table of LEGACY_DOMAIN_TABLES) {
    for (const row of rows[table]) {
      if (row.schoolId === undefined) tables[table].unowned += 1;
      else if (schoolId === undefined || row.schoolId !== schoolId) tables[table].mismatches += 1;
    }
  }

  const indexes = Object.fromEntries(
    LEGACY_DOMAIN_TABLES.map((table) => [table, new Map(rows[table].map((row) => [row._id, row]))])
  ) as Record<LegacyTable, Map<unknown, Row>>;

  for (const relationship of RELATIONSHIPS) {
    for (const row of rows[relationship.from]) {
      const reference = row[relationship.field];
      if (reference === undefined) continue;
      const related = indexes[relationship.to].get(reference);
      if (!related) {
        tables[relationship.from].mismatches += 1;
        continue;
      }
      const ownershipMatches =
        schoolId === undefined
          ? row.schoolId === related.schoolId
          : (row.schoolId ?? schoolId) === (related.schoolId ?? schoolId);
      if (!ownershipMatches) {
        tables[relationship.from].mismatches += 1;
      }
    }
  }

  const unownedTotal = Object.values(tables).reduce((sum, table) => sum + table.unowned, 0);
  const mismatchTotal = Object.values(tables).reduce((sum, table) => sum + table.mismatches, 0);
  const legacyFields = {
    conversationsOrgId: rows.conversations.filter((row) => 'orgId' in row).length,
    accessRecordsPassword: rows.accessRecords.filter((row) => 'password' in row).length
  };
  return { tables, unownedTotal, mismatchTotal, legacyFields };
}

async function schoolState(ctx: {
  db: { query: (table: 'schools') => { collect: () => Promise<unknown[]> } };
}) {
  const schools = (await ctx.db.query('schools').collect()) as Array<{
    _id: Id<'schools'>;
    key: string;
  }>;
  const canonical = schools.filter((school) => school.key === 'primary');
  return { schools, canonical };
}

export const validate = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const { schools, canonical } = await schoolState(ctx);
    const legacyAuthRows = await loadLegacyAuthRows(ctx);
    const report = inspect(
      await loadRows(ctx),
      canonical.length === 1 ? canonical[0]._id : undefined
    );
    return {
      schoolCount: schools.length,
      canonicalSchoolCount: canonical.length,
      legacyAuth: legacyAuthReport(legacyAuthRows),
      domainRowTotal: Object.values(report.tables).reduce((sum, table) => sum + table.scanned, 0),
      ...report
    };
  }
});

export const migrate = internalMutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const { schools, canonical } = await schoolState(ctx);
    const rows = await loadRows(ctx);
    const legacyAuthRows = await loadLegacyAuthRows(ctx);
    if (
      schools.length > 1 ||
      canonical.length > 1 ||
      (schools.length === 1 && canonical.length !== 1)
    ) {
      throw new ConvexError('SCHOOL_CONFIGURATION_AMBIGUOUS');
    }

    assertExpectedDomainInventory(rows);
    assertExpectedLegacyAuthInventory(legacyAuthRows);
    const before = inspect(rows, canonical.length === 1 ? canonical[0]._id : undefined);
    if (before.mismatchTotal !== 0) throw new ConvexError('RELATIONSHIP_VALIDATION_FAILED');

    let schoolsCreated = 0;
    let schoolId: Id<'schools'>;
    if (schools.length === 0) {
      schoolId = await ctx.db.insert('schools', {
        key: 'primary',
        name: 'Schly School',
        createdAt: Date.now()
      });
      schoolsCreated = 1;
    } else {
      schoolId = canonical[0]._id;
    }

    const tableResults = Object.fromEntries(
      LEGACY_DOMAIN_TABLES.map((table) => [table, { scanned: rows[table].length, assigned: 0 }])
    ) as Record<LegacyTable, { scanned: number; assigned: number }>;
    for (const table of LEGACY_DOMAIN_TABLES) {
      for (const row of rows[table]) {
        const containsLegacyData =
          (table === 'conversations' && 'orgId' in row) ||
          (table === 'accessRecords' && 'password' in row);
        if (row.schoolId === undefined || containsLegacyData) {
          await ctx.db.patch(row._id, {
            schoolId: row.schoolId ?? schoolId,
            ...(table === 'conversations' ? { orgId: undefined } : {}),
            ...(table === 'accessRecords' ? { password: undefined } : {})
          });
          tableResults[table].assigned += 1;
        }
      }
    }

    const legacyAuthDeleted = Object.fromEntries(
      LEGACY_AUTH_TABLES.map((table) => [table, legacyAuthRows[table].length])
    ) as Record<LegacyAuthTable, number>;
    for (const table of LEGACY_AUTH_TABLES) {
      for (const row of legacyAuthRows[table]) await ctx.db.delete(row._id);
    }

    const after = inspect(await loadRows(ctx), schoolId);
    const legacyAuthAfter = await loadLegacyAuthRows(ctx);
    if (
      after.unownedTotal !== 0 ||
      after.mismatchTotal !== 0 ||
      after.legacyFields.conversationsOrgId !== 0 ||
      after.legacyFields.accessRecordsPassword !== 0 ||
      LEGACY_AUTH_TABLES.some((table) => legacyAuthAfter[table].length !== 0)
    ) {
      throw new ConvexError('POST_MIGRATION_VALIDATION_FAILED');
    }
    return {
      schoolsCreated,
      changed: Object.values(tableResults).reduce((sum, table) => sum + table.assigned, 0),
      legacyAuthDeleted,
      tables: tableResults,
      validation: {
        unownedTotal: after.unownedTotal,
        mismatchTotal: after.mismatchTotal,
        legacyFields: after.legacyFields
      }
    };
  }
});
