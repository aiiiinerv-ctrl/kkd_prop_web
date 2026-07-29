# KKD PROPERTY — Shared Hosting (DirectAdmin + CloudLinux Node.js Selector) Deploy Feasibility

Status: **DRAFT — feasibility assessment only, no deploy executed**

## Scope note — do not confuse with the VPS plan

`docs/plans/kkd-production-host-mapping.md` was written when `27.254.62.185` was believed to be a
**raw VPS** (self-managed Docker/PM2, root SSH access). That belief is now understood to be
**wrong** for this target: the same IP hosts a **DirectAdmin control panel**
(`http://27.254.62.185:4229`, username `kkdprop1`) with the **CloudLinux "Node.js Selector"**
plugin — a fundamentally different deployment model (Passenger-managed app, panel-driven npm
install/restart, likely no SSH). The two plans are **not interchangeable** and this document does
not edit or supersede the VPS plan — that decision is still open pending the user picking one
target.

## Verification status disclaimer

**No login to the DirectAdmin panel was attempted in this session** — no password was provided,
and per the security rule for this task, credentials are never guessed or requested to be typed
into a file. Every claim below is tagged:

- **[VERIFIED — repo]**: confirmed by reading this project's actual `package.json`,
  `prisma.config.ts`, `prisma/schema.prisma`, `next.config.ts`, `Dockerfile` in
  `/Users/ainerv/react_native_projects/kkd_prop/`.
- **[GENERAL KNOWLEDGE — unverified against this panel]**: standard, well-documented behavior of
  cPanel/DirectAdmin CloudLinux Node.js Selector (Phusion Passenger-based), not confirmed against
  this specific DirectAdmin install, its DirectAdmin/CloudLinux version, or its actual resource
  limits.

Anything marked general-knowledge **must be confirmed by an actual panel login** (Node.js Selector
page → available Node versions, "Run NPM Install" button, env var UI, restart button, File
Manager/FTP quota) before committing to this deploy path.

---

## 1. Node.js version support vs. Next.js 16 requirement

- **[VERIFIED — repo]** `node_modules/next/package.json` declares
  `"engines": { "node": ">=20.9.0" }`. This project's `package.json` has no `engines` field of its
  own, so Next's floor is the effective minimum — **Node 20.9+ required**, ideally the same 20.x
  LTS line (or newer) used in the existing `Dockerfile` (`node:20-bookworm-slim`).
- **[GENERAL KNOWLEDGE — unverified]** CloudLinux Node.js Selector typically ships a matrix of
  Node versions (commonly includes 16/18/20/22, sometimes newer, depending on how recently the
  hosting provider updated the CloudLinux base image / alt-nodejs packages). Node 20.x LTS is
  broadly available on most Node.js Selector installs as of 2024+, but **this is not confirmed for
  `kkdprop1`'s specific panel** — older/budget shared-hosting nodes can lag behind and cap out at
  Node 18 or even 16.
- **Action required before go**: log into DirectAdmin → Node.js Selector (a.k.a. "Setup Node.js
  App") and confirm a **Node ≥ 20.9** option exists in the version dropdown. If only ≤18 is
  available, this deploy path is blocked outright (Next 16 will refuse to boot).

## 2. Passenger entry point convention

- **[GENERAL KNOWLEDGE — unverified]** cPanel/DirectAdmin Node.js Selector runs apps under
  **Phusion Passenger**, not a bare `node` process. Passenger's Node integration does **not**
  invoke `npm start` / `next start` directly — it expects an **application startup file**
  (configurable in the panel, default name usually `app.js`) that Passenger requires and that must
  either:
  - call `app.listen()` on the port Passenger injects via the `PORT` env var (Passenger sets this
    per-app), or
  - for some Passenger versions, communicate over a Unix domain socket Passenger provides instead
    of a TCP port — the exact contract depends on the Passenger version bundled with this
    CloudLinux install.
  Next.js's built-in `next start` server binds directly and works fine as a plain Node HTTP
  server, so a **thin wrapper file is required**, roughly:

  ```js
  // app.js — Passenger entry point, NOT next start directly
  const { createServer } = require("node:http");
  const next = require("next");

  const app = next({ dev: false, dir: __dirname });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    createServer((req, res) => handle(req, res)).listen(
      process.env.PORT || 3000,
      () => console.log("ready")
    );
  });
  ```

  This requires either `output: "standalone"` (see §4) with the generated `server.js` renamed/
  aliased to whatever filename Passenger expects, or a custom server using the `next` package
  directly as shown above (note: custom servers are supported by Next but opt you out of some
  automatic optimizations — acceptable for this low-traffic use case).
- **Action required before go**: confirm in the panel (a) the exact filename Passenger expects for
  this app slot, (b) whether it injects `PORT` or expects a Unix socket, (c) the Passenger version
  in use (visible in Node.js Selector app details) to validate the listen contract.

## 3. `better-sqlite3` native module compilation

- **[VERIFIED — repo]** `@prisma/adapter-better-sqlite3` + `better-sqlite3@12.11.1` are direct
  dependencies (`package.json`), and `better-sqlite3`'s own `package.json` install script is
  `prebuild-install || node-gyp rebuild --release` — i.e. it **first tries to download a
  prebuilt binary** matching the running Node ABI/platform/arch from GitHub Releases, and **only
  falls back to compiling from source with node-gyp** (needs Python, `make`, `g++`) if no matching
  prebuilt exists.
- **[GENERAL KNOWLEDGE — unverified]** Node.js Selector's "Run NPM Install" button executes
  `npm install` inside the app's virtualenv on the actual server, with outbound internet access
  (needed anyway to hit the npm registry) — so the `prebuild-install` download step has a
  realistic chance of succeeding **if** the server is a standard glibc-based Linux x64 host (most
  CloudLinux shared hosting is CentOS/AlmaLinux-based glibc, which matches `better-sqlite3`'s
  common prebuilt targets). Whether the compiler toolchain (`python3`, `make`, `g++`) is present
  as a **fallback** if the prebuilt download fails (e.g. outbound GitHub blocked, or an unusual
  Node ABI without a matching prebuilt) is **not confirmed** — CloudLinux shared environments
  frequently restrict or omit build tooling from user-facing shells specifically to prevent
  arbitrary compilation.
- **Mitigation if compilation is unavailable**: pre-compile `better-sqlite3`'s native binary
  locally (or in a Docker container matching the target OS/arch/glibc + exact Node ABI) and upload
  the compiled `.node` file into `node_modules/better-sqlite3/build/Release/` via FTP/File
  Manager, skipping the install-time compile step entirely. This requires knowing the panel's
  exact OS (e.g. AlmaLinux 8/9), CPU arch, and Node ABI version — **all unverified**, must be
  obtained from the panel (Node.js Selector usually shows Node version; OS can be inferred from
  DirectAdmin's "Server Information" if that page exists for this account, or asked of the host).
- **Action required before go**: attempt "Run NPM Install" via the panel on a first deploy and
  check for `node-gyp`/`prebuild-install` errors in its log. If it fails, plan for the pre-compiled
  binary upload path above, or evaluate swapping to a pure-JS SQLite driver as a fallback (would
  require a Prisma adapter change — out of scope unless this path is confirmed blocked).

## 4. Deploy mechanism — no SSH/git, FTP (port 2121) / File Manager only

- **[VERIFIED — repo]** current `next.config.ts` has **no `output: "standalone"`**, and the
  existing `Dockerfile` copies the **entire** `node_modules` + `.next` into the runtime image —
  fine for a Docker build context, but node_modules easily runs into the hundreds of MB to 1GB+,
  which is a poor fit for FTP upload to shared hosting (often slow, sometimes file-count or quota
  limited).
- **Recommended change for this target specifically** (not yet made — flag for a follow-up task,
  do not silently add to unrelated `next.config.ts` without user confirmation since it changes the
  production artifact shape): set `output: "standalone"` in `next.config.ts`. This makes
  `next build` emit `.next/standalone/` containing only a **traced, minimal `node_modules`**
  (only the packages actually reachable at runtime) plus a generated `server.js`, cutting upload
  size dramatically. Static assets (`.next/static/`, `public/`) must be copied alongside per
  Next's standalone-output docs, since standalone mode does not bundle them automatically.
  `better-sqlite3`'s native binary is a `serverExternalPackages` entry already
  (`next.config.ts:10`), which output-tracing generally respects and copies rather than bundles —
  needs a local trial build to confirm not just this document's assertion.
- **Suggested local build + upload flow**:
  1. Build **locally** (or in CI) with `output: "standalone"` targeting the same OS/arch as the
     panel (ideally inside a Docker container matching CloudLinux's base OS, to get a compatible
     `better-sqlite3` binary per §3).
  2. Zip `.next/standalone/`, `.next/static/` (copied into `standalone/.next/static/`), `public/`,
     `prisma/` (schema + migrations, not the dev DB), `src/generated/prisma` (see §5).
  3. Upload the zip via DirectAdmin File Manager (usually supports server-side unzip, avoiding a
     slow file-by-file FTP transfer of thousands of small `node_modules` files) — **File Manager
     unzip availability is unverified**, fall back to FTP (port 2121, as given) with an FTP client
     that supports resumable/parallel transfer if not.
  4. Set the app's Passenger entry point to the generated `server.js` (or the `app.js` wrapper from
     §2 if `server.js`'s listen contract doesn't match what Passenger expects — needs on-panel
     trial).
  5. Use the panel's **restart** button (Node.js Selector apps universally expose a restart
     action **[GENERAL KNOWLEDGE]**) after every upload — Passenger does not hot-reload on file
     change by default in this mode.
- **Risk**: iterating via FTP/zip-reupload is slow and manual compared to `git push` or CI/CD —
  every fix-and-redeploy cycle is a full rebuild-locally → zip → upload → unzip → restart loop.
  No git-based deploy hook was mentioned as available; if DirectAdmin's Git integration
  (some DirectAdmin installs have a "Git Version Control" feature panel) is present, that would
  be a materially better flow — **unverified, worth checking in the panel** since it would replace
  most of this FTP process with `git push` + panel-triggered `npm install`/build.

## 5. Prisma 7 client generation — binary target for the shared host platform

- **[VERIFIED — repo]** `prisma/schema.prisma`'s `generator client` block currently has no
  `binaryTargets` array set (defaults to detecting the local dev machine's platform at `generate`
  time), and the client outputs to `src/generated/prisma` (per `AGENTS.md`/schema). The existing
  Dockerfile generates the client **inside** the `node:20-bookworm-slim` build stage, i.e. matching
  glibc/Debian — that generated client is **not portable** to a different OS/libc target as-is.
- **[GENERAL KNOWLEDGE — unverified]** Prisma's engine binaries are platform+libc specific
  (e.g. `debian-openssl-3.0.x` for glibc Debian/Ubuntu, `linux-musl-openssl-3.0.x` for Alpine,
  `rhel-openssl-3.0.x` for RHEL/CentOS/AlmaLinux-family — CloudLinux is RHEL-derived, so
  `rhel-openssl-*` is the more likely correct target, not `linux-musl` as speculated in the task
  brief, which is an Alpine-family target). The exact required target string depends on the
  panel's actual OS and OpenSSL version — **unverified**.
- **Required change if this path proceeds**: add an explicit `binaryTargets` array to the
  `generator client` block in `schema.prisma` (Prisma 7 config for datasource URL/migration path
  lives in `prisma.config.ts` per this repo's convention, but `binaryTargets` is a
  schema-level generator setting, not a `prisma.config.ts` setting — confirm this hasn't changed in
  the installed `prisma@7.8.0` version before assuming). Set it to the confirmed target(s), e.g.
  `["rhel-openssl-3.0.x"]` once verified, and run `npx prisma generate` **either on a machine/
  container matching that target, or with `PRISMA_CLI_QUERY_ENGINE_TYPE`/cross-generation flags**
  so the uploaded `src/generated/prisma` folder contains the right engine binary — Prisma supports
  listing multiple targets to generate a multi-platform client bundle if local-vs-server platform
  differs and cross-compiling locally is preferred over building inside a matching container.
- **Action required before go**: determine the panel's OS/distro and OpenSSL major version
  (SSH-less: ask the hosting provider directly, or infer from Node.js Selector app logs after a
  first failed Prisma engine load, which usually names the missing binary target explicitly).

## 6. Environment variables / secrets

- **[GENERAL KNOWLEDGE — unverified]** cPanel/DirectAdmin Node.js Selector apps commonly expose an
  **"Environment Variables" key/value UI** in the app's setup page (separate from an actual `.env`
  file on disk) that Passenger injects into the process environment at start. This is the
  **correct place** for `DATABASE_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, LINE Notify tokens, etc. —
  **do not upload a `.env` file via FTP/File Manager**, both because it duplicates config in two
  places (drift risk) and because a `.env` sitting in a web-server-adjacent directory on shared
  hosting is a real leak risk if the app root is ever misconfigured to serve static files from
  that directory.
- This matches the project's existing rule (`AGENTS.md`): **never write secrets into files** —
  the panel's env var UI is the shared-hosting equivalent of Fly.io's `fly secrets set` and should
  be treated the same way operationally.
- `DATABASE_URL` for SQLite is a file path, not a network secret, but should still go through the
  same env var UI for consistency and to keep the path configurable per-environment (matches
  `prisma.config.ts:11`, which already reads it from `env("DATABASE_URL")`).
- `STORAGE_ROOT` (for `src/lib/storage/`, per `AGENTS.md`) must point to a **persistent** directory
  outside anything Passenger might wipe on redeploy — confirm with the host whether the app's
  working directory persists across "Run NPM Install"/restart cycles, or whether uploads need to
  live in a separate, explicitly-persistent path.
- **Action required before go**: confirm the env var UI exists for this specific Node.js Selector
  app instance (some very old panel versions only support `.env` file uploads) and confirm which
  directory persists reliably across restarts for `STORAGE_ROOT` + the SQLite DB file.
- **[Non-blocker, added after `deploy-verify` review — unverified]** Also confirm **how** the
  panel's env-var UI actually stores those values at runtime: some Node.js Selector
  implementations write the key/value pairs into a plain-text file inside the app's own directory
  tree (e.g. a generated `.env` or an Apache/Passenger config snippet) rather than injecting them
  purely into the process environment with no on-disk trace. If the panel persists them to a file
  that is (a) inside the FTP-visible app root and (b) not covered by the docroot-exclusion check in
  the item below, that file carries the **same exposure risk as uploading a `.env` manually** —
  i.e. this UI is not automatically safer than a file, it depends on where the panel puts the
  file it generates. Check this directly in the panel (look at the app directory via File
  Manager/FTP after saving an env var) before treating it as equivalent to Fly's `fly secrets set`.

## 7. Private storage (`storage/private/slips/...`) — Passenger/docroot exposure risk (BLOCKER, flagged by `deploy-verify`)

- **[GENERAL KNOWLEDGE — unverified, security-critical]** This app's authorization model for
  payment-slip uploads depends entirely on `src/app/files/[...key]/route.ts` being the **only**
  path that can serve `private/slips/...` content, gated by `requireAdmin()` inside that route —
  Prisma/`src/lib/storage/` itself has no independent access control, so if the file bytes are
  ever reachable by any other path, the admin check is bypassed completely.
- On typical shared hosting with Apache or LiteSpeed in front of (or alongside) CloudLinux
  Node.js Selector, the web server's **docroot is served directly and unconditionally** for any
  file that exists under it, independent of what the Node app does — the Node app only handles
  requests that don't match a static file first (or requests routed to it via `.htaccess`/reverse
  proxy rules, depending on how Node.js Selector wires Passenger into Apache). If `STORAGE_ROOT`
  (and therefore `storage/private/slips/...`) ends up **inside or under the same tree as the
  public docroot** (a real risk here, since the deploy flow in §4 uploads the whole app — code,
  `node_modules`, and potentially `storage/` — into a single Application Root that Node.js
  Selector typically nests under `public_html` or a subdirectory of it), a customer's payment slip
  becomes fetchable by guessing/enumerating its URL, **completely bypassing `requireAdmin()`**,
  since the request never reaches the Next.js app or that route handler at all.
- This is **strictly worse** than the equivalent VPS/Docker deploy, where `STORAGE_ROOT` lives on
  a volume outside any web-server-managed docroot by construction (no Apache/LiteSpeed docroot
  exists in that setup — only the Node process itself serves anything).
- **Action required before go (blocker, highest priority of all verification items)**:
  1. Confirm in the panel whether the Node.js Selector "Application Root" for this app is a
     directory Apache/LiteSpeed also serves statically (i.e. is it inside `public_html/` or a
     domain's docroot, or is it a separate application-only directory Node.js Selector manages
     that Apache does **not** serve directly except via the Passenger proxy rule).
  2. If Application Root and public docroot are the **same tree** (or Application Root is nested
     under the docroot), do **not** place `STORAGE_ROOT` anywhere under it. If no directory outside
     the docroot is writable/usable by this hosting account, the fallback is a panel-level or
     `.htaccess` **deny-all rule scoped to the `storage/private/` (and ideally the whole
     `storage/`) path** — e.g. an `.htaccess` with `Require all denied` / `Deny from all` placed
     directly inside `storage/private/`, verified to actually block direct HTTP access by testing
     a real request to a known file path after deploy, not just assumed to work from the rule's
     presence.
  3. Treat this as a **go/no-go gate independent of the other items** — even if Node version,
     Passenger wrapper, `better-sqlite3`, and Prisma binary targets are all fine, this path is
     **not safe to launch** with real customer payment slips until direct docroot access to
     `storage/private/` is proven blocked by an actual test request against the live panel, not
     just a config review.

---

## Summary: Go / No-Go

**Current verdict: CONDITIONAL — do not commit to this deploy path yet.** One item is a
**security blocker** (private payment-slip exposure, §7) that must be proven closed by an actual
test request against the live panel before this path can ever go live with real customer data,
independent of every other item's outcome. Four further items are genuine risk-of-blocker for
basic functionality. **All must be confirmed by an actual panel login** before deciding between
this path and the existing VPS plan (`kkd-production-host-mapping.md`):

| # | Item | Blocker if... | How to verify |
|---|------|----------------|----------------|
| 7 | **Private storage docroot exposure (security, highest priority)** | Application Root is inside/under a web-server-served docroot **and** no working deny-all rule blocks `storage/private/` | Real HTTP request to a known `storage/private/slips/...` path after deploy, not just config review |
| 1 | Node version | Selector caps at < 20.9 | Node.js Selector version dropdown |
| 2 | Passenger entry contract | Wrapper listen contract mismatches (socket vs TCP `PORT`) | App setup page + first boot log |
| 3 | `better-sqlite3` native binary | No matching prebuilt **and** no build toolchain available for fallback compile | "Run NPM Install" log on first attempt |
| 5 | Prisma binary target | Wrong/missing `binaryTargets` → engine fails to load at runtime | App startup log naming the missing target |

Items 4 (FTP/File Manager upload workflow) and 6 (env var UI, including the file-vs-process-env
persistence question added after `deploy-verify` review) are **process/config risk, not
feasibility blockers by themselves** — worst case they mean a slower, more manual deploy loop
than Docker/VPS, not an impossibility. (Note: if item 6's env-var UI turns out to persist secrets
to a file inside the exposed docroot, it becomes a variant of the same §7 exposure class, not a
separate risk tier.)

**Recommendation**: before doing any further code changes (adding `output: "standalone"`,
`binaryTargets`, or the Passenger wrapper `app.js`), get a working panel login and check item 7
**first** — it is a go/no-go gate on its own regardless of how items 1–3 and 5 turn out, since a
functionally-working deploy that leaks customer payment slips is strictly worse than no deploy.
Then check items 1–3 and 5. If Node ≥ 20.9 is unavailable, the compiler toolchain is unavailable
with no prebuilt `better-sqlite3` binary matching the panel's OS/Node ABI, or item 7 cannot be
closed with a verified deny-all rule, this path should be considered **no-go** and the team should
fall back to the existing VPS/Docker plan (`docs/plans/kkd-production-host-mapping.md`) instead,
since both blockers listed there have no practical workaround on locked-down shared hosting.

## Risk list (full)

1. **Private storage docroot exposure (security, highest priority)** — `storage/private/slips/...`
   (customer payment slips) may be directly reachable via Apache/LiteSpeed's static docroot
   serving, completely bypassing `requireAdmin()` in `src/app/files/[...key]/route.ts`, if
   Application Root and public docroot share a tree on this panel — unverified, must be closed
   with a proven deny-all rule before any real data goes near this deploy path (§7).
2. **Node version ceiling** — unverified, potential hard blocker (§1).
3. **Passenger entry-point contract mismatch** — needs an `app.js` wrapper not in this repo today;
   exact contract (socket vs TCP, expected filename) unverified (§2).
4. **`better-sqlite3` native compile** — depends on prebuilt binary availability + toolchain
   fallback, both unverified (§3). Mitigation exists (pre-compiled binary upload) but adds
   operational complexity every time the Node ABI or `better-sqlite3` version changes.
5. **Large `node_modules` over FTP** — mitigated by adding `output: "standalone"` (not yet done),
   but even standalone output plus `better-sqlite3` native deps can still be non-trivial to
   transfer reliably over FTP; no CI/CD or git-push flow confirmed available (§4).
6. **Prisma binary target mismatch** — needs explicit `binaryTargets` in `schema.prisma` matching
   the panel's actual OS/libc, currently unset and defaulting to the dev machine's platform (§5).
7. **Secrets handling on a shared-hosting UI** — lower risk if the env var UI exists as expected
   and persists purely to process env (not a file under the docroot) — must confirm both facts,
   not just UI existence (§6).
8. **Deploy iteration speed** — even in the best case, this flow is materially slower to iterate on
   than Docker/VPS (rebuild → zip → upload → unzip → restart per change) unless the panel turns out
   to have Git integration, which is unverified.
9. **Persistent storage for SQLite + uploads** — must confirm the app's working directory (or a
   configured `STORAGE_ROOT` path) survives restarts/redeploys; shared-hosting Node app slots
   sometimes reset non-tracked files on redeploy (§6).

## Explicitly not done in this session

- No login attempt to `http://27.254.62.185:4229` (`kkdprop1`) — no password was supplied, and per
  the task's security rule, none was guessed or requested inline. **A password from the existing
  session must be supplied separately (not written to any file) for the next step: an actual panel
  walkthrough to resolve items 1–3, 5, 6, and — highest priority — 7 (private storage docroot
  exposure) above.**
- No code changes made — `next.config.ts`, `schema.prisma`, and the Passenger `app.js` wrapper are
  all described above as *proposed* changes, contingent on panel verification, not yet applied.
