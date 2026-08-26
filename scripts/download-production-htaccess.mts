/**
 * download-production-htaccess.mts — GET-only download of production .htaccess.
 *
 * NEVER uses CMD_FILE_MANAGER action=edit. A POST edit without `text` truncates
 * the file to 0 bytes (2026-08-26 outage). See
 * docs/plans/kkd-shared-hosting-redeploy-runbook.md.
 *
 * Writes the raw file under $TMPDIR (outside the repo). Prints only a
 * structural summary — never prints SetEnv values or other secrets.
 *
 * Usage: npx tsx scripts/download-production-htaccess.mts
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";

function loadHostingPanelEnv(): Record<string, string> {
  const file = path.resolve(process.cwd(), ".env.hosting-panel");
  if (!existsSync(file)) {
    throw new Error(".env.hosting-panel is missing");
  }
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function requireEnv(env: Record<string, string>, key: string): string {
  const value = env[key];
  if (!value) throw new Error(`${key} is not set in .env.hosting-panel`);
  return value;
}

function structuralSummary(content: string): void {
  const bytes = Buffer.byteLength(content, "utf8");
  console.log(`bytes=${bytes}`);
  console.log(`empty=${content.trim().length === 0}`);

  const markers: [string, RegExp][] = [
    ["CLOUDLINUX_PASSENGER_BEGIN", /CLOUDLINUX PASSENGER CONFIGURATION BEGIN/i],
    ["CLOUDLINUX_PASSENGER_END", /CLOUDLINUX PASSENGER CONFIGURATION END/i],
    ["PassengerAppRoot", /\bPassengerAppRoot\b/],
    ["PassengerNodejs", /\bPassengerNodejs\b/],
    ["PassengerStartupFile", /\bPassengerStartupFile\b/],
    ["CLOUDLINUX_ENV_BEGIN", /CLOUDLINUX ENV VARS CONFIGURATION BEGIN/i],
    ["CLOUDLINUX_ENV_END", /CLOUDLINUX ENV VARS CONFIGURATION END/i],
    ["SetEnv_present", /\bSetEnv\b/],
    ["CANONICAL_WWW_REDIRECT", /www\\.kkdproperty\\.co\\.th/],
    ["MAINTENANCE_503", /ErrorDocument\s+503/i],
    ["MAINTENANCE_REWRITE", /RewriteRule\s+\^\s+-\s+\[R=503/i],
    ["BACKUP_PATH_EXCLUSION", /api\/operations\/pages-cms-backup/],
  ];

  for (const [name, pattern] of markers) {
    console.log(`${pattern.test(content) ? "OK" : "MISS"} ${name}`);
  }

  // Count SetEnv keys without printing values.
  const keys = [...content.matchAll(/^\s*SetEnv\s+(\S+)/gm)].map((m) => m[1]);
  console.log(`setenv_key_count=${keys.length}`);
  console.log(`setenv_keys=${keys.sort().join(",")}`);
}

async function main(): Promise<void> {
  const env = loadHostingPanelEnv();
  const username = requireEnv(env, "HOSTING_PANEL_USERNAME");
  const password = requireEnv(env, "HOSTING_PANEL_PASSWORD");
  const panelUrl = requireEnv(env, "HOSTING_PANEL_URL").replace(/\/$/, "");

  // GET path form only — never action=edit.
  const url = `${panelUrl}/CMD_FILE_MANAGER/domains/kkdproperty.co.th/public_html/.htaccess`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`download failed: HTTP ${response.status}`);
  }

  const content = await response.text();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(tmpdir(), "kkd-htaccess");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `htaccess-${stamp}.txt`);
  writeFileSync(outPath, content, "utf8");

  console.log(`saved=${outPath}`);
  console.log("note=raw file is outside the repo; do not commit or paste it");
  structuralSummary(content);

  if (content.trim().length === 0) {
    process.exitCode = 2;
    console.error("✗ .htaccess is empty — site will be down; recover via Node.js Selector Save");
  }
}

main().catch((error) => {
  console.error(`✗ download-production-htaccess: ${(error as Error).message}`);
  process.exitCode = 1;
});
