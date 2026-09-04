# One-school `schoolId` transition runbook

This is an internal-only, maintenance-window migration for `clear-wren-571`. The temporary schema accepts the inspected legacy export; public functions remain ownership-scoped and fail closed on missing `schoolId`. The approved identity policy is **fresh Better Auth users and re-invite everyone**. Clerk identities, roles, access profiles, and invites are never translated.

## Authority and invariants

The authority is `/tmp/schly-convex-export/export.zip`. Its sanitized structural fixture is `tests/fixtures/school-migration-export.structural.json`.

- 122 rows across the 22 school-domain tables (`LEGACY_DOMAIN_TABLES`), not 112.
- 130 application rows total after adding the three old-auth tables below (system `_tables` metadata excluded).
- `schoolStaffAccessProfiles`: 5 — delete atomically after preflight; recreate users/permissions through Better Auth.
- `schoolDashboardRoles`: 1 — delete atomically after preflight; do not translate the Clerk role.
- `schoolStaffInvites`: 2 — delete atomically after preflight; issue fresh Better Auth invites.
- 3 of 6 `conversations` rows have legacy `orgId`; migration removes it.
- All 14 `accessRecords` rows have plaintext `password` and no secret metadata; migration permanently removes `password` and leaves secret metadata absent. Never fabricate manager references.
- Exact legacy identity-field occurrences are: `schoolStaffAccessProfiles.orgId`: 5, `.userId`: 5, `.updatedByUserId`: 5; `schoolDashboardRoles.orgId`: 1, `.updatedByUserId`: 1; `schoolStaffInvites.orgId`: 2, `.email`: 2, `.normalizedEmail`: 2, `.clerkInvitationId`: 2, `.claimedByUserId`: 2, `.invitedByUserId`: 2.

Access records may remain honestly unconfigured. The final schema permits both secret fields to be absent; every new-write boundary must call `validateSecretConfigurationWrite`, which accepts both nonblank fields or neither. Reads fail closed on a partial stored pair and return `secretConfigured: false` with null fields when unconfigured.

## 1. Enter maintenance mode and verify backup

Disable every public writer, background job, webhook, importer, and admin mutation before the first schema push. Confirm no in-flight writes remain. **Concurrent writes are prohibited until final-schema verification completes.** Do not rely on application-level school scoping as a substitute for maintenance mode.

```sh
test -f /tmp/schly-convex-export/export.zip
unzip -t /tmp/schly-convex-export/export.zip
sha256sum /tmp/schly-convex-export/export.zip
```

Record checksum, export time, and maintenance start. Keep the archive immutable. Stop if archive verification fails.

## 2. Deploy transition schema

Confirm the private environment selects exactly `CONVEX_DEPLOYMENT=dev:clear-wren-571`, then:

```sh
bunx convex env list --deployment clear-wren-571
bunx convex dev --once --typecheck enable
```

Read the target line before approval. Stop unless it names `clear-wren-571`.

## 3. Preflight and reconcile inventory

```sh
bunx convex run schoolOwnershipMigration:validate '{}' --deployment clear-wren-571
```

Require:

- `domainRowTotal: 122` and per-table counts equal the recorded fixture/export;
- `schoolCount` and `canonicalSchoolCount` each 0 or 1, with no non-primary singleton;
- `mismatchTotal: 0`;
- legacy-auth counts exactly 5, 1, and 2 with disposition `delete`.

Reconcile the live report against the backup before proceeding. Any difference means a write occurred after export or the wrong deployment/export was selected: remain in maintenance mode, make a new verified export, regenerate/review the structural fixture and expectations, or abort. Never edit expected counts merely to make preflight pass.

## 4. Run the single transactional migration

```sh
bunx convex run schoolOwnershipMigration:migrate '{}' --deployment clear-wren-571
```

The internal mutation validates school configuration and relationships, verifies the exact legacy-auth inventory (or the all-zero replay state), assigns the canonical school, removes `conversations.orgId`, removes plaintext `accessRecords.password`, deletes all three Clerk-era tables' rows, and post-validates in one Convex transaction. Any failure aborts all writes. Reports contain counts only.

Expected destructive counts on first execution: 5 access profiles, 1 dashboard role, and 2 staff invites. A successful replay returns zero ownership changes and zero old-auth deletions.

## 5. Postflight and backup reconciliation

Run validation again and save both count reports:

```sh
bunx convex run schoolOwnershipMigration:validate '{}' --deployment clear-wren-571
```

Require one canonical school, `unownedTotal: 0`, `mismatchTotal: 0`, every legacy-auth scanned count 0, no `orgId`, no plaintext `password`, and domain counts matching the backup (deletions apply only to the eight explicitly disposed old-auth rows). Reconcile every table count against the backup plus the documented disposition before finalizing.

## 6. Finalize source and deploy the final schema

Only after step 5 postflight has been saved and reconciled, replace the transition schema with the reviewed final contract and remove the migration module and its generated API registration. Do not restore the old baseline because it incorrectly requires invented secret references.

```sh
cp convex/schema.final.ts convex/schema.ts
rm convex/schema.final.ts convex/schoolOwnershipMigration.ts
bunx convex codegen
bunx tsc -p convex/tsconfig.json --noEmit
bunx convex dev --once --typecheck enable
```

Approve only for `clear-wren-571`. The migration validation function must no longer exist after this deploy.

## 7. Verify after final deploy

Do not call the removed migration function. Keep maintenance mode enabled and use read-only Convex dashboard table queries or a fresh export to confirm the canonical school exists, all 122 domain rows remain, and each domain row has `schoolId`. Validate the export against the final schema and scan the exported field names to confirm the three Clerk-era tables, `orgId`, and plaintext `password` are absent. Confirm the deployed public and internal function lists contain no `schoolOwnershipMigration` module, then exercise the existing authenticated read/write smoke tests to prove the public runtime still fails closed outside the caller's school.

## Phase-specific rollback and roll-forward

### Transition schema deployed; migration not started

Keep maintenance mode on. It is safe to redeploy the prior schema because no data changed, provided a fresh read-only inventory still equals the verified backup. If it differs, prohibit rollback until the difference is reconciled. Restore service only after the prior schema and runtime checks pass.

### Migration invoked but failed

Convex mutation atomicity means ownership assignment, field removal, school creation, and old-auth deletion roll back together. Keep maintenance mode on, rerun preflight, and compare all counts to the backup. Correct only the diagnosed cause, then retry. If any counts changed despite a reported failure, treat that as an incident and use a verified restore; do not continue.

### Migration succeeded, before or after final schema

Successful destructive cleanup is the **roll-forward-only boundary**. Do not redeploy a runtime/schema that expects plaintext passwords, Clerk role/profile rows, Clerk invites, or legacy `orgId`. The normal recovery is to fix forward while maintenance remains enabled.

Rollback past this boundary is allowed only by choosing a **verified full restore**: stop all writers, preserve the failed-state export, restore the complete pre-window backup (not selected tables), verify its checksum and exact per-table counts/relationships, redeploy the matching pre-migration code/schema, and verify runtime behavior before reopening traffic. Never overlay the archive onto a database that accepted concurrent writes; that would silently lose or merge data. If any post-export write must be retained, perform an explicit reviewed reconciliation into a new restore candidate first.

## Exit maintenance

Exit only after final-schema deployment, the step 5 postflight reconciliation, the step 7 read-only/export/schema checks, canonical tests/typechecks/build, and confirmation that public runtime remains fail closed for missing ownership. Store the backup checksum and preflight/migration/postflight reports with the change record. Keep the backup according to retention policy.
