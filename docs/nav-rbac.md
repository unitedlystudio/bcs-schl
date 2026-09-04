# Navigation and backend authorization

Navigation reads the immutable access snapshot from the dashboard's single application access gate. This is presentation only. Every Convex query, mutation, and action must derive the Better Auth subject from `ctx.auth`, load one active `appUsers` row and its application-owned roles, then enforce the operation's permission. Missing, duplicate, disabled, or invalid access records deny.

The deployment serves one school. Callers never select a school or workspace, and identity token claims do not grant roles.

All domain rows carry a mandatory server-derived `schoolId`; reads use school-leading indexes and direct-ID operations verify ownership plus related-record ownership. Queries require the domain `*:read` permission and mutations require `*:write`. Safeguarding-category or restricted concern records additionally require `org:safeguarding:manage` on list, detail, summary, history, create, and update paths.

Platform-access records contain only non-secret metadata and an opaque secret-manager/reference pair. Schly stores and returns no plaintext platform password and exposes no credential-reveal API.
