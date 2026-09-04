import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const patterns = [
  '@clerk', 'ClerkProvider', 'ConvexProviderWithClerk', 'clerkMiddleware', 'clerkClient',
  'useOrganization', 'useOrganizationList', 'OrganizationProfile', 'SignOutButton',
  '__clerk_ticket', 'clerkInvitationId', 'clerkRole', 'CLERK_', 'LOCAL_AUTH_BYPASS',
  'setAdminAuth', 'seedDemoData'
];
const files = execFileSync('rg', ['--files'], { encoding: 'utf8' }).trim().split('\n').filter((file) => file && !file.startsWith('public/schly-management.html') && file !== 'bun.lock' && file !== 'scripts/auth-denylist.mjs');
const violations = [];
for (const file of files) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  for (const pattern of patterns) if (text.includes(pattern)) violations.push(`${file}: ${pattern}`);
}
if (violations.length) { console.error(violations.join('\n')); process.exit(1); }
console.log(`Auth deny-list passed (${files.length} tracked files checked).`);
