import { expect, test } from "@playwright/test";

/** Catalog → PDP → cart → checkout smoke. Read-only except for the cart
 *  (localStorage), so it is safe against a live dev database. */

test("catalog renders products and categories", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.locator(".shop-card").first()).toBeVisible();
});

test("PDP opens from the catalog and adds to cart", async ({ page }) => {
  await page.goto("/shop");
  const firstCard = page.locator(".shop-card a[href*='/shop/product/']").first();
  await firstCard.click();
  await expect(page).toHaveURL(/\/shop\/product\//);

  // add to cart, badge appears
  await page.locator("button", { hasText: /в корзину|sebede|add to cart/i }).first().click();
  await page.goto("/shop/cart");
  await expect(page.locator(".shop-cart-item").first()).toBeVisible();
});

test("checkout page renders the form for a non-empty cart", async ({ page }) => {
  await page.goto("/shop");
  await page.locator(".shop-card a[href*='/shop/product/']").first().click();
  await page.locator("button", { hasText: /в корзину|sebede|add to cart/i }).first().click();
  await page.goto("/shop/checkout");
  await expect(page.locator("form.shop-form")).toBeVisible();
  await expect(page.locator("form.shop-form input[type='tel']")).toBeVisible();
});
