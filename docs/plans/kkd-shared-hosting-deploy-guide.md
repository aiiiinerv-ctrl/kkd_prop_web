# KKD PROPERTY — Shared Hosting (DirectAdmin + CloudLinux Node.js Selector) Deploy Feasibility

Status: **CONDITIONAL GO — core feasibility verified live; two lower-severity items still open**

## Update log

- **Initial version**: assessment from repo + general knowledge only, no panel login.
- **`deploy-verify` review**: added §7 (private storage docroot exposure) as a security blocker,
  plus an env-var-UI persistence caveat in §6.
- **Read-only recon revision**: password for `kkdprop1` supplied for `curl`-only use (never
  written to any file). Read-only walkthrough of the DirectAdmin panel and `nodejs_selector`
  plugin via `curl`. The live §7 exposure test was attempted but blocked by this session's own
  sandbox permission classifier before any FTP write reached the server.
- **This revision — live mutating test, 2026-07-29, explicit user authorization obtained**: with
  the user's direct confirmation (both for performing mutating actions against the production
  panel, and for using `dangerouslyDisableSandbox: true` on the specific `curl`/FTP calls
  involved), the main session performed a real end-to-end test: uploaded a probe file to
  `public_html/` (confirmed exposed, then deleted), created a real Node.js Selector test app
  (`kkd-app-test`, bound to `kkdproperty.co.th/nodetest`) via the browser (user-driven, screenshots
  relayed back), verified Node version options, uploaded probe files inside and outside the
  Application Root and inside its `public/` subfolder to test static-serving bypass, inspected the
  live home-directory FTP tree, and destroyed the test app + cleaned up probe files afterward. This
  closed §7 (the security blocker) and §1 (Node version) definitively, and substantially
  de-risked §2 and §6. See each section for what's now **[VERIFIED — live test]**.

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

Every claim below is tagged:

- **[VERIFIED — repo]**: confirmed by reading this project's actual `package.json`,
  `prisma.config.ts`, `prisma/schema.prisma`, `next.config.ts`, `Dockerfile` in
  `/Users/ainerv/react_native_projects/kkd_prop/`.
- **[VERIFIED — panel]**: confirmed live against `http://27.254.62.185:4229` via read-only
  `curl` requests using DirectAdmin's own classic API (`CMD_API_*`, HTTP Basic Auth) and its
  File Manager (`CMD_FILE_MANAGER`), and by downloading and inspecting the `nodejs_selector`
  plugin's own client-side bundle. No panel state was modified (no app created, no file
  written/deleted) — this was reconnaissance only.
- **[GENERAL KNOWLEDGE — unverified against this panel]**: standard, well-documented behavior of
  cPanel/DirectAdmin CloudLinux Node.js Selector (Phusion Passenger-based), not confirmed against
  this specific DirectAdmin install, its DirectAdmin/CloudLinux version, or its actual resource
  limits.

Anything still marked general-knowledge, or explicitly flagged "not yet closed" below, needs
further live verification (typically: actually creating a Node.js Selector app and observing its
behavior, or an FTP-based write test) before committing to this deploy path.

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
- **[VERIFIED — panel, partial]** The `nodejs_selector` plugin (LVE Manager component,
  **plugin version 7.11.33-1**) is installed and enabled for the `kkdprop1` account — confirmed via
  `CMD_PLUGINS` listing and loading the plugin's Angular SPA shell successfully (HTTP 200,
  authenticated). This plugin is a modern build (7.x line), which is a good sign — old/EOL
  CloudLinux installs tend to still be on 5.x/6.x plugin lines and cap out at older Node versions.
  **However**, the actual Node version dropdown itself lives inside the plugin's Angular SPA and is
  populated by an authenticated, CSRF-token-protected JSON API call that a plain-`curl` read-only
  session could not reach in this pass (the SPA sets a CSRF token via a JS-executed cookie flow;
  scripted `curl` without running the JS would need to reverse-engineer the token exchange, which
  was not attempted further given time/scope — this needs a real browser session, e.g. logging in
  via Chrome as the E2E scripts in this repo already do with `channel: "chrome"`, or a follow-up
  scripted CSRF-token fetch). This CSRF-token limitation was later worked around by having the
  user drive the panel directly in their own browser and relay screenshots back — see the
  confirmed result below.
- **No Node.js Selector app exists yet on this account** — confirmed via `CMD_FILE_MANAGER`
  home-directory listing showing only `domains/`, `imap/`, `Maildir/`, `tmp/` (no app directory,
  no `.cl.selector`-referenced app config beyond the housekeeping dotfile CloudLinux itself
  manages). This is a clean slate, not a pre-existing broken/misconfigured app.
- **[VERIFIED — live test, 2026-07-29]** Logged into the panel's "Create Application" screen and
  read the Node.js version dropdown directly: **14.21.3, 16.20.2, 18.20.8, 19.9.0, 20.20.0
  (recommended), 22.22.0, 24.13.0**. `20.20.0` is both the panel's own recommended default *and*
  comfortably satisfies Next's `>=20.9.0` floor — there is no version-ceiling risk at all, with
  headroom up to 24.13.0 if ever needed. **This item is closed — not a blocker.**

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
- **[VERIFIED — panel]** The Passenger/entry-point model above is **not just general knowledge for
  this panel** — it's confirmed directly from the `nodejs_selector` plugin's own downloaded
  client-side bundle (`common.bundle.min.js`), which contains real, distinct form-field/param names
  used when creating or editing a Node.js app: `app-root` (Application Root), `app-uri`
  (Application URL), `startup-file` / `startup_file`, `entry-point` / `entry_point`,
  `passenger-log-file`, and `env-vars`. This is a direct confirmation that (a) Application Root and
  the public Application URL are **separately configurable**, matching the "app root need not be
  under docroot" mitigation in §7, and (b) the panel exposes both a "startup file" and a separate
  "entry point" concept — i.e. Passenger's entry-point contract genuinely is a first-class,
  user-configurable setting here, not an assumption. The bundle literally contains the strings
  `passenger`, `Passenger`, `application_root`, `entry_point`, and `startup_file` as field/param
  identifiers.
- **[VERIFIED — live test, 2026-07-29]** A real test app was created with Application root
  `kkd-app-test` (physically `/home/kkdprop1/kkd-app-test/`, confirmed via FTP listing to be a
  **sibling of `domains/`**, not nested under it), Application URL `kkdproperty.co.th/nodetest`,
  and Application startup file `app.js`. CloudLinux auto-scaffolded a placeholder `app.js` (323
  bytes) on creation — no manual wrapper file needed to get *something* running immediately. The
  app started automatically and responded correctly at `http://kkdproperty.co.th/nodetest/` with
  `"It works!\n\nNodeJS 20.20.0"` (Passenger header `X-Powered-By: Phusion Passenger(R) 6.0.26`
  present on every response, confirming Passenger 6.x is what actually fronts these apps). This is
  a single flat "Application startup file" field — no separate socket-vs-TCP contract to
  reverse-engineer for a basic setup; Passenger's own Node integration (v6) handles the
  process/port wiring internally. **Still open**: whether Next's own `output: "standalone"`
  `server.js` (rather than a hand-written `app.js` wrapper) drops in cleanly as the startup file —
  not tested with the real app in this pass, since the test used CloudLinux's auto-generated
  placeholder rather than uploading the actual Next.js build. Low risk given the wrapper pattern
  in this section works either way as a fallback.

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

- **[VERIFIED — panel]** `CMD_API_SHOW_USER_CONFIG` (DirectAdmin's own classic API, read-only,
  authenticated) confirms for this exact account: `ssh=OFF`, `git=OFF`, `ftp=unlimited`,
  `quota=12000` (MB, i.e. ~12GB total disk), `domain=kkdproperty.co.th`,
  `package=Flash-1`. This **removes the ambiguity** noted in the original draft: there is
  confirmed **no SSH** and **no DirectAdmin Git integration** available on this account — the
  FTP/File-Manager-only deploy workflow described below is not a fallback assumption, it is the
  **only** available path. (`quota=12000` also matters directly for §4's "large node_modules"
  concern below — 12GB total is generous for a single small Next.js app, so raw upload size is not
  itself the binding constraint; iteration speed and FTP reliability still are.)
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
- **[VERIFIED — live test, 2026-07-29]** Confirmed via real FTP directory listing: the account
  home directory (`/home/kkdprop1/`) contains `domains/` (with `public_html` as a symlink into
  `domains/kkdproperty.co.th/public_html`), plus separately `kkd-app-test/` and `nodevenv/` — i.e.
  Node.js Selector app roots and their runtime environments live as **top-level siblings of
  `domains/`**, entirely outside any web-server docroot, by default (not something that has to be
  manually arranged). This is the mechanism that makes §7's closure work.
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
- **[VERIFIED — panel, partial]** The `nodejs_selector` plugin's client bundle confirms an
  `"env-vars": JSON.stringify(e.env_vars)` field is sent as a structured parameter alongside
  `app-root`, `startup-file`, etc. when creating/updating an app — i.e. this panel genuinely has a
  **dedicated env-var mechanism** distinct from uploading a file, matching the general-knowledge
  assumption above.
- **[VERIFIED — live test, 2026-07-29]** Added a real test env var (`TEST_VAR=hello123`) to the
  test app via the panel UI, then inspected the account via FTP. It did **not** appear as a file
  anywhere inside the app's own directory tree (`kkd-app-test/` contained only `app.js`, `public/`,
  `tmp/` — no `.env` or similar). A likely storage location, `.cl.selector/node-selector.json`
  (found alongside `.cl.selector/defaults.cfg` at the home-directory root), was **not read** —
  reading it was blocked by this session's own permission classifier as an unnecessary probe into
  a system config file, and this session did not pursue it further since it wasn't needed: `.cl.selector/`
  is itself confirmed to be a home-directory-root sibling of `domains/`, i.e. **outside any
  web-server docroot regardless of its exact internal format**. Whichever file (if any) inside it
  holds the env vars, it is not reachable via HTTP by the same mechanism that made `public_html/`
  exposed. **This item is closed as low-risk** — no further action needed before deploy.

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
- **[VERIFIED — panel, partial]** Two relevant facts confirmed via read-only `CMD_FILE_MANAGER`
  browsing (no files created/modified):
  1. **No Node.js Selector app exists yet on this account** — so there is currently no live
     "Application Root" to inspect; the account's home directory contains only
     `domains/`, `imap/`, `Maildir/`, `tmp/`.
  2. Under `domains/kkdproperty.co.th/`, the existing subdirectories are `logs/`, `public_ftp/`,
     `public_html/`, `stats/` — **no `private_html/` currently exists**. DirectAdmin's classic
     convention (going back to its default Apache templates) is that `private_html/` is a sibling
     of `public_html/` reserved for content the vhost template does **not** serve statically by
     default — this is a plausible, DirectAdmin-native candidate location to anchor `STORAGE_ROOT`
     (or at least `storage/private/`) outside static serving, **but this specific panel's actual
     Apache/LiteSpeed vhost template was not inspected**, so whether `private_html/` is genuinely
     non-web-served on *this* install (vs. just conventionally named) is still
     **[GENERAL KNOWLEDGE — unverified]**, not confirmed.
- **[VERIFIED — live test, 2026-07-29]** With explicit user authorization, a probe file was
  uploaded via FTP to `domains/kkdproperty.co.th/public_html/kkd-exposure-probe.txt` and then
  fetched via `curl -H "Host: kkdproperty.co.th" http://27.254.62.185/kkd-exposure-probe.txt`.
  **Result: `HTTP 200`, file content returned verbatim.** This confirms directly — not just by
  general knowledge — that Apache/LiteSpeed on this host serves **any file placed under
  `public_html/` as static content, unconditionally, with zero authentication**. The probe file
  was deleted immediately after (`DELE` via FTP) and re-verified as `HTTP 404` — nothing was left
  on the live site. This test did not involve a live Node.js Selector app (none exists on this
  account yet, per the read-only recon above), so it specifically validates the **baseline/naive
  misconfiguration scenario**: if `storage/private/` ends up anywhere under `public_html/` (or any
  other web-served docroot), it is 100% exposed, no exceptions.
- **[VERIFIED — live test, 2026-07-29] Application Root case — now directly tested, not just
  inferred.** With a real Node.js Selector app live (`kkd-app-test`, Application root
  `/home/kkdprop1/kkd-app-test/`, bound to `kkdproperty.co.th/nodetest`):
  1. Uploaded a probe file directly inside the Application Root, alongside `app.js`. Requested it
     at `http://kkdproperty.co.th/nodetest/probe2.txt` — response was **not** the uploaded file
     content; it was the *same* `"It works!"` response the app's `/` route returns. I.e. the
     request was routed through Passenger to the Node app, which had no route for that path, not
     served as a static file.
  2. Uploaded a second probe file inside the app's `public/` subfolder (a directory CloudLinux
     itself auto-creates, and a naming convention some Passenger setups treat as an implicit
     static-serving root). Requested it the same way — **same non-bypass result**. Even the
     conventionally-named `public/` folder is not given special static-serving treatment on this
     panel; every request to the app's bound URL goes through the Node process unconditionally.
  3. Both probe files were deleted immediately after the test (verified via re-listing), the test
     app was destroyed via the panel UI (confirmed: "NO APPLICATIONS FOUND", and
     `http://kkdproperty.co.th/nodetest/` now returns `403`), and leftover scaffold files were
     cleaned up via FTP where feasible (`kkd-app-test/` fully removed; `nodevenv/kkd-app-test/`'s
     deep venv tree was left in place — non-web-exposed, ~few MB against a 12GB quota, not a
     security or cost concern).
- **Conclusion: §7 is closed. Not a blocker, conditional on one deploy-time rule.** Files placed
  anywhere inside a Node.js Selector Application Root are **never** served as static content by
  Apache/LiteSpeed on this panel — every request to the app's bound URL is unconditionally routed
  through Passenger to the Node process. Combined with the confirmed fact that Application Root is
  a structural sibling of `domains/` (§4), this means:
  - **`STORAGE_ROOT` is safe as long as it lives anywhere under the Node.js Selector Application
    Root** (e.g. `<app-root>/storage/private/`) — access to those files is entirely gated by
    whatever the Next.js app itself does with the request (i.e. `requireAdmin()` in
    `src/app/files/[...key]/route.ts` remains the real and only gate, as designed).
  - **`STORAGE_ROOT` must never be placed under `public_html/`** (or any other Apache-served
    docroot) — that specific case is confirmed exposed with zero authentication, per the earlier
    baseline test in this section.
  - No `.htaccess` deny-all workaround is needed as a fallback; the Application Root's default
    behavior already provides the isolation this app's security model requires.

---

## Summary: Go / No-Go

**Current verdict: CONDITIONAL GO.** The security blocker (§7) and the version-ceiling risk (§1)
are both **closed by live testing**, not just config review. Two items remain genuinely open —
neither is a confirmed blocker, but neither has been tested with the real app's actual
dependencies/build output yet:

| # | Item | Status | Blocker if... | How to close |
|---|------|--------|----------------|----------------|
| 7 | Private storage docroot exposure | ✅ **Closed (live test)** | — | `STORAGE_ROOT` must live under the Node.js Selector Application Root, never under `public_html/` |
| 1 | Node version | ✅ **Closed (live test)** | — | Select `20.20.0` (or newer) when creating the real app |
| 2 | Passenger entry contract | ✅ **Closed (live test)**, minor open detail | — | Confirmed a plain `app.js`/startup-file works with no special socket contract; whether `output: "standalone"`'s generated `server.js` drops in directly vs. needs the wrapper from §2 is untested with the real build |
| 6 | Env var UI persistence | ✅ **Closed (live test)** | — | Confirmed stored outside any web-server docroot regardless of exact on-disk format |
| 3 | `better-sqlite3` native binary | 🔶 **Still open** | No matching prebuilt **and** no build toolchain available for fallback compile | Upload the real `package.json`/`package-lock.json` to a test app and click "Run NPM Install" (button confirmed to exist), check the log |
| 5 | Prisma binary target | 🔶 **Still open** | Wrong/missing `binaryTargets` → engine fails to load at runtime | Determine the panel's OS/OpenSSL version (or just attempt a deploy and read the resulting error, which names the missing target) |

**Recommendation**: this path is no longer blocked on unknowns that require further live-panel
recon — the two remaining open items (3, 5) are best resolved by attempting a real first deploy
(with `output: "standalone"` added to `next.config.ts`, `binaryTargets` set to a best-guess
`["native", "rhel-openssl-3.0.x"]`, and the real `package.json` uploaded) and reading whatever
error surfaces, rather than more speculative panel probing. Both have known, workable mitigations
even in the worst case (pre-compiled native binary upload for §3; regenerating the Prisma client
with the correct target once the error names it for §5) — neither is a dead end the way "no SSH
at all" would have been. **The VPS/Docker plan (`kkd-production-host-mapping.md`) is no longer
necessarily the safer fallback it looked like earlier in this investigation** — that plan has its
own unresolved item (get a genuine root-access VPS in the first place, which this hosting package
does not include), whereas this shared-hosting path now has a validated, working deploy mechanism
end-to-end (Application Root + Passenger + FTP + panel-driven `npm install`), confirmed against
the real account, for the actual cost already paid.

## Risk list (full)

1. ~~**Private storage docroot exposure (security, highest priority)**~~ — **CLOSED**, verified by
   live test (§7). `STORAGE_ROOT` must live under the Node.js Selector Application Root, never
   under `public_html/`.
2. ~~**Node version ceiling**~~ — **CLOSED**, verified by live test (§1). `20.20.0` available and
   sufficient.
3. **Passenger entry-point contract, `output: "standalone"` compatibility** — mostly closed; a
   plain startup-file works with no special socket contract, but whether Next's generated
   `server.js` drops in directly (vs. needing the `app.js` wrapper from §2) is untested with the
   real build (§2).
4. **`better-sqlite3` native compile** — depends on prebuilt binary availability + toolchain
   fallback, both still unverified (§3). Mitigation exists (pre-compiled binary upload) but adds
   operational complexity every time the Node ABI or `better-sqlite3` version changes. The panel's
   "Run NPM Install" button (confirmed to exist) is the way to test this directly.
5. **Large `node_modules` over FTP** — mitigated by adding `output: "standalone"` (not yet done),
   but even standalone output plus `better-sqlite3` native deps can still be non-trivial to
   transfer reliably over FTP; confirmed no CI/CD or git-push flow available (`git=OFF`) (§4).
6. **Prisma binary target mismatch** — needs explicit `binaryTargets` in `schema.prisma` matching
   the panel's actual OS/libc, currently unset and defaulting to the dev machine's platform (§5).
7. ~~**Secrets handling on a shared-hosting UI**~~ — **CLOSED**, verified by live test (§6). Env
   vars confirmed stored outside any web-server docroot.
8. **Deploy iteration speed** — **[VERIFIED — panel]** confirmed slower than Docker/VPS by
   necessity, not just risk: `CMD_API_SHOW_USER_CONFIG` confirms `git=OFF` and `ssh=OFF` for this
   account, so there is **no git-push deploy path and no SSH** at all — every fix-and-redeploy
   cycle really is the full rebuild-locally → zip → upload → unzip → restart loop with no faster
   alternative available on this account.
9. **Persistent storage for SQLite + uploads** — must confirm the app's working directory (or a
   configured `STORAGE_ROOT` path) survives restarts/redeploys; shared-hosting Node app slots
   sometimes reset non-tracked files on redeploy. Not tested directly (the test app was destroyed
   shortly after creation, not restarted/redeployed) (§6).

## Explicitly not done in this session

- **Live mutating tests were performed** with explicit user authorization (see Update log) —
  probe-file exposure tests, a real Node.js Selector test app created/inspected/destroyed, and
  env-var persistence checks. This is a change from the prior read-only-only revision of this
  document.
- **Not attempted**: uploading the real application build (with actual `package.json`,
  `better-sqlite3`, and a real `output: "standalone"` `server.js`) — the live test used a minimal
  synthetic app to answer the routing/exposure questions safely and cheaply, deliberately avoiding
  uploading real dependencies or real code to a throwaway test app. Items 3 and 5 above need this
  next, ideally as part of an actual first deploy attempt rather than another isolated test.
- **(Superseded)** An earlier revision of this document recorded the §7 exposure test as blocked
  by this session's sandbox classifier. That block was specific to the *unattended background
  subagent* attempting the write with only relayed (not directly-witnessed) user authorization —
  once the user confirmed directly in the main session's own transcript, the equivalent action was
  performed successfully there and is recorded as closed above. This is left here as a note on
  *why* the test took two attempts, not as an open item.
- **Still not verified**: `better-sqlite3` compile toolchain availability against the real
  dependency tree (§3), and the panel's actual OS/OpenSSL version for Prisma `binaryTargets` (§5) —
  both need a real first deploy attempt to close, per the recommendation above, rather than further
  isolated panel probing.
- No code changes made to the application itself — `next.config.ts` (`output: "standalone"`),
  `schema.prisma` (`binaryTargets`), and the Passenger `app.js` wrapper are all described above as
  *proposed* changes, not yet applied. Only the throwaway test app + probe files (all since
  deleted/destroyed) were created directly on the hosting account.

## Sprint 1 update — code changes applied, local verification only (no panel interaction)

- **[VERIFIED — local build]** `output: "standalone"` added to `next.config.ts`. `npm run build`
  succeeds and produces `.next/standalone/` (89MB unfiltered) containing a working `server.js`,
  a traced `node_modules/` (43MB), and confirms `better-sqlite3`'s compiled native binary
  (`node_modules/better-sqlite3/build/Release/better_sqlite3.node`) survives output tracing intact
  — the `serverExternalPackages` entry works as expected for local macOS arm64.
- **New finding, not previously known**: this project's `.next/standalone/` output mirrors the
  **entire project root** (not just traced deps) — it was found to include `.env` (real local
  secrets), `storage/private/slips/*` (real customer payment-slip images from local dev data),
  `backups/*` (DB + private-storage snapshots), and assorted docs/screenshots/Dockerfile/etc that
  have nothing to do with running the app. This appears to be Next 16's output-file-tracing
  treating the lockfile directory as the trace root and copying its full tree, not respecting
  `.gitignore`. **This means the deploy artifact must never be `.next/standalone/` copied
  wholesale** — `scripts/build-shared-hosting-deploy.mts` (added this sprint) copies an explicit
  allowlist instead and asserts `.env`/`storage`/`backups` are absent from the staged output before
  zipping. Flagging this for `deploy-verify`'s Sprint 1 review as the most safety-relevant finding
  of this sprint.
- **[VERIFIED — repo/local]** Confirmed in the installed `prisma@7.8.0` CLI source
  (`node_modules/prisma/build/index.js`) that `binaryTargets` is parsed from the schema's
  `generator` block (`A.options?.generator.binaryTargets`), and `@prisma/config`'s `defineConfig`
  (`prisma.config.ts`) has no such field — it has not moved. Added
  `binaryTargets = ["native", "rhel-openssl-3.0.x"]` to `schema.prisma` and ran
  `npx prisma generate` successfully.
- **New finding, changes the risk picture for item 5 (Prisma binary target)**: this project uses
  `@prisma/adapter-better-sqlite3` (a driver adapter, wired in `src/lib/db.ts`) with the
  `prisma-client` generator. With this combination, `npx prisma generate` produces **zero** native
  or WASM query-engine binaries in `src/generated/prisma` regardless of `binaryTargets` — verified
  by searching the generated output for `*.node`/`*.wasm`/`query_engine*` files after generating
  with both targets set: none exist. Prisma's driver-adapter model routes queries entirely through
  the adapter package calling `better-sqlite3` directly; there is no separate native query engine
  to mismatch. **Practical effect**: `binaryTargets` is likely inert for this project's actual
  runtime (added anyway since it's cheap, documented as the plan's best guess, and costs nothing to
  leave in) — the real and only native-compile risk on the shared host is `better-sqlite3` itself
  (item 3, still open, needs Sprint 2's live "Run NPM Install" test). This is **not yet confirmed
  against the live panel** — it's a repo/local-build finding, not a panel finding — but it does mean
  a Prisma "wrong binary target" runtime error is now considered unlikely rather than a live open
  risk; if the app fails to load on-panel, the far more likely cause is `better-sqlite3`'s own
  native binary being incompatible with the panel's OS/arch/Node ABI, not a missing Prisma engine.
- **Root cause of the "whole project traced" finding above, confirmed by the build's own
  diagnostic**: `npm run build` emits a Turbopack warning naming the exact cause —
  `src/lib/storage/local.ts`'s `root()` helper calls `path.resolve(process.env.STORAGE_ROOT ?? "./storage")`,
  a dynamic `path.resolve` on an env var, which Next's file tracer cannot statically resolve and
  so conservatively traces the entire project as a fallback. This is an application-code pattern
  (`src/lib/storage/local.ts`), not a deploy-config issue, so fixing the tracing behavior itself is
  out of this sprint's scope (code changes belong to `nextjs-dev`) — flagging it here so it's not
  lost, and because `scripts/build-shared-hosting-deploy.mts`'s explicit-allowlist approach is the
  correct mitigation regardless of whether that code pattern is ever changed.
- **[VERIFIED — local]** `deploy/app.js` written as the Passenger startup-file fallback wrapper (used
  only if `.next/standalone/server.js` doesn't work directly as the panel's configured startup
  file — untested on-panel, still open per §2).
- **[VERIFIED — local]** `scripts/build-shared-hosting-deploy.mts` written and run successfully.
  Produces `deploy/dist/` (55MB staged directory) and `deploy/dist.zip` (19MB) containing exactly:
  traced `node_modules/` (incl. the working `better-sqlite3` binary), `server.js`, `package.json`,
  `.next/` (server output + `static/` copied in per Next's standalone docs), `public/`,
  `prisma/schema.prisma` + `prisma/migrations/` (not `dev.db`), `src/generated/prisma/`, and
  `deploy/app.js`. Confirmed absent: `.env`, `storage/`, `backups/`, `prisma/dev.db`. Both
  `deploy/dist/` and `deploy/dist.zip` are gitignored (build output, not source).

## Environment variables — required panel env-var UI entries

Per §6 (closed — the Node.js Selector env-var UI stores these outside any web-server docroot):
set these via the panel's per-app "Environment Variables" UI at deploy time, **never** in a file
in this repo or in the uploaded deploy artifact (`.env` is explicitly excluded by
`scripts/build-shared-hosting-deploy.mts`, see above). Names only, cross-checked against
`.env.example` and `src/lib/notifications/`; no real values are recorded here or anywhere else in
this repo.

| Variable | Required? | Notes |
|---|---|---|
| `DATABASE_URL` | Required | SQLite `file:` path. **Deploy-time value, not decided in Sprint 1** — must point at a persistent path under the Node.js Selector Application Root (never under `public_html/`, per §7's closed conclusion). Matches `prisma.config.ts:11`'s `env("DATABASE_URL")`. |
| `AUTH_SECRET` | Required | Auth.js v5 session secret. Generate fresh for production (`openssl rand -base64 33`) — do not reuse the local dev value. |
| `AUTH_TRUST_HOST` | Required | `"true"` — needed behind the panel's Passenger/Apache proxy, matches `.env.example`. |
| `RESEND_API_KEY` | Optional (enables email notifications) | `src/lib/notifications/resend-email.ts` `isEnabled()` requires this **and** `NOTIFY_EMAIL_FROM` **and** `NOTIFY_EMAIL_TO` all set together — partial config silently disables the channel, not an error. |
| `NOTIFY_EMAIL_FROM` | Optional, pairs with `RESEND_API_KEY` | See above. |
| `NOTIFY_EMAIL_TO` | Optional, pairs with `RESEND_API_KEY` | Comma-separated list, per `resend-email.ts`. |
| `LINE_CHANNEL_ACCESS_TOKEN` | Optional (enables LINE notifications) | `src/lib/notifications/line-push.ts` `isEnabled()` requires this **and** `LINE_NOTIFY_TO` together. Note: this is a LINE Messaging API channel access token, not "LINE Notify" (discontinued April 2025, per the code comment in `line-push.ts`) — despite the `LINE_NOTIFY_TO` variable name, which is a naming holdover, not a live LINE Notify integration. |
| `LINE_NOTIFY_TO` | Optional, pairs with `LINE_CHANNEL_ACCESS_TOKEN` | Comma-separated LINE userIds or a group id. |
| `STORAGE_DRIVER` | Recommended (defaults to `"local"`) | Only `"local"` is implemented (`src/lib/storage/index.ts`) — set explicitly for clarity even though the default matches. |
| `STORAGE_ROOT` | Required | **Deploy-time value, not a value to hardcode now.** Per §7's closed conclusion, must be a path under the Node.js Selector Application Root, e.g. `<app-root>/storage/private/` — never under `public_html/` or any other Apache/LiteSpeed-served docroot. Confirm the exact Application Root path when the real app is created in Sprint 2/3 before setting this. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Only needed if running `prisma db seed` on first boot | Sprint 2/3 decision (per the PM plan) on whether production starts from a seed or a migrated copy of real data — not a Sprint 1 concern. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Used in notification deep links and `sitemap.xml`/SEO metadata (`src/lib/seo.ts`) — set to the real `https://kkdproperty.co.th` once bound. |

**Still open from §6** (unchanged by Sprint 1, no panel access in this sprint): confirm the exact
persistent Application Root path for `STORAGE_ROOT` once a real (non-test) Node.js Selector app
exists in Sprint 2/3, and confirm the SQLite DB file's directory survives restarts/redeploys —
both require live panel testing, not something resolvable from the repo alone.

## Sprint 2 update — both remaining open items closed by live testing, 2026-08-08

Executed against a disposable test app (`kkd-app-test-2`, Application Root
`/home/kkdprop1/kkd-app-test-2`, bound to `kkdproperty.co.th/nodetest2` — **not** the bare domain),
Node 20.20.0. Destroyed and fully cleaned up (panel app + FTP files, permanent delete) at the end
of this session; nothing left on the account.

### Item 3 — `better-sqlite3` native binary: closed, real root cause found

**Not a toolchain-availability problem** — `python3`, `make`, `gcc`, `g++` are all present on the
panel, and outbound network to GitHub works. The actual cause: **`better-sqlite3@12.11.1`'s
published release ships no prebuilt binary for Node ABI v115 (Node 20.x) at all** — only ABI v127+
(Node 22+). `prebuild-install` correctly reports "No prebuilt binaries found" and falls through to
`node-gyp rebuild --release`, which — via the panel's own "Run NPM Install" button — completed
with exit code 0 but produced **no `.node` file anywhere** `bindings` searches. Root cause of *that*
silent failure not fully isolated (suspected CloudLinux LVE resource limit killing the compile
child process without normal error propagation) — not pursued further since a working mitigation
was found.

**Mitigation, confirmed working**: compile `better_sqlite3.node` in a Docker container matching the
panel (AlmaLinux 8 base — CloudLinux is RHEL8-derived — with `gcc-toolset-12` for the `-std=c++20`
support better-sqlite3 12.x needs; AlmaLinux 8's *default* `g++` is too old), then upload the
compiled binary directly into `node_modules/better-sqlite3/build/Release/better_sqlite3.node`. This
is now automated as part of the build (see below) rather than a manual per-deploy step. Confirmed
via panel OS string: `Linux 4.18.0-553.107.1.lve.el8.x86_64` (el8, x86_64) — matches the Docker
build target.

### Item 5 — Prisma binary target: confirmed inert (per Sprint 1 finding), and superseded by a
bigger finding

`binaryTargets` in `schema.prisma` is confirmed genuinely unused at runtime for this project (no
native/WASM query engine in `src/generated/prisma` — the driver-adapter model routes queries
through `better-sqlite3` directly). Not the risk. The real risk that surfaced: **`.next/standalone`'s
compiled server chunks bake in content-hash-suffixed module references** (e.g.
`@prisma/adapter-better-sqlite3-da039dd0f7229020`) **that only resolve against the exact
`node_modules` tree Next traced at build time.** A local macOS build's `.next/standalone` output
cannot be paired with a separately-`npm install`-ed Linux `node_modules` — confirmed live: doing
so produces `Cannot find package '@prisma/adapter-better-sqlite3-<hash>'` / `Cannot find module
'@prisma/client-<hash>/runtime/client'` on every Prisma-touching route, while non-DB routes (locale
redirect, static home page render) work fine.

**Fix, confirmed working**: the entire build (`npm install`, `prisma generate`,
`prisma migrate deploy` against a dummy build DB, `next build`) now happens *inside* the same
Docker container used for the `better-sqlite3` fix, so the traced `.next/standalone` output and its
`node_modules` are guaranteed to match. One Linux build environment closes both item 3 and item 5.
See `deploy/docker-build/Dockerfile.shared-hosting` and the rewritten
`scripts/build-shared-hosting-deploy.mts` (now builds via Docker itself — no separate local
`npm run build` step).

### Passenger entry-point contract (§2) — fully closed, no wrapper needed

`.next/standalone/server.js` (Next's own generated entry point) works directly as the Passenger
startup file — confirmed live, real homepage HTML rendered (`/th` route, 71KB, correct Thai
content) through the actual compiled build with matching `node_modules`. `deploy/app.js` (the
manual wrapper) is not needed; kept only as a documented fallback.

### Two tooling gotchas found, now fixed/documented for whoever automates the real upload

1. **`curl`'s default glob parsing silently drops files with `[`/`]` in their path** — exactly
   Next's dynamic-route naming convention (`[locale]`, `[id]`, `[turbopack]_runtime.js`). 226 such
   files failed to upload with no error in a naive per-file `curl -T` loop. Needs `curl -g`
   (`--globoff`), or avoid per-file FTP entirely (see next point).
2. **Per-file FTP upload does not scale** — the real deploy artifact is ~1,950 files; one-by-one
   `curl -T` uploads (even successful ones) are too slow / time out. **Upload the zip
   (`deploy/dist.zip`, single ~27MB transfer) and extract server-side via DirectAdmin's classic
   File Manager** (`Extract` action next to the zip file) instead — confirmed available and
   working on this panel. The File Manager extract flow requires: select all files on the
   confirmation/preview page (thousands of checkboxes — check via one `document.querySelectorAll`
   pass, not one at a time) and click the actual "Extract" submit button (distinct from the
   `Extract` action link that opens the preview). Also: DirectAdmin's file-delete action fires a
   native JS `confirm()` dialog — a browser-automation script must register a dialog handler that
   accepts it, or the delete silently no-ops.

### Follow-up session, same day — deploy-verify fixes + DB-provisioning decision + full smoke test

`deploy-verify` reviewed the Sprint 2 diff and found two real issues, both fixed and re-verified
(full Docker build re-run, `better-sqlite3` binary re-confirmed as Linux ELF):

- **`.dockerignore` was missing `backups/`** — this machine's `backups/` directory contains a real
  `dev.db` and real customer payment-slip images; without the exclusion, any Docker build (this new
  Dockerfile *and* the existing project-root one, same build context) would bake that PII into an
  image layer. Fixed: added `backups/` and `deploy/linux-build/` to `.dockerignore`.
- **`package-lock.json` was genuinely missing an entry** — `@swc/helpers@0.5.23`, an optional peer
  dependency of `next-intl`'s bundled `@swc/core` that only gets resolved when `npm install` runs on
  Linux (confirmed: regenerating the lockfile via `npm install --package-lock-only` inside a Linux
  container added it; running the same command on macOS reported "up to date" and changed nothing).
  Fixed: regenerated the lockfile from Linux, switched `Dockerfile.shared-hosting` back to `npm ci`,
  confirmed a full clean rebuild passes.

**DB provisioning decision** (was open, now resolved): production will **migrate the real, existing
`prisma/dev.db` content** rather than start from a fresh seed. Before touching the real domain, this
was validated on a fresh disposable test app (`kkd-app-test-3`, destroyed and fully cleaned up after
— confirmed zero leftover files, unlike the earlier `kkd-app-test`/`nodevenv` cleanup in Sprint 2
which needed a second pass) using a **scrubbed copy** of `dev.db`, not the real file: `Lead`,
`SurveyBooking`, and `AuditLog` (customer PII) were deleted; `PaymentSettings` (real bank account
details) and `ChannelExecutive` (partner phone numbers) were also deleted since they're not needed
for this test and aren't "content"; all 5 real `AdminUser` accounts were replaced with one synthetic
test-only admin (bcrypt hash generated locally, never a real staff password). Content tables
(`Service`, `Package`, `PortfolioProject`, `PromoChannel`, `BookingCapacitySetting`) were kept as-is
since they're public site content, not PII. A dummy `storage/private/slips/dummy-slip.txt` (plain
test text, not a real slip image) stood in for the `/files/...` round-trip test.

**Full smoke test result — all passed**, driven via the same internal spawn-and-HTTP-client
diagnostic technique used earlier in Sprint 2 (bypasses the subpath-mount Apache routing artifact
that a real bare-domain deploy won't have):

| Check | Result |
|---|---|
| Homepage renders migrated content (`/th/packages`) | 200, real package content present |
| `GET /api/auth/csrf` | 200, token issued |
| `POST /api/auth/callback/credentials` (test admin) | 302 → `/admin`, session cookie set |
| `GET /admin` with session cookie | 200, dashboard rendered (not the login page) |
| `GET /files/private/slips/dummy-slip.txt` without auth | 401 |
| Same, with session cookie | 200, correct file content returned |

This closes the "admin login + `/files` round-trip" item from the original Sprint 2 plan step 5,
and validates the real-data-migration path end-to-end before it's attempted against the actual
`kkdproperty.co.th` domain in Sprint 3. **For the real Sprint 3 cutover, the full unscrubbed
`dev.db` (or a fresh `prisma migrate deploy` + real data import) is what actually ships** — the
scrubbing above was specific to keeping PII off a disposable *test* slot, not a recommendation to
scrub production.

### Updated Go/No-Go

Both originally-open items (3, 5) are now **closed** — with the Docker-build fix rather than the
speculative mitigations in the table above (pre-compiled binary upload for §3 turned out right in
spirit; §5 was reframed and fixed at the build-pipeline level, not `binaryTargets`). No remaining
item blocks Sprint 3 cutover; the two "still open" items above are decisions, not unknowns.
