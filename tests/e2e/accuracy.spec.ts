import { expect, test, type APIRequestContext } from "@playwright/test";
import { apiContext, ownerContext, PREFIX, SLUG_PREFIX } from "./helpers/api";
import { customerPage } from "./helpers/ui";

/** Точность цифр: суммы, скидки и остатки сходятся копейка в копейку, а
 *  продать больше, чем есть на складе, невозможно ни через кассу, ни через
 *  сайт. Товары создаются через API и вычищаются teardown-ом по префиксу. */

const run = Date.now().toString().slice(-8);
let owner: APIRequestContext;
let catId = 0;

async function makeProduct(
  opts: { title: string; slug: string; price: number; stock?: number | null },
): Promise<{ id: number; slug: string }> {
  const res = await owner.post("/api/admin/shop/products", {
    data: {
      slug: opts.slug,
      category_id: catId,
      price: opts.price,
      stock_qty: opts.stock ?? null,
      translations: [{ lang: "ru", title: opts.title, short: "", body: "", specs: [] }],
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const p = await res.json();
  return { id: p.id, slug: p.slug };
}

test.beforeAll(async () => {
  owner = await ownerContext();
  const cats = await (await owner.get("/api/admin/shop/categories")).json();
  catId = cats[0].id;
});
test.afterAll(async () => {
  await owner.dispose();
});

test("корзина: сумма = Σ(цена × количество) по двум товарам", async ({ browser }) => {
  const a = await makeProduct({ title: `${PREFIX}Точность А ${run}`, slug: `${SLUG_PREFIX}acc-a-${run}`, price: 137 });
  const b = await makeProduct({ title: `${PREFIX}Точность Б ${run}`, slug: `${SLUG_PREFIX}acc-b-${run}`, price: 259 });

  const page = await customerPage(browser);
  await page.goto(`/shop/product/${a.slug}`);
  await page.locator("button", { hasText: /в корзину/i }).first().click();
  await page.goto(`/shop/product/${b.slug}`);
  await page.locator("button", { hasText: /в корзину/i }).first().click();

  await page.goto("/shop/cart");
  await expect(page.locator(".shop-cart-item")).toHaveCount(2);
  // 137 + 259 = 396
  await expect(page.locator("body")).toContainText("396");
  await page.context().close();
});

test("промокод-процент считается точно и отражается в заказе", async ({ browser }) => {
  const p = await makeProduct({ title: `${PREFIX}Промо ${run}`, slug: `${SLUG_PREFIX}promo-${run}`, price: 200 });
  const code = `E2E${run}`;
  const promo = await owner.post("/api/admin/shop/promos", {
    data: { code, kind: "percent", value: 10, min_total: 0, active: true },
  });
  expect(promo.ok(), await promo.text()).toBeTruthy();

  const page = await customerPage(browser);
  await page.goto(`/shop/product/${p.slug}`);
  await page.locator("button", { hasText: /в корзину/i }).first().click();
  await page.goto("/shop/checkout");

  const form = page.locator("form.shop-form");
  await form.getByPlaceholder("SALE10").fill(code);
  await form.getByRole("button", { name: "Применить" }).click();
  // 10% от 200 = 20; к оплате 180
  await expect(form.locator(".shop-promo-ok")).toContainText("−20");
  await expect(page.locator(".shop-order-row.total")).toContainText("180");

  await form.locator("input").first().fill(`${PREFIX}Промо-покупатель`);
  await form.locator("input[type='tel']").fill("65123456");
  await form.getByRole("button", { name: "Подтвердить заказ" }).click();
  await expect(page.locator(".shop-order-no")).toBeVisible({ timeout: 10_000 });

  // сервер посчитал так же, как экран
  const orders = await (
    await owner.get(`/api/admin/shop/orders?q=${encodeURIComponent(`${PREFIX}Промо-покупатель`)}`)
  ).json();
  expect(orders.length).toBeGreaterThan(0);
  expect(orders[0].discount).toBe(20);
  expect(orders[0].total).toBe(180);
  await page.context().close();
});

test("недействительный промокод не даёт скидку", async ({ browser }) => {
  const p = await makeProduct({ title: `${PREFIX}БезПромо ${run}`, slug: `${SLUG_PREFIX}nopromo-${run}`, price: 300 });
  const page = await customerPage(browser);
  await page.goto(`/shop/product/${p.slug}`);
  await page.locator("button", { hasText: /в корзину/i }).first().click();
  await page.goto("/shop/checkout");
  const form = page.locator("form.shop-form");
  await form.getByPlaceholder("SALE10").fill("E2ENOSUCH");
  await form.getByRole("button", { name: "Применить" }).click();
  await expect(form.locator(".shop-err", { hasText: "Промокод не действует" })).toBeVisible();
  await expect(page.locator(".shop-order-row.total")).toContainText("300"); // без скидки
  await page.context().close();
});

test("касса не продаёт сверх остатка; остаток не меняется при отказе", async () => {
  const p = await makeProduct({
    title: `${PREFIX}Остаток1 ${run}`,
    slug: `${SLUG_PREFIX}stock1-${run}`,
    price: 50,
    stock: 1,
  });
  const res = await owner.post("/api/admin/pos/sales", {
    data: { items: [{ product_id: p.id, qty: 2 }] },
  });
  expect(res.status()).toBe(409);
  expect(await res.text()).toContain("недостаточно");
  const after = await (await owner.get(`/api/admin/shop/products/${p.id}`)).json();
  expect(after.stock_qty).toBe(1); // ничего не списано
});

test("сайт не даёт заказать распроданный товар", async () => {
  const p = await makeProduct({
    title: `${PREFIX}Ноль ${run}`,
    slug: `${SLUG_PREFIX}zero-${run}`,
    price: 70,
    stock: 0,
  });
  const anon = await apiContext();
  const res = await anon.post("/api/shop/orders", {
    data: {
      customer_name: `${PREFIX}Ноль-заказ`,
      phone: "+99365123456",
      items: [{ kind: "product", id: p.id, qty: 1 }],
    },
  });
  expect([400, 409]).toContain(res.status());
  await anon.dispose();
});

test("приход и списание меняют остаток ровно на указанное", async () => {
  const p = await makeProduct({
    title: `${PREFIX}Движения ${run}`,
    slug: `${SLUG_PREFIX}moves-${run}`,
    price: 10,
    stock: 0,
  });
  const rc = await owner.post("/api/admin/warehouse/movements", {
    data: { product_id: p.id, kind: "receipt", qty: 7, unit_cost: 4 },
  });
  expect(rc.ok(), await rc.text()).toBeTruthy();
  let cur = await (await owner.get(`/api/admin/shop/products/${p.id}`)).json();
  expect(cur.stock_qty).toBe(7);

  const wo = await owner.post("/api/admin/warehouse/movements", {
    data: { product_id: p.id, kind: "writeoff", qty: 3 },
  });
  expect(wo.ok(), await wo.text()).toBeTruthy();
  cur = await (await owner.get(`/api/admin/shop/products/${p.id}`)).json();
  expect(cur.stock_qty).toBe(4);

  // списать больше остатка нельзя
  const over = await owner.post("/api/admin/warehouse/movements", {
    data: { product_id: p.id, kind: "writeoff", qty: 5 },
  });
  expect(over.status()).toBe(409);
});

test("POS: скидка на чеке = подытог − принятая сумма", async () => {
  const p = await makeProduct({
    title: `${PREFIX}Скидка ${run}`,
    slug: `${SLUG_PREFIX}disc-${run}`,
    price: 120,
    stock: 5,
  });
  const sale = await owner.post("/api/admin/pos/sales", {
    data: { items: [{ product_id: p.id, qty: 2 }], sold_total: 200 },
  });
  expect(sale.status(), await sale.text()).toBe(201);
  const s = await sale.json();
  expect(s.subtotal).toBe(240);
  expect(s.sold_total).toBe(200);
  expect(s.discount).toBe(40);
});
