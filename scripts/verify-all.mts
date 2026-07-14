// Runs the full verify pipeline (build + production server + all e2e suites)
// as one command, per .claude/skills/verify/SKILL.md step 2-3.
// Usage: npx tsx scripts/verify-all.mts
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";

async function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer()
      .once("error", () => resolve(false))
      .once("listening", () => tester.close(() => resolve(true)))
      .listen(port, "0.0.0.0");
  });
}

function run(cmd: string, args: string[]) {
  console.log(`\n$ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`FAILED: ${cmd} ${args.join(" ")}`);
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
  throw new Error(`Server did not become ready at ${url} within ${timeoutMs}ms`);
}

console.log("=== 1/3: build ===");
run("npm", ["run", "build"]);

console.log("\n=== 2/3: start production server ===");
if (!(await isPortFree(3000))) {
  console.error(
    "FAILED: port 3000 is already in use by another process — verify-all needs a clean production server, not a stray dev/other server. Stop whatever is bound to :3000 and re-run.\n" +
      "Find it with: lsof -nP -iTCP:3000 -sTCP:LISTEN",
  );
  process.exit(1);
}
const server = spawn("npm", ["run", "start"], { stdio: "inherit" });

const suites = [
  "scripts/e2e-booking.mts",
  "scripts/e2e-admin.mts",
  "scripts/e2e-admin-crud.mts",
];

let failed = false;
try {
  await waitForServer("http://localhost:3000/th", 30_000);

  console.log("\n=== 3/3: e2e suites ===");
  for (const suite of suites) {
    console.log(`\n--- ${suite} ---`);
    const result = spawnSync("npx", ["tsx", suite], { stdio: "inherit" });
    if (result.status !== 0) {
      console.error(`FAILED: ${suite}`);
      failed = true;
    }
  }
} finally {
  server.kill("SIGTERM");
}

if (failed) {
  console.error("\nverify-all: one or more e2e suites failed. See output above.");
  process.exit(1);
}
console.log("\nverify-all: build + all e2e suites passed ✓");
