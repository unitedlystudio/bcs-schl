import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const patterns = [
  '@clerk',
  'ClerkProvider',
  'ConvexProviderWithClerk',
  'clerkMiddleware',
  'clerkClient',
  'useOrganization',
  'useOrganizationList',
  'OrganizationProfile',
  'SignOutButton',
  '__clerk_ticket',
  'clerkInvitationId',
  'clerkRole',
  'CLERK_',
  'LOCAL_AUTH_BYPASS',
  'setAdminAuth',
  'seedDemoData'
];
// These files describe inspected transition-only rows. Runtime code and the final schema remain
// deny-listed; remove this narrow exception with the migration artifacts after cutover.
const transitionFixtureExceptions = new Map([
  ['convex/schema.ts', new Set(['clerkInvitationId', 'clerkRole'])],
  [
    'tests/fixtures/school-migration-export.structural.json',
    new Set(['clerkInvitationId', 'clerkRole'])
  ],
  ['tests/migrations/school-ownership-transition.test.ts', new Set(['clerkInvitationId'])],
  ['docs/setup/school-ownership-transition.md', new Set(['clerkInvitationId'])]
]);
const files = execFileSync('rg', ['--files'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(
    (file) =>
      file &&
      !file.startsWith('public/schly-management.html') &&
      file !== 'bun.lock' &&
      file !== 'scripts/auth-denylist.mjs'
  );
const violations = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const pattern of patterns) {
    if (text.includes(pattern) && !transitionFixtureExceptions.get(file)?.has(pattern)) {
      violations.push(`${file}: ${pattern}`);
    }
  }
}
if (violations.length) {
  console.error(violations.join('\n'));
  process.exit(1);
}
console.log(`Auth deny-list passed (${files.length} tracked files checked).`);
