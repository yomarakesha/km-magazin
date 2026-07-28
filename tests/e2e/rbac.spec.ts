import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  apiContext,
  ensureStaff,
  loginContext,
  ownerContext,
  SLUG_PREFIX,
  STAFF,
  STAFF_PASSWORD,
} from "./helpers/api";
import { staffPage } from "./helpers/ui";

/** Границы ролей: каждый сотрудник заперт в своей зоне, и API отвечает
 *  честным 403, а не молчаливым успехом. Владелец проходит везде. */

let owner: APIRequestContext;
let content: APIRequestContext;
let warehouse: APIRequestContext;
let sales: APIRequestContext;
let productId = 0;

test.beforeAll(async () => {
  owner = await ownerContext();
  await ensureStaff(owner);
  content = await loginContext(STAFF.content, STAFF_PASSWORD);
  warehouse = await loginContext(STAFF.warehouse, STAFF_PASSWORD);
  sales = await loginContext(STAFF.sales, STAFF_PASSWORD);

  // общий подопытный товар (владелец создаёт, teardown удалит по префиксу)
  const cats = await (await owner.get("/api/admin/shop/categories")).json();
  const res = await owner.post("/api/admin/shop/products", {
    data: {
      slug: `${SLUG_PREFIX}rbac-${Date.now()}`,
      category_id: cats[0].id,
      price: 100,
      translations: [{ lang: "ru", title: "E2E-RBAC товар", short: "", body: "", specs: [] }],
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  productId = (await res.json()).id;
});

test.afterAll(async () => {
  for (const ctx of [owner, content, warehouse, sales]) await ctx?.dispose();
});

test("контент не может: цены, штрихкод, POS, пользователи, отчёты продаж", async () => {
  expect((await content.put(`/api/admin/shop/products/${productId}`, { data: { price: 999 } })).status()).toBe(403);
  expect((await content.put(`/api/admin/shop/products/${productId}`, { data: { barcode: "111222333" } })).status()).toBe(403);
  expect((await content.post("/api/admin/pos/sales", { data: { items: [{ product_id: productId, qty: 1 }] } })).status()).toBe(403);
  expect((await content.get("/api/admin/users")).status()).toBe(403);
  expect((await content.get("/api/admin/reports/sales")).status()).toBe(403);
});

test("складчик не может: цены, тексты товара, промокоды, пользователи", async () => {
  expect((await warehouse.put(`/api/admin/shop/products/${productId}`, { data: { price: 999 } })).status()).toBe(403);
  expect(
    (
      await warehouse.put(`/api/admin/shop/products/${productId}`, {
        data: { translations: [{ lang: "ru", title: "hack", short: "", body: "", specs: [] }] },
      })
    ).status(),
  ).toBe(403);
  expect((await warehouse.get("/api/admin/shop/promos")).status()).toBe(403);
  expect((await warehouse.get("/api/admin/users")).status()).toBe(403);
});

test("кассир не может: склад, контент-тексты, пользователи, void чека", async () => {
  expect((await sales.post("/api/admin/warehouse/suppliers", { data: { name: "hack" } })).status()).toBe(403);
  expect(
    (
      await sales.post("/api/admin/warehouse/movements", {
        data: { product_id: productId, kind: "receipt", qty: 5 },
      })
    ).status(),
  ).toBe(403);
  expect((await sales.put("/api/admin/content/ru/hero", { data: { data: {} } })).status()).toBe(403);
  expect((await sales.get("/api/admin/users")).status()).toBe(403);
  // void — только владелец: сначала кассир продаёт (без учёта остатка — stock_qty null)
  const sale = await sales.post("/api/admin/pos/sales", {
    data: { items: [{ product_id: productId, qty: 1 }] },
  });
  expect(sale.status()).toBe(201);
  const saleId = (await sale.json()).id;
  expect((await sales.post(`/api/admin/pos/sales/${saleId}/void`)).status()).toBe(403);
  // владелец может (и заодно прибирает за тестом)
  expect((await owner.post(`/api/admin/pos/sales/${saleId}/void`)).ok()).toBeTruthy();
});

test("зоны позитивно: каждый может своё", async () => {
  // контент — правит текст карточки
  const tr = await content.put(`/api/admin/shop/products/${productId}`, {
    data: { translations: [{ lang: "ru", title: "E2E-RBAC товар (ред.)", short: "", body: "", specs: [] }] },
  });
  expect(tr.ok(), await tr.text()).toBeTruthy();
  // складчик — приход
  const mv = await warehouse.post("/api/admin/warehouse/movements", {
    data: { product_id: productId, kind: "receipt", qty: 3 },
  });
  expect(mv.ok(), await mv.text()).toBeTruthy();
  // кассир — смотрит продажи и заказы
  expect((await sales.get("/api/admin/pos/sales")).ok()).toBeTruthy();
  expect((await sales.get("/api/admin/shop/orders")).ok()).toBeTruthy();
  // складчик — видит стоки, но не деньги заказов? (список заказов складчику нужен для сборки)
  expect((await warehouse.get("/api/admin/warehouse/stock")).ok()).toBeTruthy();
});

test("неавторизованный получает 401 на всё админское", async () => {
  const anon = await apiContext();
  for (const url of [
    "/api/admin/users",
    "/api/admin/shop/products",
    "/api/admin/warehouse/stock",
    "/api/admin/pos/sales",
    "/api/admin/leads",
  ]) {
    expect((await anon.get(url)).status(), url).toBe(401);
  }
  await anon.dispose();
});

test("UI: складчик не видит чужих разделов в меню, маршрут закрыт", async ({ browser }) => {
  const page = await staffPage(browser, "warehouse");
  await page.goto("/admin");
  const nav = page.locator(".adm-side nav");
  await expect(nav).toBeVisible();
  await expect(nav).toContainText("Склад");
  await expect(nav).toContainText("Закупки");
  await expect(nav).not.toContainText("Пользователи");
  await expect(nav).not.toContainText("Касса");
  await expect(nav).not.toContainText("Тексты");
  await page.context().close();
});
