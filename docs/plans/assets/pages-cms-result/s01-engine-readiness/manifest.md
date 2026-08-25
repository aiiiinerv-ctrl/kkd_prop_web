# Sprint 1 evidence — engine readiness

## Before summary

- Fixed rollback point: `16f7792add5d85f4e0457efe257e68f8194d8118`.
- Authorized scope: Sprint 1 only; no production connection, inventory, DDL,
  content mutation, deployment, FTP, or `.htaccess` change.
- Intended surfaces: storage-engine verifier/contract, backup format, backup and
  restore safety, disposable rehearsal, conversion/recovery runbook, corrected
  MyISAM attribution, and a bilingual host-level maintenance artifact.
- Invariants at risk: audited entity + Audit Log atomicity; exact application
  table inventory; 11 relationships; zero orphans; dump integrity; failed
  restore rollback; private-storage opt-in; secret/PII-free evidence; TH/EN
  maintenance parity; no false-positive public/admin submission.
- Isolated targets: loopback database
  `kkd_prop_engine_rehearsal_test`; temporary directory created with prefix
  `kkd-prop-engine-rehearsal-`; synthetic Admin User/Audit Log rows only.
- Cleanup guard: database host must be loopback, name must start `kkd_prop_` and
  end `test` or `rehearsal`; temporary storage is a unique OS temp directory.
  Normal database/storage names are refused by rehearsal mutation paths.
- Faults: duplicate Audit Log insert after entity mutation; duplicate Audit Log
  statement after restore DELETE/INSERT operations; an unexpected table; a
  non-transactional backup without write-quiescence attestation.
- Host assumption: LiteSpeed honors Apache `ErrorDocument`, `mod_headers`, and
  `mod_rewrite` semantics. This remains unproved on the real host and is an
  explicit Sprint 2 gate, not silently treated as fact.
- Owner approval: repeated instruction to proceed after the committed sprint
  plan. Separate production approvals remain required.

## After summary

Implemented:

- `scripts/verify-storage-engine.mts` inventories engine support/default, exact
  tables, columns/indexes, exact row counts, 11 Foreign Keys, 11 orphan counts,
  and an isolated transaction fault. It outputs aggregate metadata and a stable
  SHA-256 signature only.
- `scripts/lib/storage-engine-contract.mts` is the checked table/FK/identifier
  source shared by verifier and rehearsal. Mutation mode refuses normal DB
  names and non-loopback hosts.
- `scripts/rehearse-storage-engine.mts` creates a schema-shaped MyISAM clone
  without business rows, proves RED, converts all 16 tables, adds 11 Foreign
  Keys, proves GREEN twice, exercises backup/restore faults, and cleans up.
- Backup now includes previously omitted `PromoLandingPath`, reads a
  transactional source under repeatable-read, requires explicit quiescence for
  MyISAM, and writes `schema-metadata.json` with hashes/engines/counts.
- Restore refuses legacy/mismatched/unknown SQL, verifies dump hash, exact table
  inventory, InnoDB engines, and all 11 Foreign Keys before its transaction.
- `deploy/maintenance/pages-cms-maintenance.html` is self-contained, noindex,
  CSP-restricted, form-free, bilingual, responsive, and dependency-free.
- `docs/plans/pages-cms-innodb-conversion-runbook.md` defines owner-controlled
  read-only inventory, maintenance, backup, conversion, verification, and
  recovery gates. ADR-0006, schema commentary, and the shared-hosting runbook
  now correctly attribute the 1000-byte limit to MyISAM.

Observed results:

- Three final rehearsals: MyISAM RED; InnoDB GREEN; restore rollback PASS;
  non-transactional backup and unknown-table guards PASS.
- Deterministic signature in every final run:
  `0249f206a1bbbb207fb6bec54cab423ef86df9e8ab45646cb3a1a39d3a54d540`.
- Conversion duration: 860–1751 ms; snapshot size: 6,827 bytes; table count 16;
  Foreign Key count 11; GREEN gate includes zero orphan relationships.
- Cleanup query returned zero matching disposable databases. Temporary storage
  was removed by the guarded `finally` path.
- Maintenance live-view: TH/EN desktop/mobile PASS; GET, public POST, and admin
  POST all returned 503 in the host-contract simulation.
- `npx tsc --noEmit`, focused ESLint on every changed script, `git diff
  --check`, and escalated `npm run build` passed. A read-only gate against the
  local application DB reported 16 tables, 11 Foreign Keys, zero orphans, and
  `ENGINE_GATE=GREEN`.
- Booking, admin auth, admin CRUD/public propagation, channel tracking, and
  audit invariant E2Es passed against `next start`.

Full-pipeline deviation:

- `scripts/verify-all.mts` stopped before build because
  `scripts/verify-enums.mts` already flags `READ_ONLY_LEAD_ROLES` in
  `src/app/admin/(dashboard)/admin-sidebar.tsx` as a locally declared enum
  array. The file is identical to fixed point `16f7792` and outside Sprint 1;
  it was not changed. Build and remaining suites were therefore run separately.
- First sandboxed build could not reach Google Fonts; the approved networked
  rerun compiled and finished TypeScript successfully. The existing NFT tracing
  warning for local storage remains unchanged.
- An early global `npm run lint` passed. A later run after production/deploy
  artifacts existed scanned ignored compiled JavaScript under `deploy/dist` and
  `static-preview` and failed on generated `require()`/minified code. No source
  finding came from the changed files; focused ESLint on all changed scripts
  passed. Generated artifacts were preserved rather than deleted or edited.

## Screenshot manifest

- `maintenance-th-desktop.png` — 1440 × 900, Thai default state.
- `maintenance-en-desktop.png` — 1440 × 900, English state.
- `maintenance-th-mobile.png` — 390 × 844, Thai mobile state.
- `maintenance-en-mobile.png` — 390 × 844, English mobile state.

## Residual risk and next owner checkpoint

- No production state was read or changed. Production remains MyISAM and Pages
  CMS writes remain blocked by the implementation plan.
- The real host's maintenance interception, InnoDB availability/configuration,
  live table inventory, orphan counts, free space, conversion timing, and
  executable production backup path remain unknown.
- Next checkpoint is approval for Sprint 2 **read-only production inventory
  only**. It does not authorize maintenance activation, DDL, restore, deploy,
  FTP, or production content mutation.

## Rollback

Revert only the Sprint 1 implementation/docs commits from the fixed point. No
database/storage rollback is required because all runtime mutations were
guarded disposable targets and cleanup is verified; production was untouched.
