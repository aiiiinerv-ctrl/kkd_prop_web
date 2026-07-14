---
name: verify
description: Verify a code change in the kkd_prop website end-to-end before declaring it done. Use after any change to src/, prisma/, or messages/ — build passing alone is NOT verification.
---

# Verify a change (kkd_prop)

A change is "done" only when every applicable step below has produced the stated evidence. Work top-down; stop and fix at the first failure.

## 1. Static checks (always)

```bash
npm run build
```

**Exit criteria:** `✓ Compiled successfully` **and** `Finished TypeScript` with no errors. A compile-only pass with type errors is a failure.

## 2. Production smoke (always for src/ changes)

```bash
npm run start &   # production mode catches proxy/static issues dev hides
```

- Touched a public page → `curl` or open **both** `/th/<page>` and `/en/<page>`; confirm the change appears in **both locales**.
- Touched admin → log in at `/admin` and exercise the changed screen.

**Exit criteria:** the change is visible in the real rendered page(s), not just in code.

## 3. Behavior checks (pick what the change touches)

| Changed area | Required check | Evidence |
| --- | --- | --- |
| Lead forms / submit actions | `npx tsx scripts/e2e-booking.mts` | both `✓` lines |
| Auth, guards, /files route | `npx tsx scripts/e2e-admin.mts` | all `✓` lines incl. slip 200 |
| Admin CRUD, leads pipeline, audit | `npx tsx scripts/e2e-admin-crud.mts` | all `✓` lines |
| Prisma schema | `npx prisma migrate dev` + `npx prisma db seed` | migration applies, seed stays idempotent |
| messages/*.json | grep the new key in **both** th.json and en.json | key exists in both |
| Notifications | submit a lead with notify env unset | server log shows "no providers configured", submit still succeeds |

Touching more than one of the above (or unsure which apply)? Run the whole pipeline in one shot instead of chaining commands by hand:

```bash
npx tsx scripts/verify-all.mts
```

This runs steps 1-3 for all three e2e suites together (build → production server → booking → admin → admin-crud), kills the server on exit, and fails loud on the first broken suite. It does not replace the Prisma/messages/notifications checks above when those areas are touched.

## 4. Anti-rationalization table

| Excuse | Counter |
| --- | --- |
| "It's a one-line change, build is enough" | One-line changes broke tabbed forms before (keepMounted). Run step 2. |
| "Dev server showed it working" | Dev hides proxy/static/caching issues. Production mode is the check. |
| "I only changed Thai text" | Then the EN key is now stale — check both files anyway. |
| "The E2E scripts are slow" | Each runs < 30s against system Chrome. Slower is shipping a broken lead form. |
| "TypeScript passed so it works" | Types don't test revalidation, auth guards, or file serving. |

## 5. Report

State what was run and what was observed (paste the ✓ lines / status codes). If any step was skipped, say so explicitly and why — never imply full verification.
