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

## Guard-only release readiness

Checked on 2026-08-26 under the authorization boundary in
`docs/plans/pages-cms-sprint2a-guard-deploy-readiness.md`. This checkpoint did
not upload or extract files on the host, restart Passenger, change production
configuration or schema, authenticate to production, or mutate production
data.

### Provenance and scope

- `origin/main` was refreshed at `d7143e47801fcd37c6f91fc54d5121b26f13d9d9`.
  Local `main` was `518525c1f44698e6c7ac813ff79cb86a0530ec30`,
  26 commits ahead and zero commits behind.
- An isolated detached worktree started at the last recorded production
  baseline `72da1be6c3859b9eef8e9a180b56b826f97b1b72` and cherry-picked only the
  source patch from `fa08277`.
- The resulting release commit was
  `ceb6aa2a9e92ab716686feb67f76a30089161d6b`.
- The complete release diff against `72da1be` was exactly
  `src/actions/channels.ts` (9 insertions, 1 deletion). There was no Prisma,
  migration, dependency, environment, public asset, storage, or bilingual
  message change.

### Artifact

- Built with `scripts/build-shared-hosting-deploy.mts` using the AlmaLinux 8 /
  Node 20.20 Linux target. The successful invocation pinned the repo's arm64
  Node/tsx runtime because the first `npx` attempt selected a stale x64
  esbuild cache before Docker started.
- Next build ID: `_JPOENcC3vWsakoG-WHkW`.
- ZIP size: `27,722,446` bytes.
- ZIP SHA-256:
  `b766dd18a9304340f2f802562446b6eecde5f210b2bdee17df50a0b31f6989fb`.
- ZIP integrity passed. The compiled guard text was present in a server chunk,
  and the staged Sharp runtime was an x86-64 Linux ELF shared object.
- The allowlisted staging tree and ZIP contained no `.env*`, credentials,
  local database, `storage/`, `backups/`, user uploads, or repository metadata.
  A targeted content scan also found no local database password, panel
  credential assignment, verification-only auth secret, or private key.
- The staging directory contains Next-generated relative package symlinks that
  become host-absolute when copied by the assembler, so mounting staging
  directly into a container cannot resolve the hashed Prisma adapter. The ZIP
  materializes those package files. The extracted ZIP contained the hashed
  adapter package and started successfully in the Linux container; verification
  therefore exercised the actual extraction path used on production.

### Local behavior

The extracted ZIP ran at local production mode against loopback MySQL. The
focused regression passed:

```text
FRIENDLY_ERROR_VISIBLE=PASS
EXECUTIVE_RETAINED=PASS
ADMIN_USER_LINK_RETAINED=PASS
DELETE_AUDIT_NOT_CREATED=PASS
CHANNEL_EXECUTIVE_DELETE_GUARD=PASS
```

The existing admin CRUD/audit browser regression exited 0. It covered login,
Leads, Services, Users, Packages, Portfolio, Testimonials, Channels, Bookings,
Settings, Page SEO, paired TH/EN About Content, Audit Log, and Reports. Its
synthetic mutations targeted local MySQL only.

### Read-only production preflight

```text
HOMEPAGE: /th -> 200
ADMIN_REDIRECT: /admin -> 307
PRIVATE_FILE: /files/private/slips/nonexistent -> 401
ADMIN_API: /api/admin/leads -> 401
```

No feature-specific authenticated production deletion was attempted. The
guard's production behavior remains intentionally unproven until the owner
authorizes a named canary mutation; the extracted-ZIP browser regression is
the pre-deploy behavioral proof.

### Decision and rollback

**Pre-deploy decision: GO for a separate deploy approval; not yet deployed at
this checkpoint.** The rollback point is
the recorded production baseline `72da1be`. A reproducible rollback artifact
can be built from that exact commit with the same shared-hosting builder,
uploaded by the human-only FTP procedure, extracted, restarted, and followed
by the standard production smoke suite. This code-only release has no database
rollback step and does not remediate the known production orphan.

## Production deployment

Owner approval for the guard-only deployment was received on 2026-08-26. The
human-only FTP upload completed with `226 File successfully transferred`; the
remote transfer and local artifact sizes both reported `27,722,446` bytes.
No agent-run upload path was used.

After a separate owner approval for the production mutations:

- DirectAdmin extracted `kkd-app-production/dist.zip` with `File Extracted`
  and HTTP 200.
- Resaving `tmp/restart.txt` returned HTTP 302, the documented successful
  graceful Passenger restart response.
- The immediate read-only post-restart smoke returned `/th` 200, `/admin` 307,
  the nonexistent private slip route 401, and `/api/admin/leads` 401.
- No production login, canary record, delete attempt, schema/configuration
  change, or database mutation occurred. The existing orphan is unchanged.

**Deployment status: released and read-only smoke green.** The exact uploaded
ZIP is identified by the SHA-256 and build ID above. Guard behavior in the
deployed process is not claimed from a production delete attempt; that would
require a separate named-canary mutation approval. The production-mode local
regression against the extracted release remains the behavioral evidence.
