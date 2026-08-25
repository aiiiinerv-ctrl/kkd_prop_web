import { createServer } from "node:http";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const html = readFileSync(
  path.resolve(process.cwd(), "deploy/maintenance/pages-cms-maintenance.html"),
  "utf8"
);
const outputDirectory = path.resolve(
  process.cwd(),
  process.env.MAINTENANCE_EVIDENCE_DIR ?? "docs/plans/assets/pages-cms-result/s01-engine-readiness"
);
mkdirSync(outputDirectory, { recursive: true });

if (/<form\b/i.test(html)) throw new Error("maintenance page must not contain a form");
if (!html.includes("form-action 'none'")) throw new Error("maintenance CSP must block form submission");

const server = createServer((request, response) => {
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Retry-After", "300");
  if (!request.url?.startsWith("/pages-cms-maintenance.html")) {
    response.statusCode = 503;
  }
  response.end(request.method === "HEAD" ? undefined : html);
});

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("maintenance verification server did not bind");
const baseUrl = `http://127.0.0.1:${address.port}`;

const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const requestPath of ["/th/booking", "/admin/pages/home"] as const) {
    const response = await fetch(`${baseUrl}${requestPath}`, { method: "POST" });
    if (response.status !== 503) throw new Error(`${requestPath} POST returned ${response.status}, expected 503`);
    const body = await response.text();
    if (!body.includes("ถูกปิดรับข้อมูลชั่วคราว") || /สำเร็จ|successfully submitted/i.test(body)) {
      throw new Error(`${requestPath} POST could falsely communicate a successful save`);
    }
  }

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ] as const) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    for (const language of ["th", "en"] as const) {
      const response = await page.goto(`${baseUrl}/?lang=${language}`);
      if (response?.status() !== 503) throw new Error(`${language}/${viewport.name} GET was not 503`);
      const visibleHeading = language === "th" ? "ขออภัย เว็บไซต์ปิดให้บริการชั่วคราว" : "We’ll be back shortly.";
      await page.getByRole("heading", { name: visibleHeading }).waitFor();
      await page.waitForTimeout(600);
      if ((await page.locator("html").getAttribute("lang")) !== language) {
        throw new Error(`${language}/${viewport.name} document language was incorrect`);
      }
      await page.screenshot({
        path: path.join(outputDirectory, `maintenance-${language}-${viewport.name}.png`),
        fullPage: true,
      });
    }
    await page.close();
  }
  console.log("MAINTENANCE_TH_DESKTOP=PASS");
  console.log("MAINTENANCE_EN_DESKTOP=PASS");
  console.log("MAINTENANCE_TH_MOBILE=PASS");
  console.log("MAINTENANCE_EN_MOBILE=PASS");
  console.log("PUBLIC_POST_STATUS=503");
  console.log("ADMIN_POST_STATUS=503");
  console.log("MAINTENANCE_GET_STATUS=503");
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
