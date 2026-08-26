# Pages CMS Sprint 2A — Channel Executive delete guard

Status: approved for local implementation on 2026-08-26. Production orphan
remediation, deployment, maintenance, backup, and DDL remain unauthorized.

## Requirement and root cause

Gate A found one active `CHANNEL_EXECUTIVE` Admin User whose
`linkedChannelExecutiveId` points to a deleted Channel Executive. The delete
action currently checks only automatic Lead references. Production MyISAM
ignored the intended `ON DELETE SET NULL` Foreign Key, so deletion left the
link stale.

This sprint prevents recurrence in application behavior. It does not infer the
business-correct replacement for the existing production account and must not
modify that account.

## Confirmed test seam

Exercise the public `deleteChannelExecutive(id)` server-action behavior through
the rendered `/admin/channels` UI with a synthetic local database fixture.

When a Channel Executive has a linked Admin User:

- the confirmation can still be opened;
- submitting delete returns a user-friendly aggregate error;
- the Channel Executive remains visible and stored;
- the Admin User link remains unchanged; and
- no `ChannelExecutive` DELETE Audit Log is created.

The test may use Prisma only to create and clean the isolated fixture and to
verify the persistent/audit boundary. It must never connect to a non-loopback
database.

## Small sprints

### Sprint 2A.1 — Red

- Add a focused, idempotent Playwright integration check.
- Use unique synthetic IDs/names and deterministic cleanup.
- Run against the current implementation and require failure because deletion
  is incorrectly allowed.

### Sprint 2A.2 — Green

- Extend the existing trusted server-side relation count in
  `deleteChannelExecutive()` to include linked Admin Users.
- Return only the aggregate count and remediation guidance; never expose a
  linked user's identity.
- Keep authorization and audited deletion paths unchanged.
- Run the focused test until green.

### Sprint 2A.3 — Verification

- Run `npm run build`.
- Run the focused regression in the production build against local MySQL.
- Run the applicable existing admin CRUD/audit suite if its prerequisites are
  available; otherwise report the exact skipped prerequisite.
- Render `/admin/channels` in the local production build and retain only
  non-sensitive pass markers, not authenticated screenshots.

## Edge cases and impact

- A missing executive keeps the existing “not found” response.
- Existing automatic Lead references keep their current, more specific block.
- Active and inactive linked Admin Users both block deletion; a stale identity
  link should never be created deliberately for either state.
- The guard reports a count, not names/emails/IDs.
- A caller cannot bypass authorization because `requireRole()` remains first.
- A successful unreferenced delete continues through `auditedEntity()` so the
  Audit Log and revalidation behavior do not fork.
- This guard reduces recurrence before conversion. The future InnoDB/FK design
  must still reconcile database `SET NULL` behavior with the domain invariant
  that an active `CHANNEL_EXECUTIVE` account has a real link.

## Rollback and owner checkpoint

Rollback is a normal code revert plus deletion of synthetic local fixtures.
Production remains unchanged. After verification, the owner separately decides
how to remediate the one production account and whether to authorize deploy.
