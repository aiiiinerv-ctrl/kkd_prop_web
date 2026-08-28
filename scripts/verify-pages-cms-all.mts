/**
 * Pages CMS Sprint 11 orchestrator — matrix order steps 1–7 (no screenshots).
 * Standalone: build + start + browser suites + cleanup.
 * From verify-all: pass --server-running --skip-build.
 *
 * Usage:
 *   npx tsx scripts/verify-pages-cms-all.mts
 *   npx tsx scripts/verify-pages-cms-all.mts --server-running --skip-build
 */
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";

const args = new Set(process.argv.slice(2));
const serverRunning = args.has("--server-running");
const skipBuild = args.has("--skip-build");

async function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer()
      .once("error", () => resolve(false))
      .once("listening", () => tester.close(() => resolve(true)))
      .listen(port, "0.0.0.0");
  });
}

function run(cmd: string, runArgs: string[]) {
  console.log(`\n$ ${cmd} ${runArgs.join(" ")}`);
  const result = spawnSync(cmd, runArgs, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`FAILED: ${cmd} ${runArgs.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

async function waitForServer(url: string, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server not ready at ${url} within ${timeoutMs}ms`);
}

console.log("=== Pages CMS verify — step 1: model + calculator ===");
run("npx", ["tsx", "scripts/verify-pages-cms-model.mts"]);
run("npx", ["tsx", "scripts/verify-calculator.mts"]);

if (!skipBuild) {
  console.log("\n=== Pages CMS verify — step 2: build ===");
  run("npm", ["run", "build"]);
}

let server: ReturnType<typeof spawn> | null = null;
let startedServer = false;

try {
  if (!serverRunning) {
    console.log("\n=== Pages CMS verify — step 3: start production server ===");
    if (!(await isPortFree(3000))) {
      console.error(
        "FAILED: port 3000 in use — stop the other process or pass --server-running if verify-all already started the server.",
      );
      process.exit(1);
    }
    server = spawn("npm", ["run", "start"], { stdio: "inherit" });
    startedServer = true;
    await waitForServer("http://localhost:3000/th", 30_000);
  } else {
    await waitForServer("http://localhost:3000/th", 10_000);
  }

  console.log("\n=== Pages CMS verify — step 4: browser suites ===");
  run("npx", ["tsx", "scripts/e2e-pages-cms.mts"]);
  run("npx", ["tsx", "scripts/e2e-rbac-sprint2.mts"]);
} finally {
  if (startedServer && server) {
    server.kill("SIGTERM");
  }
}

console.log("\nverify-pages-cms-all: all gates passed ✓");
