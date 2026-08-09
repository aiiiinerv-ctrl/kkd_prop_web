/**
 * build-shared-hosting-deploy.mts — assemble the FTP/File-Manager upload
 * artifact for the DirectAdmin + CloudLinux Node.js Selector shared-hosting
 * deploy target (kkdproperty.co.th). See
 * docs/plans/kkd-shared-hosting-deploy-guide.md for the full feasibility
 * writeup this script executes against.
 *
 * BUILDS VIA DOCKER, NOT LOCALLY. A live test against the real panel
 * (Sprint 2, 2026-08-08) found that a local macOS build's `node_modules`
 * cannot simply be swapped for a separately-`npm install`-ed Linux one on
 * the panel: `.next/standalone`'s server chunks bake in content-hashed
 * module references (e.g. `@prisma/adapter-mariadb-<hash>`) that only
 * resolve against the exact `node_modules` tree Next traced at build time.
 * The whole build — `npm ci`, `prisma generate`, `next build` — must
 * therefore happen on the same OS/arch/Node-ABI as the panel. This script
 * runs `deploy/docker-build/Dockerfile.shared-hosting` (AlmaLinux 8, Node
 * 20.20.0 — see that file's header for why the database migration to MySQL,
 * wayfinder map #1, dropped the gcc-toolset-12 compiler toolchain that used
 * to live there) and copies the resulting `.next/standalone`, `.next/static`,
 * and `src/generated/prisma` out of the container into `deploy/linux-build/`
 * before assembling the upload artifact from there. This also means
 * `sharp`'s prebuilt native binary is guaranteed to match the panel's Linux
 * target every build, same as it did before.
 *
 * Requires the local docker-compose MySQL (`docker compose up -d mysql`)
 * running before this script — the build reaches it via
 * `host.docker.internal` (the port docker-compose.yml already publishes to
 * the host) so `prisma migrate deploy` inside the build has a real database
 * to apply the schema to (unlike SQLite, a bare file path needed no running
 * server for this step).
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
 *   - .next/standalone/node_modules/   (traced runtime deps incl. sharp's
 *                                        prebuilt native binary and the
 *                                        Prisma MySQL adapter)
 *   - .next/standalone/package.json
 *   - .next/standalone/server.js       (Next's own standalone entry point —
 *                                        confirmed live, Sprint 2, to work
 *                                        directly as the Passenger startup
 *                                        file — no wrapper needed)
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
 *   - deploy/app.js           (Passenger fallback wrapper — not needed per
 *                                the Sprint 2 live test, kept as a documented
 *                                fallback only, available on-panel without a
 *                                second upload)
 *
 * Deliberately EXCLUDED even though present under `.next/standalone/`:
 *   .env, storage/, backups/, docs/, screenshots/, static-preview/,
 *   Dockerfile, docker-entrypoint.sh, fly.toml, firebase.json,
 *   AGENTS.md/CLAUDE.md/CONTEXT.md/README.md, eslint/postcss/tsconfig,
 *   components.json, package-lock.json, next.config.ts, next-env.d.ts.
 * None of these are needed to run the app under Passenger, and several
 * (`.env`, `storage/`, `backups/`) are actively sensitive.
 *
 * IMPORTANT — file names containing `[` `]` (Next's dynamic-route
 * convention: `[locale]`, `[id]`, `[turbopack]_runtime.js`, etc.) need
 * `curl --globoff` (or equivalent) when uploading over FTP — plain `curl`
 * parses `[...]` in a URL as a glob range and silently drops those files.
 * Confirmed live, Sprint 2: 226 such files failed to upload silently
 * without this flag, breaking every dynamic route.
 *
 * Usage:
 *   npx tsx scripts/build-shared-hosting-deploy.mts
 *   # Docker must be running. No separate "npm run build" needed — this
 *   # script does the full build itself, inside the container.
 *
 * Output:
 *   deploy/linux-build/          — raw Docker build output (standalone/,
 *                                  static/, generated-prisma/), Linux-native
 *   deploy/dist/                — staged directory, ready to upload as-is
 *                                  via FTP, or zip manually
 *   deploy/dist.zip             — same contents zipped, if the `zip` CLI is
 *                                  available (skipped with a warning if not)
 *
 * `deploy/linux-build/`, `deploy/dist/`, and `deploy/dist.zip` are all build
 * output, not source — see .gitignore.
 */
import { existsSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DOCKERFILE = path.join(ROOT, "deploy", "docker-build", "Dockerfile.shared-hosting");
const IMAGE_TAG = "kkd-shared-hosting-build";
const LINUX_BUILD_DIR = path.join(ROOT, "deploy", "linux-build");
const STANDALONE_DIR = path.join(LINUX_BUILD_DIR, "standalone");
const STANDALONE_NEXT_DIR = path.join(STANDALONE_DIR, ".next");
const STATIC_DIR = path.join(LINUX_BUILD_DIR, "static");
const GENERATED_PRISMA_DIR = path.join(LINUX_BUILD_DIR, "generated-prisma");
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

// 0. Build inside a Linux container matching the panel (AlmaLinux 8, x64,
//    Node 20.20.0) — see file header for why this can't be a local macOS
//    build. Requires Docker running (OrbStack/Docker Desktop/etc).
requireExists(DOCKERFILE, "deploy/docker-build/Dockerfile.shared-hosting is missing");
console.log("Building inside Linux container (this can take a few minutes)...");
const dockerInfo = spawnSync("docker", ["info"], { stdio: "ignore" });
if (dockerInfo.status !== 0) {
  fail("Docker is not running — start Docker/OrbStack and retry");
}
// The build's `prisma migrate deploy` step reaches the local docker-compose
// MySQL via `host.docker.internal` (see the Dockerfile's header comment) —
// no special --network flag needed, since that's just the host's published
// port, not a custom Docker network.
const dockerBuild = spawnSync(
  "docker",
  ["build", "--platform", "linux/amd64", "-f", DOCKERFILE, "-t", IMAGE_TAG, ROOT],
  { stdio: "inherit" }
);
if (dockerBuild.status !== 0) {
  fail(`docker build failed with exit code ${dockerBuild.status}`);
}

const containerName = `${IMAGE_TAG}-extract`;
spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" }); // clean up any stale container
const dockerCreate = spawnSync(
  "docker",
  ["create", "--platform", "linux/amd64", "--name", containerName, IMAGE_TAG],
  { stdio: "inherit" }
);
if (dockerCreate.status !== 0) {
  fail(`docker create failed with exit code ${dockerCreate.status}`);
}

rmSync(LINUX_BUILD_DIR, { recursive: true, force: true });
mkdirSync(LINUX_BUILD_DIR, { recursive: true });
for (const [containerPath, hostDir] of [
  ["/app/.next/standalone", STANDALONE_DIR],
  ["/app/.next/static", STATIC_DIR],
  ["/app/src/generated/prisma", GENERATED_PRISMA_DIR],
] as const) {
  const cp = spawnSync("docker", ["cp", `${containerName}:${containerPath}`, hostDir], {
    stdio: "inherit",
  });
  if (cp.status !== 0) {
    spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
    fail(`docker cp ${containerPath} failed with exit code ${cp.status}`);
  }
}
spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
console.log(`✓ Linux build extracted to ${path.relative(ROOT, LINUX_BUILD_DIR)}`);

// 1. Preconditions.
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
  path.join(STANDALONE_DIR, "node_modules", "@img", "sharp-linux-x64", "lib", "sharp-linux-x64.node"),
  "sharp's native binary not found in traced output — serverExternalPackages tracing may have broken"
);
requireExists(STATIC_DIR, "unexpected: docker cp of .next/static failed silently");
requireExists(
  GENERATED_PRISMA_DIR,
  "unexpected: docker cp of src/generated/prisma failed silently"
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
copyInto(path.join(ROOT, "prisma.config.ts"), "prisma.config.ts");
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
