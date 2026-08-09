# MySQL driver/adapter recommendation — kkd_prop SQLite→MySQL migration

Resolves [Decide: Prisma + MySQL driver/adapter approach and schema compatibility review](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/3), a ticket on the [SQLite→MySQL migration map](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/1).

## Recommendation: `@prisma/adapter-mariadb` + `mariadb`

Keep the existing driver-adapter architecture in `src/lib/db.ts` — swap `@prisma/adapter-better-sqlite3` for `@prisma/adapter-mariadb` (version `7.8.0` exists, matching this project's exact Prisma version). Its only runtime dependency is the `mariadb` npm package (`3.4.5`), whose own description is "fast mariadb or **mysql** connector" — it's wire-protocol compatible with both engines, which matters here since the exact server (MySQL vs MariaDB) on the DirectAdmin panel wasn't confirmed by the panel-investigation ticket.

**Why this over Prisma's traditional `mysql` provider + no adapter:** this project is already committed to the driver-adapter model (Prisma 7's `prisma-client` generator, not the legacy `prisma-client-js` generator) — switching to a plain provider-string connection would mean reverting the generator choice project-wide, a much bigger change than swapping one adapter package for another. Staying on the adapter model keeps `src/lib/db.ts`'s shape almost identical: replace `PrismaBetterSqlite3({ url })` with the mariadb adapter's config object.

**Native compile impact — confirmed via `npm view`:** `mariadb` has zero native dependencies (no `binding.gyp` in it or any of its deps: `denque`, `lru-cache`, `iconv-lite`, `@types/*`). This is a real simplification over `better-sqlite3`, which needed the whole Docker-based Linux-build workaround because it shipped no prebuilt binary for Node 20's ABI.

## Docker build step: simplifiable, not removable

Checked every dependency in the project for native bindings (`find node_modules -iname binding.gyp`). Two hits besides `better-sqlite3`:

- **`sharp`** (transitive dep of `next@16.2.10`, used via `next/image` in `src/app/[locale]/home-content.tsx` and `src/components/site/brand-logo.tsx` — confirmed actually used, not dead weight). Sharp ships proper prebuilt Linux binaries via `@img/sharp-linux-x64` etc. (already present and working in the deploy artifact shipped this session — `deploy/dist/node_modules/@img/sharp-linux-x64`) — no `node-gyp`/compiler-toolchain step needed for it, unlike `better-sqlite3`.
- **`@parcel/watcher`** — a dev-only file-watcher dependency (Turbopack/Next dev tooling), not part of the traced production runtime, irrelevant to the deploy artifact.

**Conclusion**: the Docker-based Linux build itself is still needed — not for native compilation anymore, but because `.next/standalone`'s compiled server chunks bake in content-hash module references that only resolve against the exact `node_modules` tree traced at build time (the same root cause documented in `docs/plans/kkd-shared-hosting-deploy-guide.md` Sprint 2, item 5). A macOS-built `node_modules` still can't be swapped for a separately-installed Linux one.

**What *can* shrink**: `deploy/docker-build/Dockerfile.shared-hosting`'s AlmaLinux 8 + `gcc-toolset-12` base exists specifically for `better-sqlite3`'s node-gyp fallback compile (`-std=c++20` support). Once `better-sqlite3` is gone, a standard `node:20-slim`-style image should suffice — `npm ci` there will pull `mariadb` (pure JS) and `sharp`'s prebuilt Linux binaries with no compiler toolchain required. This is real deploy-pipeline simplification, to action in [Adapt deploy pipeline and E2E scripts for MySQL](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/7).

## Schema changes needed in `prisma/schema.prisma`

1. `datasource db { provider = "sqlite" }` → `provider = "mysql"`.
2. **Real risk found — several `String` fields need explicit `@db.Text`, or they'll silently truncate.** Prisma's MySQL default for a bare `String` field (no `@db.` annotation) is `VARCHAR(191)`. Cross-checking every model against its zod validation's actual max length:

   | Model.field | Validated max (zod) | Needs |
   |---|---|---|
   | `Lead.notes` | 1000 (`src/lib/validations/lead.ts`) | `@db.Text` |
   | `SurveyBooking.address` | 500 (`src/lib/validations/lead.ts`) | `@db.Text` or `@db.VarChar(500)` |
   | `Package.suitableTh` / `suitableEn` | 500 (`src/actions/packages.ts`) | `@db.Text` or `@db.VarChar(500)` |
   | `Service.descriptionTh` / `descriptionEn` | 2000 (`src/actions/services.ts`) | `@db.Text` |
   | `PortfolioProject.descriptionTh` / `descriptionEn` | 2000 (`src/actions/portfolio.ts`) | `@db.Text` |
   | `Testimonial.quoteTh` / `quoteEn` | 2000 (`src/actions/testimonials.ts`) | `@db.Text` |

   Every other `String` field (name, email, phone, slug, refCode, province, buildingTypeOtherText, referrerName, lineId, etc.) stays well under 191 chars per its own validation — no change needed.

3. **`Json` columns** (`Lead.interestedSystems`, `Service.featuresTh`/`featuresEn`, `Package.featuresTh`/`featuresEn`/`seasonalProduction`, `PortfolioProject.imageKeys`, `AuditLog.before`/`after`) — no schema syntax change. Prisma maps `Json` to MySQL's native `JSON` column type automatically for both providers.
4. **Enums** (`Role`, `LeadType`, `LeadStatus`, `BuildingType`, `TimeSlot`, `PaymentStatus`, `BookingStatus`, `ChannelType`, `ServiceKind`, `AuditAction`) — Prisma maps these to native MySQL `ENUM(...)` automatically, no code or schema changes needed. Worth knowing for later: MySQL enums are less flexible to extend (an `ALTER TABLE ... MODIFY` under the hood) — `prisma migrate dev`/`deploy` handles this transparently, not a blocker.
5. **`DateTime`** fields — Prisma defaults these to `DATETIME(3)` (millisecond precision) for MySQL; no explicit annotation needed. Verify precision is acceptable after the first `prisma migrate dev` run (no reason to expect an issue).
6. **`cuid()` ids** — generated by Prisma/application code, not the database — completely provider-agnostic, unaffected.
7. **`@@index`/`@unique` fields** — all short (email, slug, refCode, bookingNumber), well under any MySQL index-key-length limit regardless of MySQL version/row format. No risk.
8. **Minor cleanup, not blocking**: the generator block's `binaryTargets = ["native", "rhel-openssl-3.0.x"]` was already confirmed inert for this project (driver-adapter model produces no native/WASM query engine — see `docs/plans/kkd-shared-hosting-deploy-guide.md` Sprint 2, item 5). Safe to remove when touching this file, since it does nothing either way.

## Unblocks

This unblocks [Set up local MySQL via Docker Compose for dev](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/4) and [Migrate prisma/schema.prisma to MySQL](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/5) — both can now proceed with a concrete, decided approach instead of an open question.
