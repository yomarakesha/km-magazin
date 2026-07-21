import type { Browser, BrowserContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { API, adminPassword, internalHeaders, STAFF, STAFF_PASSWORD } from "./api";

/** Browser-side helpers: role sessions and small UX utilities. */

export type StaffRole = keyof typeof STAFF; // content | warehouse | sales

/** Open a browser context already logged in as the given admin user. The login
 *  POST goes through the context's request so the km_admin cookie lands in the
 *  browser's jar (localhost cookies ignore the port, so :3000 pages send it to
 *  the :8000 API automatically). */
export async function loginContextAs(
  browser: Browser,
  username: string,
  password: string,
): Promise<BrowserContext> {
  const ctx = await browser.newContext({ extraHTTPHeaders: internalHeaders() });
  const res = await ctx.request.post(`${API}/api/auth/login`, {
    data: { username, password },
  });
  if (!res.ok()) throw new Error(`UI login ${username}: HTTP ${res.status()} ${await res.text()}`);
  return ctx;
}

export const ownerPage = async (browser: Browser): Promise<Page> =>
  (await loginContextAs(browser, "admin", adminPassword())).newPage();

export const staffPage = async (browser: Browser, role: StaffRole): Promise<Page> =>
  (await loginContextAs(browser, STAFF[role], STAFF_PASSWORD)).newPage();

/** Anonymous shopper context (no admin cookie, internal key to dodge rate limits). */
export const customerPage = async (browser: Browser): Promise<Page> =>
  (await browser.newContext({ extraHTTPHeaders: internalHeaders() })).newPage();

/** Reload the page until the locator shows the expected text (content edits
 *  reach the landing via cache revalidation, which is near-instant but async). */
export async function reloadUntilVisible(
  page: Page,
  selector: string,
  text: string,
  { attempts = 6, delayMs = 2000 }: { attempts?: number; delayMs?: number } = {},
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await expect(page.locator(selector).filter({ hasText: text }).first()).toBeVisible({
        timeout: delayMs,
      });
      return;
    } catch {
      await page.reload({ waitUntil: "domcontentloaded" });
    }
  }
  await expect(page.locator(selector).filter({ hasText: text }).first()).toBeVisible();
}
