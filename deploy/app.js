/**
 * app.js — Phusion Passenger startup-file wrapper for the CloudLinux Node.js
 * Selector shared-hosting target (DirectAdmin panel, kkdproperty.co.th).
 *
 * Passenger's Node integration does not invoke `npm start`/`next start`
 * directly — it requires an application startup file that either binds a
 * plain http.Server on the PORT it injects, or (for the standalone-output
 * case) is simply Next's own generated `.next/standalone/server.js`, if that
 * drops in cleanly as the panel's configured startup file.
 *
 * This wrapper is the FALLBACK path, for use only if the plain
 * `.next/standalone/server.js` does not work as the Passenger startup file
 * (untested with the real build as of Sprint 1 — see
 * docs/plans/kkd-shared-hosting-deploy-guide.md §2). It is not part of the
 * `.next/standalone/` tree Next.js generates; it is a deploy artifact and
 * therefore lives under deploy/, not src/.
 *
 * Usage on the panel: set this file (uploaded to the Application Root, e.g.
 * alongside the assembled deploy artifact from
 * scripts/build-shared-hosting-deploy.mts) as the Node.js Selector app's
 * "Application startup file", instead of server.js, if server.js fails to
 * start under Passenger.
 *
 * Requires `next` to be resolvable from this file's location (i.e. this
 * file must sit at the same level as `node_modules/` in the uploaded
 * artifact, with `dir: __dirname` pointing at that same root).
 *
 * Expected benign warning: Next prints `"next start" does not work with
 * "output: standalone"` on boot here because it doesn't recognize this
 * programmatic next()/createServer pattern. The app starts and serves
 * correctly despite it (verified by a live smoke test) — don't chase it
 * as a bug if it shows up in Passenger's logs.
 */
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
