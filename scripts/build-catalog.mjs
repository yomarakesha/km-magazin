// Renders public/assets/catalog/index.html to public/km-catalog.pdf (A4).
// Run after editing the catalog source:  npm run build:catalog
// Needs Playwright's chromium (npx playwright install chromium) and network
// access for the Google Fonts the landing uses.
import { chromium } from "@playwright/test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { statSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "public/assets/catalog/index.html");
const out = resolve(root, "public/km-catalog.pdf");

const browser = await chromium.launch();
const page = await browser.newPage();
const problems = [];
page.on("requestfailed", (r) => problems.push(`${r.failure()?.errorText} ${r.url()}`));

await page.goto(pathToFileURL(src).href, { waitUntil: "networkidle" });
// webfonts must be resolved before printing, otherwise the PDF falls back to
// system faces and the type stops matching the landing
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
await browser.close();

if (problems.length) {
  console.error("failed requests:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`km-catalog.pdf: ${(statSync(out).size / 1024 / 1024).toFixed(2)} MB`);
