# Sprint 2A delete-guard deploy readiness

Date: 2026-08-26

## Authorization boundary

This checkpoint prepares and verifies a local release artifact only. It does not
authorize FTP upload, panel extraction, application restart, environment or
schema changes, database writes, maintenance mode, or remediation of the known
production orphan. Each production mutation requires a separate owner approval.

## Release scope

Production was last recorded as built from `72da1be` in
`admin-about-field-clarity-tasks.md`. The working `main` contains unrelated,
not-yet-released UI, database-readiness tooling, plans, and evidence, so building
directly from `main` would violate the requested guard-only scope.

Prepare the release in an isolated temporary worktree containing exactly:

1. baseline `72da1be`;
2. the source patch from `fa08277` (`src/actions/channels.ts`) only.

Do not include `9556090`, Pages CMS code or schema work, production orphan
remediation, or any other commit after the baseline. Record both the resulting
temporary release SHA and the source-tree diff before accepting the artifact.

## Readiness procedure

### 1. Baseline and impact gate

- Refresh `origin/main` and document its relationship to `main`.
- Prove that the isolated release differs from `72da1be` only in
  `src/actions/channels.ts`.
- Prove there is no Prisma migration, schema, dependency, environment, public
  content, storage, or bilingual-message change.
- Treat any extra tracked source file as NO-GO.

### 2. Local verification

- Run the focused linked-executive delete regression against loopback MySQL.
- Run the admin CRUD regression because the change affects an audited admin
  mutation.
- Build the isolated release with
  `scripts/build-shared-hosting-deploy.mts`, which uses the AlmaLinux 8 / Node
  20.20 production target.
- Start the built release locally and exercise the changed admin screen through
  the existing browser-driven regression. No production data may be used.

### 3. Artifact security and provenance

- Record the release SHA, Next build ID, ZIP byte size, and SHA-256 digest.
- Confirm the ZIP contains the compiled guard text and expected Linux native
  runtime.
- Confirm it contains no `.env*`, credentials, local database, `storage/`,
  `backups/`, user uploads, or repository metadata.
- Keep output sanitized; never commit secrets, cookies, panel paths, private
  records, or authenticated screenshots.

### 4. Production preflight and live verification

- Before any deployment approval, run only the read-only production smoke suite:
  public homepage, admin redirect, private-file denial, and unauthenticated admin
  API denial.
- The delete guard cannot be proven on production without an authenticated
  mutation attempt. Do not create a canary user/executive or attempt deletion
  until the owner separately authorizes that data mutation. Local production-mode
  browser verification is the pre-deploy behavioral proof.

### 5. Deployment and rollback checkpoint

If all local and read-only gates pass, report GO-for-approval, not deployed.
The owner must run the FTP upload command from the shared-hosting runbook. Panel
extraction and restart still require explicit approval. This code-only release
needs no migration, maintenance mode, or environment change.

Before upload, retain the last accepted artifact or prepare a reproducible
baseline artifact from `72da1be`. Rollback is: upload the accepted baseline ZIP,
extract, restart, then run the standard production smoke suite. A rollback does
not change the database and does not repair the existing orphan.

## GO / NO-GO criteria

GO-for-deploy-approval requires all of the following:

- isolated diff is exactly the guard source file;
- focused and admin CRUD regressions pass;
- Linux release build succeeds;
- artifact provenance and secret checks pass;
- read-only production smoke remains green;
- a baseline rollback artifact or reproducible baseline procedure is ready;
- known limitation is acknowledged: the existing production orphan remains.

Any scope drift, build/test failure, secret finding, changed production baseline,
or missing rollback path is NO-GO. Stop without uploading or mutating production.
