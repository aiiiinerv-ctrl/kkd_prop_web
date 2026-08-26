# Sprint 2A Channel Executive delete guard evidence

Date: 2026-08-26 (Asia/Bangkok)

## Authorized scope

Local application guard and regression test only. Production orphan
remediation, deploy, maintenance, backup, schema changes, and DDL were not
authorized and did not occur.

The implementation plan and before-summary are recorded in
`docs/plans/pages-cms-sprint2a-channel-executive-delete-guard.md`.

## TDD evidence

Public seam: `deleteChannelExecutive(id)` as observed through the rendered
`/admin/channels` confirmation and toast behavior.

Red, before implementation:

```text
FRIENDLY_ERROR_VISIBLE=FAIL
EXECUTIVE_RETAINED=FAIL
ADMIN_USER_LINK_RETAINED=FAIL
DELETE_AUDIT_NOT_CREATED=FAIL
```

Green, after implementation in both dev and the production build:

```text
FRIENDLY_ERROR_VISIBLE=PASS
EXECUTIVE_RETAINED=PASS
ADMIN_USER_LINK_RETAINED=PASS
DELETE_AUDIT_NOT_CREATED=PASS
CHANNEL_EXECUTIVE_DELETE_GUARD=PASS
```

The test refuses non-loopback database targets, uses unique synthetic records,
and deletes its fixture in `finally`. It captures no authenticated screenshot
or account identity.

## What changed

- `deleteChannelExecutive()` now reads the existing relation count for both
  automatic Leads and linked Admin Users.
- Existing automatic-Lead errors retain precedence and wording.
- Any linked Admin User blocks deletion, regardless of active state.
- The returned error contains only an aggregate count and instructs the admin
  to relink the account or change its role first.
- Authorization remains first, and successful unreferenced deletion still
  uses the existing audited mutation seam and revalidation behavior.
- No schema, public content, locale messages, or production record changed.

## Verification

- Targeted ESLint: zero errors. One pre-existing warning remains at
  `src/actions/channels.ts:296` for `_linkedAdminUserId`; it is unrelated to
  this guard and was not broadened into the sprint.
- `npm run build`: compiled successfully and finished TypeScript successfully.
  The existing Turbopack NFT warning for the dynamic storage path remains.
- Focused guard verification on local production build: all five markers pass.
- Existing `scripts/e2e-admin-crud.mts`: exit 0; CRUD, Audit Log, channel,
  settings, TH/EN About Content, and reporting checks pass.
- Local servers were stopped after verification.

## Remaining owner-controlled work

- The one production orphan identified by Gate A is unchanged.
- Gate A remains `NO-GO` until the owner chooses the business-correct account
  remediation, all eleven orphan checks return zero, and exact full-text DDL
  evidence is captured.
- Deploying this guard and performing any production remediation remain
  separate approvals.
