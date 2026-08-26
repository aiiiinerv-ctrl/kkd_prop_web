# Pages CMS Sprint 2 — temporary production backup route

Status: approved for local implementation on 2026-08-26. Deployment, production
environment changes, maintenance mode, route invocation, snapshot download, and
DDL remain separately unauthorized until the owner supplies and approves an
exact maintenance window.

## Outcome

Provide the shared-hosting application process with a temporary, secret-gated
way to create the same restorable snapshot as `scripts/backup-db.mts`: a
data-only `database.sql`, `schema-metadata.json`, and the private storage tree.
The route exists only to clear Pages CMS Gate B on a host without SSH, Prisma
CLI, `tsx`, `mysqldump`, or remote MySQL access. It is removed in a clean
redeploy immediately after the production snapshot has been downloaded and
verified.

## Confirmed test seams

Tests exercise two public interfaces and do not mock internal collaborators:

1. The HTTP `POST /api/operations/pages-cms-backup` request/response contract:
   disabled, missing/wrong secret, missing write-quiescence confirmation,
   successful sanitized response, failure sanitization, and concurrent-call
   rejection.
2. The existing `npx tsx scripts/backup-db.mts` operator contract against the
   loopback rehearsal database: snapshot format, metadata/hash, row inventory,
   private-file copy, and restore compatibility remain unchanged after the
   backup engine is shared with the route.

The focused HTTP verifier may inject only the backup operation at the route's
system boundary so it cannot touch a real database or filesystem. The existing
storage-engine rehearsal remains the integration proof for real MySQL and
filesystem behavior and must reject non-loopback database URLs.

## Sprint 2B.1 — plan and red

- Commit this plan before implementation begins.
- Add a focused route-contract verifier that imports the Route Handler and
  calls it with Web `Request` objects.
- Prove the verifier fails because the route does not exist yet.
- Add one behavioral slice at a time: red, minimal green, then the next slice.

## Sprint 2B.2 — shared backup engine

- Extract snapshot creation from the CLI entry point into one reusable
  server-only Node.js module; do not fork the SQL or metadata format.
- Keep `scripts/backup-db.mts` as the operator-facing wrapper with its existing
  environment and output contract.
- Create a snapshot in a temporary directory and publish it under the existing
  timestamp naming contract only after all required files are complete.
- Use an atomic filesystem lock under `BACKUP_ROOT` so concurrent processes
  cannot create colliding or inconsistent snapshots.
- Keep retention opt-in for the CLI. The temporary HTTP route never prunes
  backups.

## Sprint 2B.3 — temporary HTTP route

- Add a POST-only Route Handler under `src/app/api/operations/` with explicit
  `runtime = "nodejs"` and dynamic execution.
- Require all three production controls:
  `ENABLE_PAGES_CMS_BACKUP_ROUTE=true`, a non-empty
  `PAGES_CMS_BACKUP_SECRET` matched in constant time against the dedicated
  request header, and `BACKUP_WRITES_QUIESCED=true` set only during the
  approved maintenance window.
- Return `404` for disabled or unauthenticated requests so the capability is
  not discoverable, `409` for an in-progress backup, and a generic `500` plus
  path/value-free operational code for other failures.
- Return only `ok`, snapshot basename, SQL/schema hashes, transactional and
  quiescence flags, row counts, private-storage copy status, byte totals, and
  pruning count. Never return absolute paths, database values, credentials, or
  raw exception messages.
- Do not add this temporary control to public/admin UI and do not audit the
  secret. The operation reads the database and writes a recovery artifact; it
  is not an admin CRUD mutation.

## Sprint 2B.4 — verification and production handoff

- Run the focused route-contract verifier after every slice.
- Run type checking/lint, the storage-engine backup/restore rehearsal, and the
  production build using local MySQL/storage only.
- Follow `.claude/skills/verify/SKILL.md` before declaring local readiness.
- Run an independent Standards + Spec review and resolve any blocking finding.
- Record exact production enable/trigger/verify/disable/clean-redeploy steps,
  but do not execute them until the owner separately approves the maintenance
  window and each production state change.

## Production sequence requiring later approvals

1. Agree an exact Bangkok date/time and expected write-free duration.
2. Build and deploy the temporary route without enabling it.
3. Enter maintenance, set the three production controls, and restart Passenger.
4. Trigger one POST, verify sanitized success metadata and snapshot files, then
   download the snapshot off-host and validate it without restoring production.
5. Unset the feature flag, secret, and quiescence confirmation; restart and
   verify the route is 404 before leaving maintenance.
6. Remove the route and temporary configuration documentation in code, deploy
   the clean artifact, and verify the route remains absent.
7. Only then seek separate approval for the InnoDB/foreign-key DDL gate.

## Rollback

Before production invocation, rollback is a normal code revert. During the
maintenance window, disable the feature flag and restart Passenger; no database
write has occurred. A failed or partial snapshot must never be presented under
the valid timestamp directory pattern. Snapshot deletion is a separate,
explicitly approved operator action because recovery artifacts are material.
