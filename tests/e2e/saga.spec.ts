import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  adminPassword,
  backupBlock,
  ownerContext,
  PREFIX,
  SLUG_PREFIX,
  STAFF,
  STAFF_PASSWORD,
} from "./helpers/api";
import { customerPage, loginContextAs, reloadUntilVisible, staffPage } from "./helpers/ui";

/** Полная имитация коммерса на живом стеке, строго по ролям:
 *  владелец нанимает сотрудников → контент правит лендинг и заводит карточку
 *  товара → владелец назначает цену → складчик делает приход и вешает штрихкод
 *  → кассир продаёт на POS → покупатель заказывает на сайте → владелец
 *  подтверждает заказ → лид с лендинга падает в админку → отчёты сходятся.
 *  Все данные с префиксом E2E-/e2e-; global-teardown возвращает базу как было. */

const run = Date.now().toString().slice(-8);
const PRODUCT_TITLE = `${PREFIX}Роутер ${run}`;
const PRODUCT_SLUG = `${SLUG_PREFIX}router-${run}`;
const SKU = `${SLUG_PREFIX}sku-${run}`;
const BARCODE = `29${run}00`;
const SUPPLIER = `${PREFIX}Поставщик ${run}`;
const CUSTOMER = `${PREFIX}Покупатель`;
const LEAD_NAME = `${PREFIX}Лид ${run}`;
const KICKER = `${PREFIX}Кикер ${run}`;

const COST = 100; // закупочная за шт.
const PRICE = 150; // розничная
const RECEIVED = 10; // приход
const POS_QTY = 2; // продажа на кассе
const ORDER_QTY = 1; // онлайн-заказ

let owner: APIRequestContext;
let productId = 0;
let orderId = 0;

test.describe.serial("сага коммерса", () => {
  test.beforeAll(async () => {
    owner = await ownerContext();
    await backupBlock(owner, "ru", "hero");
  });
  test.afterAll(async () => {
    await owner.dispose();
  });

  test("1. владелец входит через форму и нанимает сотрудников", async ({ browser }) => {
    const ctx = await loginContextAs(browser, "admin", adminPassword());
    const page = await ctx.newPage();
    // очищаем куку, чтобы проверить именно форму логина
    await ctx.clearCookies();

    await page.goto("/admin/login");
    await page.getByPlaceholder("Логин").fill("admin");
    await page.getByPlaceholder("Пароль").fill(adminPassword());
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.goto("/admin/users");
    const form = page.locator(".adm-block", { hasText: "Новый пользователь" });
    const roles: Array<[keyof typeof STAFF, string]> = [
      ["content", "Контент"],
      ["warehouse", "Складчик"],
      ["sales", "Продажи"],
    ];
    for (const [role, label] of roles) {
      await form.getByPlaceholder("напр. sklad").fill(STAFF[role]);
      await form.getByPlaceholder("мин. 8 символов").fill(STAFF_PASSWORD);
      await form.locator("select").selectOption({ label });
      await form.getByRole("button", { name: "+ Создать" }).click();
      await expect(
        page.locator(".adm-row", { hasText: STAFF[role] }).first(),
      ).toBeVisible();
    }
    await ctx.close();
  });

  test("2. контент-менеджер правит лендинг — правка видна публике", async ({ browser }) => {
    const page = await staffPage(browser, "content");
    await page.goto("/admin/content");

    const block = page.locator(".adm-block", { hasText: "Главный экран" });
    const field = block.locator(".adm-field", { hasText: "Надзаголовок" });
    await field.locator("textarea, input").first().fill(KICKER);
    await block.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.locator(".adm-toast, .toast").filter({ hasText: "Сохранено" }).first())
      .toBeVisible({ timeout: 10_000 })
      .catch(() => {}); // тост может исчезнуть раньше — истина ниже, на лендинге

    const pub = await customerPage(browser);
    await pub.goto("/");
    await reloadUntilVisible(pub, ".badge", KICKER);
    await pub.context().close();
    await page.context().close();
  });

  test("3. контент-менеджер создаёт карточку товара", async ({ browser }) => {
    const page = await staffPage(browser, "content");
    await page.goto("/admin/shop/products/new");

    const catSelect = page.locator(".adm-field", { hasText: "Категория" }).locator("select");
    await expect(async () => {
      const options = await catSelect.locator("option").count();
      expect(options).toBeGreaterThan(1);
    }).toPass();
    await catSelect.selectOption({ index: 1 });

    await page
      .locator(".adm-field", { hasText: "Артикул (SKU)" })
      .locator("input")
      .fill(SKU);
    const ruBlock = page.locator(".adm-block", { hasText: "Перевод — Русский" });
    await ruBlock.locator(".adm-field", { hasText: "Название" }).locator("input").first().fill(PRODUCT_TITLE);

    await page.getByText("Дополнительно").click();
    await page
      .locator(".adm-field", { hasText: "slug" })
      .locator("input")
      .fill(PRODUCT_SLUG);

    await page.getByRole("button", { name: "Создать товар" }).click();
    await expect(page).toHaveURL(/\/admin\/shop\/products\/\d+\/images/, { timeout: 10_000 });
    productId = Number(page.url().match(/products\/(\d+)\/images/)![1]);
    expect(productId).toBeGreaterThan(0);
    await page.context().close();
  });

  test("4. владелец назначает цену (денежная зона — только owner)", async () => {
    const res = await owner.put(`/api/admin/shop/products/${productId}`, {
      data: { price: PRICE },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    expect((await res.json()).price).toBe(PRICE);
  });

  test("5. складчик: поставщик, приход, штрихкод — остаток точный", async ({ browser }) => {
    const page = await staffPage(browser, "warehouse");

    // поставщик — API складчика (право warehouse)
    const sup = await page.context().request.post("http://localhost:8000/api/admin/warehouse/suppliers", {
      data: { name: SUPPLIER, phone: "+99365000000" },
    });
    expect(sup.ok(), await sup.text()).toBeTruthy();

    // приходная накладная — через UI
    await page.goto("/admin/warehouse/purchases");
    const form = page.locator(".adm-block", { hasText: "Новая накладная" });
    await form.locator(".adm-field", { hasText: "Поставщик" }).locator("select")
      .selectOption({ label: SUPPLIER });
    await form.locator("select").nth(1).selectOption(String(productId));
    await form.getByPlaceholder("кол-во").fill(String(RECEIVED));
    await form.getByPlaceholder("цена закупки").fill(String(COST));
    // точность на месте: итог накладной = qty × cost
    await expect(form.locator("text=Итого:").locator("..")).toContainText(
      new RegExp((RECEIVED * COST).toLocaleString("ru-RU").replace(/ /g, "[\\s\\u00a0]")),
    );
    await form.getByRole("button", { name: "Провести", exact: true }).click();
    await expect(page.locator(".adm-block", { hasText: SUPPLIER }).first()).toBeVisible({ timeout: 10_000 });

    // штрихкод — зона склада
    const bc = await page.context().request.put(
      `http://localhost:8000/api/admin/shop/products/${productId}`,
      { data: { barcode: BARCODE } },
    );
    expect(bc.ok(), await bc.text()).toBeTruthy();

    // остаток виден и равен приходу
    await page.goto("/admin/warehouse");
    await page.getByPlaceholder("Поиск: название или SKU").fill(SKU);
    const row = page.locator("tbody tr", { hasText: PRODUCT_TITLE });
    await expect(row).toBeVisible();
    await expect(row.locator("td").nth(2)).toHaveText(String(RECEIVED));
    await page.context().close();
  });

  test("6. товар появился в магазине с ценой владельца", async ({ browser }) => {
    const page = await customerPage(browser);
    await page.goto(`/shop/product/${PRODUCT_SLUG}`);
    await expect(page.locator("h1", { hasText: PRODUCT_TITLE })).toBeVisible();
    await expect(page.locator("body")).toContainText(String(PRICE));
    await page.context().close();
  });

  test("7. кассир продаёт по штрихкоду — чек и списание точные", async ({ browser }) => {
    const page = await staffPage(browser, "sales");
    await page.addInitScript(() => {
      window.print = () => {}; // ?print=1 не должен вешать тест системным диалогом
    });

    await page.goto("/admin/pos");
    const scan = page.getByPlaceholder("Скан или ввод + Enter");
    await scan.fill(BARCODE);
    await scan.press("Enter");

    const line = page.locator("tbody tr", { hasText: PRODUCT_TITLE });
    await expect(line).toBeVisible();
    await line.getByRole("button", { name: "+", exact: true }).click(); // qty 2
    await expect(line.locator("b").first()).toHaveText(String(POS_QTY));

    const total = PRICE * POS_QTY;
    await expect(page.locator(".adm-card", { hasText: "Подытог" })).toContainText(String(total));
    await page.getByRole("button", { name: new RegExp(`Провести и печать — ${total} TMT`) }).click();

    await expect(page).toHaveURL(/\/admin\/pos\/receipt\/\d+/, { timeout: 10_000 });
    await expect(page.locator(".pos-receipt h1")).toContainText("Товарный чек");
    await expect(page.locator(".pos-receipt")).toContainText(PRODUCT_TITLE);
    await expect(page.locator(".pos-receipt-totals")).toContainText(String(total));

    // остаток списан ровно на проданное количество
    const look = await page.context().request.get(
      `http://localhost:8000/api/admin/pos/lookup?code=${BARCODE}`,
    );
    expect((await look.json()).stock_qty).toBe(RECEIVED - POS_QTY);
    await page.context().close();
  });

  test("8. покупатель оформляет заказ на сайте", async ({ browser }) => {
    const page = await customerPage(browser);
    await page.goto(`/shop/product/${PRODUCT_SLUG}`);
    await page.locator("button", { hasText: /в корзину/i }).first().click();

    await page.goto("/shop/checkout");
    const form = page.locator("form.shop-form");
    await form.locator("input").first().fill(CUSTOMER);
    const phone = form.locator("input[type='tel']");
    await phone.fill("65123456");
    await expect(phone).toHaveValue("+993 65 123456"); // маска работает

    // сумма в сводке = цена × количество
    await expect(page.locator(".shop-order-row.total")).toContainText(String(PRICE * ORDER_QTY));
    await form.getByRole("button", { name: /Оформить|заказ/i }).click();

    const orderNo = page.locator(".shop-order-no");
    await expect(orderNo).toBeVisible({ timeout: 10_000 });
    orderId = Number((await orderNo.textContent())!.match(/#(\d+)/)![1]);
    expect(orderId).toBeGreaterThan(0);

    // склад: списание за онлайн-заказ тоже точное
    const look = await owner.get(`/api/admin/pos/lookup?code=${BARCODE}`);
    expect((await look.json()).stock_qty).toBe(RECEIVED - POS_QTY - ORDER_QTY);
    await page.context().close();
  });

  test("9. владелец подтверждает заказ — покупатель видит статус", async ({ browser }) => {
    const page = await (await loginContextAs(browser, "admin", adminPassword())).newPage();
    await page.goto("/admin/shop/orders");
    await page.getByPlaceholder("Поиск: телефон или имя").fill(CUSTOMER);
    await page.getByRole("button", { name: "Найти" }).click();

    const row = page.locator("tbody tr", { hasText: CUSTOMER }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(`${PRICE * ORDER_QTY} TMT`);
    await row.locator("select").last().selectOption("confirmed");

    const pub = await customerPage(browser);
    await pub.goto(`/shop/order/${orderId}?phone=${encodeURIComponent("+99365123456")}`);
    await expect(pub.locator("body")).toContainText(/Подтверждён|подтверждён/i, { timeout: 10_000 });
    await pub.context().close();
    await page.context().close();
  });

  test("10. заявка с лендинга падает в админку", async ({ browser }) => {
    const pub = await customerPage(browser);
    await pub.goto("/");
    const form = pub.locator("form.lead-form");
    await form.scrollIntoViewIfNeeded();
    await form.locator("input").first().fill(LEAD_NAME);
    await form.locator("input").nth(1).fill("+993 65 123456");
    await form.locator("textarea").fill("E2E: проверка формы заявки");
    await form.getByRole("button").click();
    await expect(pub.locator(".lead-done")).toBeVisible({ timeout: 10_000 });
    await pub.context().close();

    const page = await (await loginContextAs(browser, "admin", adminPassword())).newPage();
    await page.goto("/admin/leads");
    await expect(page.locator("body")).toContainText(LEAD_NAME);
    await page.context().close();
  });

  test("11. отчёты сходятся: выручка кассы и заказ на месте", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const sales = await (
      await owner.get(`/api/admin/pos/sales?date_from=${today}&date_to=${today}`)
    ).json();
    const ours = sales.find((s: { items: Array<{ title: string }> }) =>
      s.items.some((it) => it.title === PRODUCT_TITLE),
    );
    expect(ours, "продажа кассы должна быть в списке за сегодня").toBeTruthy();
    expect(ours.subtotal).toBe(PRICE * POS_QTY);
    expect(ours.sold_total).toBe(PRICE * POS_QTY);
    expect(ours.discount).toBe(0);
    expect(ours.cost_total).toBe(COST * POS_QTY); // прибыль считается от закупки прихода

    const report = await owner.get(
      `/api/admin/reports/sales?date_from=${today}&date_to=${today}`,
    );
    expect(report.ok(), await report.text()).toBeTruthy();

    const orders = await (await owner.get("/api/admin/shop/orders?q=" + CUSTOMER)).json();
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0].total).toBe(PRICE * ORDER_QTY);
    expect(orders[0].status).toBe("confirmed");
  });
});
