/**
 * pma-readonly-query.mts — run ONE SELECT/SHOW statement against production
 * through phpMyAdmin's own SSO + AJAX SQL endpoint.
 *
 * Proven path (docs/plans/pages-cms-innodb-conversion-runbook.md, Gate A):
 *   1. POST /api/phpmyadmin-sso/database-access/{database} (basic auth) ->
 *      one-time login URL into phpMyAdmin.
 *   2. GET that URL with a cookie jar -> establishes SignonSession; scrape
 *      the CSRF `token` from `name="token" value="..."`.
 *   3. POST index.php?route=/sql (db, token, sql_query, ajax_request=true)
 *      -> JSON with the result table embedded (HTML) in `.message`.
 *
 * HARD SAFETY GUARD: refuses to send anything that isn't SELECT/SHOW.
 * DDL must be run by a human directly in the phpMyAdmin SQL tab — never
 * through this script. See the redeploy runbook's "schema first" rule.
 *
 * Usage: npx tsx scripts/pma-readonly-query.mts "SELECT 1"
 */
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadHostingPanelEnv(): Record<string, string> {
  const file = path.resolve(process.cwd(), ".env.hosting-panel");
  if (!existsSync(file)) throw new Error(".env.hosting-panel is missing");
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

function assertReadOnly(sql: string): void {
  const normalized = sql.trim().replace(/^\(+/, "").toUpperCase();
  if (!/^(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN)\b/.test(normalized)) {
    throw new Error(
      `refusing to run non-read-only statement through the agent path: ${sql.slice(0, 60)}`
    );
  }
  const forbidden = /\b(ALTER|CREATE|DROP|INSERT|UPDATE|DELETE|REPLACE|TRUNCATE|GRANT|REVOKE)\b/;
  if (forbidden.test(normalized)) {
    throw new Error("refusing: statement contains a DDL/DML keyword — run this in phpMyAdmin by hand");
  }
}

type CookieJar = Map<string, string>;

function cookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function absorbSetCookie(jar: CookieJar, headers: Headers): void {
  const raw = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

async function main(): Promise<void> {
  const sql = process.argv[2];
  if (!sql) {
    console.error("usage: npx tsx scripts/pma-readonly-query.mts \"SELECT ...\"");
    process.exitCode = 1;
    return;
  }
  assertReadOnly(sql);

  const env = loadHostingPanelEnv();
  const username = requireEnv(env, "HOSTING_PANEL_USERNAME");
  const password = requireEnv(env, "HOSTING_PANEL_PASSWORD");
  const panelUrl = requireEnv(env, "HOSTING_PANEL_URL").replace(/\/$/, "");
  const database = process.env.PMA_DATABASE ?? "kkdprop1_kkdproperty";
  const auth = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

  const jar: CookieJar = new Map();
  const ssoResp = await fetch(`${panelUrl}/api/phpmyadmin-sso/database-access/${database}`, {
    method: "POST",
    headers: { Authorization: auth },
  });
  absorbSetCookie(jar, ssoResp.headers);
  if (!ssoResp.ok) throw new Error(`sso request failed: HTTP ${ssoResp.status}`);
  const ssoBody = (await ssoResp.json()) as { url?: string; redirect?: string; [k: string]: unknown };
  if (process.env.PMA_DEBUG) console.error(`debug_sso_body=${JSON.stringify(ssoBody)}`);
  const loginUrl = ssoBody.url ?? ssoBody.redirect ?? Object.values(ssoBody).find((v) => typeof v === "string" && v.includes("http"));
  if (!loginUrl || typeof loginUrl !== "string") {
    throw new Error(`no login url in sso response: ${JSON.stringify(ssoBody).slice(0, 200)}`);
  }
  if (process.env.PMA_DEBUG) console.error(`debug_login_url=${loginUrl} debug_sso_cookies=${[...jar.keys()].join(",")}`);

  // Follow redirects manually — the session cookie is set on an intermediate
  // 302 (from the one-time sso.php script), which `redirect: "follow"` would
  // silently discard because only the final response's headers are visible.
  let currentUrl = loginUrl;
  let loginResp: Response | undefined;
  for (let hop = 0; hop < 10; hop++) {
    loginResp = await fetch(currentUrl, {
      redirect: "manual",
      headers: jar.size > 0 ? { Cookie: cookieHeader(jar) } : {},
    });
    absorbSetCookie(jar, loginResp.headers);
    if (process.env.PMA_DEBUG) {
      console.error(
        `debug_hop_${hop}=${currentUrl} status=${loginResp.status} location=${loginResp.headers.get("location") ?? ""} cookies_now=${[...jar.keys()].join(",")}`
      );
    }
    if (loginResp.status >= 300 && loginResp.status < 400) {
      const location = loginResp.headers.get("location");
      if (!location) break;
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    break;
  }
  if (!loginResp) throw new Error("no response received while following sso redirects");
  const loginHtml = await loginResp.text();
  if (process.env.PMA_DEBUG) {
    console.error(`debug_html_snippet=${loginHtml.slice(0, 500).replace(/\n/g, " ")}`);
    console.error(`debug_has_logout=${/logout|Log out|Sign out/i.test(loginHtml)}`);
    console.error(`debug_has_loginform=${/name="login_form"|pma_username/i.test(loginHtml)}`);
  }
  const tokenMatch = loginHtml.match(/name="token"\s+value="([^"]+)"/);
  if (!tokenMatch) throw new Error("could not find CSRF token on phpMyAdmin landing page");
  const token = tokenMatch[1];

  if (process.env.PMA_DEBUG) {
    console.error(`debug_final_url=${loginResp.url}`);
    console.error(`debug_cookies=${[...jar.keys()].join(",")}`);
  }

  const pmaOrigin = new URL(loginResp.url).origin;
  const pmaBasePath = new URL(loginResp.url).pathname.replace(/index\.php.*$/, "").replace(/\/$/, "");
  if (process.env.PMA_DEBUG) console.error(`debug_pma_base=${pmaOrigin}${pmaBasePath}`);
  const sqlResp = await fetch(`${pmaOrigin}${pmaBasePath}/index.php?route=/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
    },
    body: new URLSearchParams({
      db: database,
      token,
      sql_query: sql,
      ajax_request: "true",
    }).toString(),
  });
  absorbSetCookie(jar, sqlResp.headers);
  if (!sqlResp.ok) throw new Error(`sql request failed: HTTP ${sqlResp.status}`);
  const sqlBody = (await sqlResp.json()) as { success?: boolean; message?: string; error?: string };
  if (process.env.PMA_DEBUG) console.error(`debug_sql_body=${JSON.stringify(sqlBody).slice(0, 2000)}`);

  if (sqlBody.success === false) {
    console.error(`query_error=${sqlBody.error ?? "unknown"}`);
    process.exitCode = 1;
    return;
  }

  const message = sqlBody.message ?? "";
  const emptyMatch = message.match(/empty result set[^(]*\(([^)]*)\)/i);
  const timingMatch = message.match(/Showing rows[^(]*\(([^)]*)\)/i);
  console.log(`query=${sql}`);
  if (emptyMatch) {
    console.log(`live_execution_marker=EMPTY_RESULT (${emptyMatch[1]})`);
    console.log("result_row_count=0");
    return;
  }
  console.log(`live_execution_marker=${timingMatch ? timingMatch[0] : "NOT_FOUND"}`);

  // Column headers: <th ...><a ...>ColName</a>...</th> inside <thead>.
  const headMatch = message.match(/<thead>([\s\S]*?)<\/thead>/);
  const headers = headMatch
    ? [...headMatch[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) =>
        m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()
      ).filter((h) => h.length > 0)
    : [];

  // Data rows: <tbody>...<tr>...<td class="data">value</td>...</tr>...</tbody>
  const bodyMatch = message.match(/<tbody>([\s\S]*?)<\/tbody>/);
  const rowMatches = bodyMatch ? [...bodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)] : [];
  console.log(`result_row_count=${rowMatches.length}`);
  if (headers.length > 0) console.log(`columns=${headers.join(" | ")}`);
  for (const row of rowMatches) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim()
    ).filter((_, i, arr) => arr.length > 0);
    if (cells.length > 0) console.log(cells.join(" | "));
  }
  if (rowMatches.length === 0 && !timingMatch) {
    console.log(`raw_message_snippet=${message.replace(/\s+/g, " ").slice(0, 400)}`);
  }
}

main().catch((error) => {
  console.error(`✗ pma-readonly-query: ${(error as Error).message}`);
  process.exitCode = 1;
});
