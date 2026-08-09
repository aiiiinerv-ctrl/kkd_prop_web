// Read-only post-deploy smoke test for the shared-hosting production target.
// Runs 4 checks: homepage 200, /admin redirect (307), private file 401,
// plus any number of feature-specific --check/--expect-text pairs.
//
// Usage:
//   npx tsx scripts/smoke-test-production.mts
//   npx tsx scripts/smoke-test-production.mts --check /th/calculator --expect-text "คำนวณ"
//   SMOKE_TEST_BASE_URL=http://localhost:3000 npx tsx scripts/smoke-test-production.mts
//
// All checks are plain GET requests — nothing here writes to the target.

const BASE_URL = (process.env.SMOKE_TEST_BASE_URL ?? "https://kkdproperty.co.th").replace(
  /\/+$/,
  "",
);

type CustomCheck = { path: string; expectText: string };

function parseArgs(argv: string[]): CustomCheck[] {
  const checks: CustomCheck[] = [];
  let pendingPath: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--check") {
      pendingPath = argv[++i];
    } else if (arg === "--expect-text") {
      const expectText = argv[++i];
      if (pendingPath === undefined) {
        throw new Error("--expect-text given without a preceding --check <path>");
      }
      checks.push({ path: pendingPath, expectText });
      pendingPath = undefined;
    } else {
      throw new Error(`Unrecognized argument: ${arg}`);
    }
  }

  if (pendingPath !== undefined) {
    throw new Error(`--check ${pendingPath} given without a matching --expect-text`);
  }

  return checks;
}

let failed = false;

function report(label: string, passed: boolean, detail: string) {
  const mark = passed ? "✓" : "✗";
  console.log(`${label}: ${detail} ${mark}`);
  if (!passed) failed = true;
}

async function checkHomepage() {
  const url = `${BASE_URL}/th`;
  try {
    const res = await fetch(url);
    report("HOMEPAGE", res.status === 200, `GET ${url} -> ${res.status} (expected 200)`);
  } catch (err) {
    report("HOMEPAGE", false, `GET ${url} threw: ${(err as Error).message}`);
  }
}

async function checkAdminRedirect() {
  const url = `${BASE_URL}/admin`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    report("ADMIN_REDIRECT", res.status === 307, `GET ${url} -> ${res.status} (expected 307)`);
  } catch (err) {
    report("ADMIN_REDIRECT", false, `GET ${url} threw: ${(err as Error).message}`);
  }
}

async function checkPrivateFileRejected() {
  const url = `${BASE_URL}/files/private/slips/nonexistent`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    report(
      "PRIVATE_FILE",
      res.status === 401,
      `GET ${url} -> ${res.status} (expected 401, unauthenticated access must be denied)`,
    );
  } catch (err) {
    report("PRIVATE_FILE", false, `GET ${url} threw: ${(err as Error).message}`);
  }
}

async function checkCustom(check: CustomCheck) {
  const url = `${BASE_URL}${check.path}`;
  try {
    const res = await fetch(url);
    const body = await res.text();
    const found = body.includes(check.expectText);
    report(
      "CUSTOM_CHECK",
      res.status === 200 && found,
      `GET ${url} -> ${res.status}, text "${check.expectText}" ${found ? "found" : "NOT found"}`,
    );
  } catch (err) {
    report("CUSTOM_CHECK", false, `GET ${url} threw: ${(err as Error).message}`);
  }
}

const customChecks = parseArgs(process.argv.slice(2));

console.log(`Smoke testing ${BASE_URL} ...\n`);

await checkHomepage();
await checkAdminRedirect();
await checkPrivateFileRejected();
for (const check of customChecks) {
  await checkCustom(check);
}

console.log("");
if (failed) {
  console.error("smoke-test-production: one or more checks FAILED. See output above.");
  process.exit(1);
}
console.log("smoke-test-production: all checks passed ✓");
