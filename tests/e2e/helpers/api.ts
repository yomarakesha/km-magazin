import fs from "node:fs";
import path from "node:path";
import { request as pwRequest, type APIRequestContext, type APIResponse } from "@playwright/test";

/** Shared plumbing for the E2E suite: authenticated API contexts per role and
 *  a cleanup that removes everything the tests created (all test data carries
 *  the E2E- / e2e- prefix) from the live dev database. */

export const API = process.env.PW_API_URL || "http://localhost:8000";
export const ROOT = path.resolve(__dirname, "..", "..", "..");

/** Prefixes that mark test data. Cleanup removes ONLY entities carrying them. */
export const PREFIX = "E2E-"; // display names: customers, suppliers, leads, product titles
export const SLUG_PREFIX = "e2e-"; // slugs, usernames, SKUs

export const STAFF_PASSWORD = "E2e-tests-12345";
export const STAFF = {
  content: `${SLUG_PREFIX}content`,
  warehouse: `${SLUG_PREFIX}warehouse`,
  sales: `${SLUG_PREFIX}sales`,
} as const;

const HERO_BACKUP = path.join(ROOT, "tests", "e2e", ".hero-backup.json");

let envCache: Record<string, string> | null = null;
function backendEnv(): Record<string, string> {
  if (!envCache) {
    envCache = {};
    const raw = fs.readFileSync(path.join(ROOT, "backend", ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) envCache[m[1]] = m[2].trim();
    }
  }
  return envCache;
}

export const adminPassword = (): string =>
  process.env.PW_ADMIN_PASSWORD || backendEnv().ADMIN_PASSWORD || "admin";

/** Backend rate limiter honors this shared secret (x-internal-key); tests send
 *  it so repeated logins/orders never trip the per-IP 429 and flake the run. */
const internalKey = (): string => backendEnv().REVALIDATE_SECRET || "";

export function internalHeaders(): Record<string, string> {
  const key = internalKey();
  return key ? { "x-internal-key": key } : {};
}

export async function apiContext(): Promise<APIRequestContext> {
  return pwRequest.newContext({ baseURL: API, extraHTTPHeaders: internalHeaders() });
}

async function ok(res: APIResponse, what: string): Promise<APIResponse> {
  if (!res.ok()) throw new Error(`${what}: HTTP ${res.status()} ${await res.text()}`);
  return res;
}

export async function loginContext(username: string, password: string): Promise<APIRequestContext> {
  const ctx = await apiContext();
  await ok(await ctx.post("/api/auth/login", { data: { username, password } }), `login ${username}`);
  return ctx;
}

export const ownerContext = (): Promise<APIRequestContext> =>
  loginContext("admin", adminPassword());

/** Create the three staff accounts (idempotent: 409 "already exists" is fine). */
export async function ensureStaff(owner: APIRequestContext): Promise<void> {
  for (const [role, username] of Object.entries(STAFF)) {
    const res = await owner.post("/api/admin/users", {
      data: { username, password: STAFF_PASSWORD, role },
    });
    if (!res.ok() && res.status() !== 409) {
      throw new Error(`create ${username}: HTTP ${res.status()} ${await res.text()}`);
    }
  }
}

/** Snapshot a content block to disk so a crashed run can still restore it. */
export async function backupBlock(owner: APIRequestContext, lang: string, key: string): Promise<void> {
  if (fs.existsSync(HERO_BACKUP)) return; // keep the oldest (pre-test) snapshot
  const all = await (await ok(await owner.get("/api/admin/content"), "get content")).json();
  const data = all.blocks?.[lang]?.[key];
  if (data) fs.writeFileSync(HERO_BACKUP, JSON.stringify({ lang, key, data }), "utf8");
}

async function restoreBlock(owner: APIRequestContext, log: string[]): Promise<void> {
  if (!fs.existsSync(HERO_BACKUP)) return;
  const { lang, key, data } = JSON.parse(fs.readFileSync(HERO_BACKUP, "utf8"));
  await ok(
    await owner.put(`/api/admin/content/${lang}/${key}`, { data: { data } }),
    `restore content ${lang}/${key}`,
  );
  fs.unlinkSync(HERO_BACKUP);
  log.push(`content ${lang}/${key} restored`);
}

/** Remove every entity the tests created. Runs before AND after the suite so a
 *  previously crashed run can never leave junk in the live database. */
export async function cleanupAll(): Promise<string[]> {
  const removed: string[] = [];
  const owner = await ownerContext();
  try {
    await restoreBlock(owner, removed);

    // POS sales that contain a test product (void gives tracked stock back)
    const sales: Array<{ id: number; items: Array<{ title: string }> }> = await (
      await ok(
        await owner.get("/api/admin/pos/sales?date_from=2000-01-01&date_to=2100-01-01"),
        "list sales",
      )
    ).json();
    for (const s of sales) {
      if (s.items.some((it) => (it.title || "").startsWith(PREFIX))) {
        await ok(await owner.post(`/api/admin/pos/sales/${s.id}/void`), `void sale ${s.id}`);
        removed.push(`sale #${s.id}`);
      }
    }

    // shop orders placed by the test customer
    const orders: Array<{ id: number; customer_name: string }> = await (
      await ok(await owner.get("/api/admin/shop/orders"), "list orders")
    ).json();
    for (const o of orders) {
      if ((o.customer_name || "").startsWith(PREFIX)) {
        await ok(await owner.delete(`/api/admin/shop/orders/${o.id}`), `delete order ${o.id}`);
        removed.push(`order #${o.id}`);
      }
    }

    // landing leads
    const leads: Array<{ id: number; name: string }> = await (
      await ok(await owner.get("/api/admin/leads"), "list leads")
    ).json();
    for (const l of leads) {
      if ((l.name || "").startsWith(PREFIX)) {
        await ok(await owner.delete(`/api/admin/leads/${l.id}`), `delete lead ${l.id}`);
        removed.push(`lead #${l.id}`);
      }
    }

    // promo codes
    const promos: Array<{ id: number; code: string }> = await (
      await ok(await owner.get("/api/admin/shop/promos"), "list promos")
    ).json();
    for (const p of promos) {
      if ((p.code || "").startsWith("E2E")) {
        await ok(await owner.delete(`/api/admin/shop/promos/${p.id}`), `delete promo ${p.id}`);
        removed.push(`promo ${p.code}`);
      }
    }

    // products
    const products: Array<{ id: number; slug: string }> = await (
      await ok(await owner.get("/api/admin/shop/products"), "list products")
    ).json();
    for (const p of products) {
      if ((p.slug || "").startsWith(SLUG_PREFIX)) {
        await ok(await owner.delete(`/api/admin/shop/products/${p.id}`), `delete product ${p.id}`);
        removed.push(`product ${p.slug}`);
      }
    }

    // suppliers
    const suppliers: Array<{ id: number; name: string }> = await (
      await ok(await owner.get("/api/admin/warehouse/suppliers"), "list suppliers")
    ).json();
    for (const s of suppliers) {
      if ((s.name || "").startsWith(PREFIX)) {
        await ok(await owner.delete(`/api/admin/warehouse/suppliers/${s.id}`), `delete supplier ${s.id}`);
        removed.push(`supplier ${s.name}`);
      }
    }

    // staff accounts
    const users: Array<{ id: number; username: string }> = await (
      await ok(await owner.get("/api/admin/users"), "list users")
    ).json();
    for (const u of users) {
      if ((u.username || "").startsWith(SLUG_PREFIX)) {
        await ok(await owner.delete(`/api/admin/users/${u.id}`), `delete user ${u.username}`);
        removed.push(`user ${u.username}`);
      }
    }
  } finally {
    await owner.dispose();
  }
  return removed;
}
