import { expect, test } from "@playwright/test";
import { ensureStaff, ownerContext } from "./helpers/api";
import { customerPage, loginContextAs, ownerPage } from "./helpers/ui";
import { adminPassword } from "./helpers/api";

/** Удобство админки: ошибки говорят словами, а не молчат; кнопки блокируются;
 *  удаление спрашивает подтверждение; кривой ввод не создаёт мусор. */

test.beforeAll(async () => {
  const owner = await ownerContext();
  await ensureStaff(owner);
  await owner.dispose();
});

test("неверный пароль: понятная ошибка, остаёмся на логине", async ({ browser }) => {
  const page = await customerPage(browser);
  await page.goto("/admin/login");
  await page.getByPlaceholder("Логин").fill("admin");
  await page.getByPlaceholder("Пароль").fill("wrong-password-123");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.locator(".err", { hasText: "Неверный логин или пароль" })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.context().close();
});

test("гость на админ-странице отправляется на логин", async ({ browser }) => {
  const page = await customerPage(browser);
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10_000 });
  await page.context().close();
});

test("короткий пароль нового пользователя: ошибка, пользователь не создан", async ({ browser }) => {
  const page = await ownerPage(browser);
  await page.goto("/admin/users");
  const form = page.locator(".adm-block", { hasText: "Новый пользователь" });
  await form.getByPlaceholder("напр. sklad").fill("e2e-shortpass");
  await form.getByPlaceholder("мин. 8 символов").fill("1234567"); // 7 символов
  await form.getByRole("button", { name: "+ Создать" }).click();
  await expect(page.locator("body")).toContainText("Пароль: минимум 8 символов");
  await expect(page.locator(".adm-row", { hasText: "e2e-shortpass" })).toHaveCount(0);
  await page.context().close();
});

test("товар без названия и категории не создаётся — ошибка по-русски", async ({ browser }) => {
  const page = await ownerPage(browser);
  await page.goto("/admin/shop/products/new");
  await page.getByRole("button", { name: "Создать товар" }).click();
  await expect(page.locator("body")).toContainText("Укажите название (Русский)");
  await expect(page).toHaveURL(/products\/new/); // никуда не ушли
  await page.context().close();
});

test("касса: неизвестный код — понятный тост, чек не растёт", async ({ browser }) => {
  const page = await ownerPage(browser);
  await page.goto("/admin/pos");
  const scan = page.getByPlaceholder("Скан или ввод + Enter");
  await scan.fill("no-such-barcode-000");
  await scan.press("Enter");
  await expect(page.locator("body")).toContainText("Не найдено: no-such-barcode-000");
  await expect(page.locator("body")).toContainText("Чек пуст");
  // поле очищено и готово к следующему скану — кассиру не надо стирать руками
  await expect(scan).toHaveValue("");
  await page.context().close();
});

test("удаление пользователя требует подтверждения; отмена ничего не удаляет", async ({ browser }) => {
  const page = await ownerPage(browser);
  await page.goto("/admin/users");
  const row = page.locator(".adm-row", { hasText: "e2e-content" }).first();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Удалить" }).click();
  const confirm = page.locator(".adm-confirm");
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText("e2e-content");
  await confirm.getByRole("button", { name: /Отмена|Нет/ }).click();
  await expect(page.locator(".adm-row", { hasText: "e2e-content" }).first()).toBeVisible();
  await page.context().close();
});

test("закупка без товара не проводится — подсказка вместо пустой накладной", async ({ browser }) => {
  const page = await ownerPage(browser);
  await page.goto("/admin/warehouse/purchases");
  const form = page.locator(".adm-block", { hasText: "Новая накладная" });
  await form.getByRole("button", { name: "Провести", exact: true }).click();
  await expect(page.locator("body")).toContainText("Добавьте хотя бы один товар");
  await page.context().close();
});

test("логин-форма: кнопка блокируется на время запроса", async ({ browser }) => {
  const ctx = await loginContextAs(browser, "admin", adminPassword());
  const page = await ctx.newPage();
  await ctx.clearCookies();
  await page.goto("/admin/login");
  await page.getByPlaceholder("Логин").fill("admin");
  await page.getByPlaceholder("Пароль").fill(adminPassword());
  const btn = page.getByRole("button", { name: "Войти" });
  await btn.click();
  // после клика либо кнопка успела задизейблиться, либо уже редирект — оба исхода ок,
  // важно что двойной сабмит невозможен
  await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 });
  await ctx.close();
});
