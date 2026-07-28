import { mkdir, writeFile, cp, rm } from "node:fs/promises";
import { dirname } from "node:path";

const LOCAL_HOST = "http://localhost:3000";
const OUT_DIR = "static-preview";

const LOCALES = ["th", "en"];
const PAGES = ["about", "booking", "calculator", "contact", "packages", "portfolio", "services", "testimonials"];

async function run() {
  console.log("Starting static preview generation...");

  // 1. Clean output directory
  try {
    await rm(OUT_DIR, { recursive: true, force: true });
  } catch (err) {}
  await mkdir(OUT_DIR, { recursive: true });

  // 2. Generate list of paths
  const paths: string[] = [];

  for (const locale of LOCALES) {
    // Base pages
    paths.push(`/${locale}`);
    for (const page of PAGES) {
      paths.push(`/${locale}/${page}`);
    }
  }

  // 3. Crawl root redirect page (/) -> maps to static-preview/index.html
  try {
    const res = await fetch(`${LOCAL_HOST}/`);
    if (res.ok) {
      const html = await res.text();
      await writeFile(`${OUT_DIR}/index.html`, html, "utf-8");
      console.log("CRAWLED: / -> index.html ✓");
    } else {
      console.error(`FAILED to fetch root page: ${res.status}`);
    }
  } catch (err) {
    console.error("FAILED to fetch root page:", err);
  }

  // 4. Crawl all pages
  let successCount = 0;
  let failCount = 0;

  for (const path of paths) {
    const url = `${LOCAL_HOST}${path}`;
    
    // Determine output file path
    // e.g. /th -> static-preview/th.html
    // e.g. /th/about -> static-preview/th/about.html
    // e.g. /th/theme-1 -> static-preview/th/theme-1.html
    // e.g. /th/theme-1/about -> static-preview/th/theme-1/about.html
    const segments = path.split("/").filter(Boolean);
    let outPath = OUT_DIR;
    if (segments.length === 1) {
      outPath += `/${segments[0]}.html`;
    } else if (segments.length === 2) {
      outPath += `/${segments[0]}/${segments[1]}.html`;
    } else {
      outPath += `/${segments.slice(0, -1).join("/")}/${segments[segments.length - 1]}.html`;
    }

    try {
      const res = await fetch(url);
      if (res.ok) {
        let html = await res.text();
        
        await mkdir(dirname(outPath), { recursive: true });
        await writeFile(outPath, html, "utf-8");
        successCount++;
        console.log(`CRAWLED: ${path} -> ${outPath} ✓`);
      } else {
        console.error(`FAILED ${path}: ${res.status}`);
        failCount++;
      }
    } catch (err) {
      console.error(`FAILED ${path}:`, err);
      failCount++;
    }
  }

  console.log(`Crawl completed. Success: ${successCount}, Failed: ${failCount}`);

  // 5. Copy .next/static to static-preview/_next/static
  console.log("Copying Next.js static assets...");
  await mkdir(`${OUT_DIR}/_next`, { recursive: true });
  await cp(".next/static", `${OUT_DIR}/_next/static`, { recursive: true });

  // 6. Copy public/ directory files to static-preview/
  console.log("Copying public assets...");
  await cp("public", OUT_DIR, { recursive: true });

  // 7. Copy storage/public/ to static-preview/files/public/
  console.log("Copying storage/public assets...");
  try {
    await cp("storage/public", `${OUT_DIR}/files/public`, { recursive: true });
  } catch (err) {
    console.warn("Warning: Could not copy storage/public assets:", err);
  }

  console.log("Static preview generation finished successfully!");
}

run().catch((err) => {
  console.error("Fatal error during preview generation:", err);
  process.exit(1);
});
