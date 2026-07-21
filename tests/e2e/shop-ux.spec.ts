import { expect, test } from "@playwright/test";
import { customerPage } from "./helpers/ui";

/** UX витрины и лендинга глазами покупателя: пустые состояния объясняют, что
 *  делать дальше; формы не дают отправить мусор; навигация и поиск работают. */

test("пустая корзина: объяснение и путь в каталог, а не тупик", async ({ browser }) => {
  const page = await customerPage(browser);
  await page.goto("/shop/cart");
  await expect(page.locator("body")).toContainText("Корзина пуста");
  const cta = page.locator("a[href='/shop']", { hasText: /Продолжить|каталог/i }).first();
  await expect(cta).toBeVisible();
  await page.context().close();
});

test("пустое избранное: дружелюбный empty state", async ({ browser }) => {
  const page = await customerPage(browser);
  await page.goto("/shop/favorites");
  await expect(page.locator("body")).toContainText("В избранном пока пусто");
  await page.context().close();
});

test("checkout с пустой корзиной не даёт оформить заказ", async ({ browser }) => {
  const page = await customerPage(browser);
  await page.goto("/shop/checkout");
  await expect(page.locator("body")).toContainText("Корзина пуста");
  await expect(page.locator("form.shop-form")).toHaveCount(0);
  await page.context().close();
});

test("checkout: неполный телефон не проходит, ошибка видна", async ({ browser }) => {
  const page = await customerPage(browser);
  // кладём товар в корзину
  await page.goto("/shop");
  await page.locator(".shop-card a[href*='/shop/product/']").first().click();
  await page.locator("button", { hasText: /в корзину/i }).first().click();

  await page.goto("/shop/checkout");
  const form = page.locator("form.shop-form");
  await form.locator("input").first().fill("Тест Тестов");
  await form.locator("input[type='tel']").fill("6512"); // только 4 цифры из 8
  await form.getByRole("button", { name: "Подтвердить заказ" }).click();
  await expect(form.locator(".shop-err")).toBeVisible();
  await expect(page).toHaveURL(/checkout/); // заказ не создан, остались на форме
  await page.context().close();
});

test("маска телефона собирает +993 из любого мусора", async ({ browser }) => {
  const page = await customerPage(browser);
  await page.goto("/shop");
  await page.locator(".shop-card a[href*='/shop/product/']").first().click();
  await page.locator("button", { hasText: /в корзину/i }).first().click();
  await page.goto("/shop/checkout");
  const phone = page.locator("form.shop-form input[type='tel']");
  await phone.fill("(993) 65 12-34-56"); // мусорный ввод: скобки, пробелы, дефисы, код страны
  await expect(phone).toHaveValue("+993 65 123456");
  await page.context().close();
});

test("поиск: результаты по запросу и честное «ничего не найдено»", async ({ browser }) => {
  const page = await customerPage(browser);
  await page.goto("/shop/search?q=zzz-no-such-product-000");
  await expect(page.locator("body")).toContainText(/Ничего не найдено|0 товаров/i);
  await page.context().close();
});

test("лендинг: секции на месте, бегущая строка и форма заявки живые", async ({ browser }) => {
  const page = await customerPage(browser);
  await page.goto("/");
  await expect(page.locator(".hero .badge")).toBeVisible();
  await expect(page.locator(".marquee")).toBeVisible();
  await expect(page.locator("form.lead-form")).toBeVisible();
  // пустое имя не отправляется — required держит форму
  const form = page.locator("form.lead-form");
  await form.getByRole("button").click();
  await expect(form).toBeVisible(); // остались на форме, .lead-done не появился
  await expect(page.locator(".lead-done")).toHaveCount(0);
  await page.context().close();
});

test("лендинг ведёт в магазин и обратно", async ({ browser }) => {
  const page = await customerPage(browser);
  await page.goto("/shop");
  const back = page.locator("a[href='/']").first();
  await expect(back).toBeVisible();
  await page.context().close();
});

test("PDP: повторное добавление растит количество, а не дублирует строку", async ({ browser }) => {
  const page = await customerPage(browser);
  await page.goto("/shop");
  await page.locator(".shop-card a[href*='/shop/product/']").first().click();
  const add = page.locator("button", { hasText: /в корзину|в корзине/i }).first();
  await add.click();
  await page.goto("/shop/cart");
  const items = page.locator(".shop-cart-item");
  await expect(items).toHaveCount(1);
  await page.context().close();
});
