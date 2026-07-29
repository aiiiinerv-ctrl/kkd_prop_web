/**
 * build-shared-hosting-deploy.mts — assemble the FTP/File-Manager upload
 * artifact for the DirectAdmin + CloudLinux Node.js Selector shared-hosting
 * deploy target (kkdproperty.co.th). See
 * docs/plans/kkd-shared-hosting-deploy-guide.md for the full feasibility
 * writeup this script executes against.
 *
 * IMPORTANT — this does NOT just copy `.next/standalone/` wholesale.
 * Next's output-file-tracing for this project's `output: "standalone"`
 * build was observed (Sprint 1, local verification) to mirror the ENTIRE
 * project root into `.next/standalone/` — including `.env` (real local
 * secrets), `storage/private/slips/*` (real customer payment-slip images),
 * `backups/*` (DB + private-storage snapshots), plus docs/screenshots/
 * static-preview/Dockerfile/etc that have nothing to do with running the
 * app. Blindly zipping `.next/standalone/` as-is would leak customer PII
 * and local secrets into the deploy artifact. This script instead copies an
 * explicit allowlist of exactly what the Passenger-run app needs:
 *
 *   - .next/standalone/node_modules/   (traced runtime deps incl. the
 *                                        compiled better-sqlite3 native
 *                                        binary and the Prisma adapter)
 *   - .next/standalone/package.json
 *   - .next/standalone/server.js       (Next's own standalone entry point —
 *                                        try this as the Passenger startup
 *                                        file first, per the deploy guide)
 *   - .next/standalone/.next/          (compiled server output, excluding
 *                                        the wholesale project mirror)
 *   - .next/static/          -> staged as .next/static/  (NOT included in
 *                                standalone output automatically, per
 *                                Next's docs — static assets 404 without
 *                                this)
 *   - public/                -> staged as public/
 *   - prisma/schema.prisma, prisma/migrations/  (NOT prisma/dev.db — the
 *                                dev SQLite file must never ship)
 *   - src/generated/prisma/  (generated Prisma client, incl. binaryTargets
 *                                per schema.prisma)
 *   - deploy/app.js           (Passenger fallback wrapper, only needed if
 *                                server.js doesn't work as the startup file
 *                                — included anyway so it's available
 *                                on-panel without a second upload)
 *
 * Deliberately EXCLUDED even though present under `.next/standalone/`:
 *   .env, storage/, backups/, docs/, screenshots/, static-preview/,
 *   Dockerfile, docker-entrypoint.sh, fly.toml, firebase.json,
 *   AGENTS.md/CLAUDE.md/CONTEXT.md/README.md, eslint/postcss/tsconfig,
 *   components.json, package-lock.json, next.config.ts, next-env.d.ts.
 * None of these are needed to run the app under Passenger, and several
 * (`.env`, `storage/`, `backups/`) are actively sensitive.
 *
 * Usage:
 *   npm run build                              # produces .next/standalone,
 *                                               # .next/static
 *   npx prisma generate                        # produces src/generated/prisma
 *   npx tsx scripts/build-shared-hosting-deploy.mts
 *
 * Output:
 *   deploy/dist/                — staged directory, ready to upload as-is
 *                                  via FTP, or zip manually
 *   deploy/dist.zip             — same contents zipped, if the `zip` CLI is
 *                                  available (skipped with a warning if not)
 *
 * Both `deploy/dist/` and `deploy/dist.zip` are build output, not source —
 * see .gitignore.
 */
import { existsSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const STANDALONE_DIR = path.join(ROOT, ".next", "standalone");
const STANDALONE_NEXT_DIR = path.join(STANDALONE_DIR, ".next");
const STATIC_DIR = path.join(ROOT, ".next", "static");
const GENERATED_PRISMA_DIR = path.join(ROOT, "src", "generated", "prisma");
const DIST_DIR = path.join(ROOT, "deploy", "dist");
const ZIP_PATH = path.join(ROOT, "deploy", "dist.zip");

function fail(message: string): never {
  console.error(`✗ build-shared-hosting-deploy: ${message}`);
  process.exit(1);
}

function requireExists(p: string, hint: string) {
  if (!existsSync(p)) {
    fail(`missing ${p} — ${hint}`);
  }
}

function copyInto(src: string, destRelative: string) {
  const dest = path.join(DIST_DIR, destRelative);
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`  copied ${path.relative(ROOT, src)} -> deploy/dist/${destRelative}`);
}

console.log("Starting shared-hosting deploy artifact assembly...");

// 1. Preconditions.
requireExists(
  STANDALONE_DIR,
  'run "npm run build" first (requires output: "standalone" in next.config.ts)'
);
requireExists(STANDALONE_NEXT_DIR, "unexpected: .next/standalone/.next missing after build");
requireExists(
  path.join(STANDALONE_DIR, "server.js"),
  "unexpected: standalone output missing server.js"
);
requireExists(
  path.join(STANDALONE_DIR, "node_modules"),
  "unexpected: standalone output missing traced node_modules"
);
requireExists(
  path.join(STANDALONE_DIR, "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node"),
  "better-sqlite3 native binary not found in traced output — serverExternalPackages tracing may have broken"
);
requireExists(STATIC_DIR, 'run "npm run build" first — .next/static missing');
requireExists(
  GENERATED_PRISMA_DIR,
  'run "npx prisma generate" first — src/generated/prisma missing'
);
requireExists(path.join(ROOT, "prisma", "schema.prisma"), "prisma/schema.prisma missing");
requireExists(path.join(ROOT, "deploy", "app.js"), "deploy/app.js missing");

// 2. Clean staging directory.
rmSync(DIST_DIR, { recursive: true, force: true });
mkdirSync(DIST_DIR, { recursive: true });

// 3. Copy the explicit allowlist (see header comment for why NOT a wholesale
//    copy of .next/standalone/).
copyInto(path.join(STANDALONE_DIR, "node_modules"), "node_modules");
copyInto(path.join(STANDALONE_DIR, "package.json"), "package.json");
copyInto(path.join(STANDALONE_DIR, "server.js"), "server.js");
copyInto(STANDALONE_NEXT_DIR, ".next");
copyInto(STATIC_DIR, path.join(".next", "static"));
copyInto(path.join(ROOT, "public"), "public");
copyInto(path.join(ROOT, "prisma", "schema.prisma"), path.join("prisma", "schema.prisma"));
const migrationsDir = path.join(ROOT, "prisma", "migrations");
if (existsSync(migrationsDir)) {
  copyInto(migrationsDir, path.join("prisma", "migrations"));
} else {
  console.warn("  ⚠ prisma/migrations not found — skipping (no migrations to ship yet?)");
}
copyInto(GENERATED_PRISMA_DIR, path.join("src", "generated", "prisma"));
copyInto(path.join(ROOT, "deploy", "app.js"), "app.js");

// 4. Sanity check: nothing sensitive leaked in via the copies above (belt
//    and suspenders — the allowlist above should already guarantee this).
for (const forbidden of [".env", "storage", "backups"]) {
  if (existsSync(path.join(DIST_DIR, forbidden))) {
    fail(
      `staged artifact unexpectedly contains "${forbidden}" — aborting before zipping to avoid leaking it. Investigate the allowlist above.`
    );
  }
}

// 5. Zip, if the `zip` CLI is available. Otherwise leave the staged
//    directory for manual zipping / direct FTP upload.
rmSync(ZIP_PATH, { force: true });
const zipCheck = spawnSync("zip", ["-v"], { stdio: "ignore" });
if (zipCheck.error) {
  console.warn(
    '  ⚠ "zip" CLI not found on PATH — skipping zip step. deploy/dist/ is ready to upload as-is or zip manually.'
  );
} else {
  const zipResult = spawnSync("zip", ["-rq", ZIP_PATH, "."], { cwd: DIST_DIR, stdio: "inherit" });
  if (zipResult.status !== 0) {
    fail(`zip command failed with exit code ${zipResult.status}`);
  }
  console.log(`✓ zipped deploy/dist/ -> ${path.relative(ROOT, ZIP_PATH)}`);
}

console.log(`✓ build-shared-hosting-deploy: artifact staged at ${path.relative(ROOT, DIST_DIR)}`);
console.log(
  "  Reminder: env vars (DATABASE_URL, AUTH_SECRET, RESEND_API_KEY, LINE tokens, STORAGE_ROOT)"
);
console.log("  are set via the panel's Node.js Selector env-var UI, never bundled in this artifact.");
