"use client";
import type { Catalog, CategoryView, ProductDetail, ShopCard } from "./shop-types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Client: fetch a catalog page (used by the "show more" button). */
export async function fetchCatalogPage(offset: number, limit = 12): Promise<Catalog> {
  const res = await fetch(`${API}/api/shop/catalog?offset=${offset}&limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`catalog fetch failed: ${res.status}`);
  return (await res.json()) as Catalog;
}

export interface SearchResult {
  mediaBase: string;
  query: string;
  products: ShopCard[];
  total: number;
}

/** Client: search products by text + optional sort. */
export async function fetchSearch(query: string): Promise<SearchResult> {
  const res = await fetch(`${API}/api/shop/search?${query}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  return (await res.json()) as SearchResult;
}

export interface OrderItemPayload {
  kind: "product" | "service";
  id: number;
  qty: number;
}
export interface OrderPayload {
  customer_name: string;
  phone: string;
  address: string;
  payment_method: "cash" | "terminal";
  comment: string;
  promo_code?: string;
  items: OrderItemPayload[];
}

export interface PromoCheckResult {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  min_total: number;
  discount: number;
}

/** Thrown by checkPromo. `code` distinguishes a valid code the cart is too
 *  small for ("below_min", with min_total) from a plain invalid/expired one. */
export class PromoError extends Error {
  constructor(public code: "below_min" | "invalid", public minTotal?: number) {
    super(code);
    this.name = "PromoError";
  }
}

/** Client: validate a promo code against the current cart subtotal. */
export async function checkPromo(code: string, subtotal: number): Promise<PromoCheckResult> {
  const res = await fetch(`${API}/api/shop/promo/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, subtotal }),
  });
  if (!res.ok) {
    // 422 → valid code but subtotal < min_total; detail carries the threshold.
    const detail = await res.json().then((b) => b?.detail).catch(() => null);
    if (detail && typeof detail === "object" && detail.code === "below_min") {
      throw new PromoError("below_min", Number(detail.min_total));
    }
    throw new PromoError("invalid");
  }
  return (await res.json()) as PromoCheckResult;
}

/** Client: fetch a category view with the given filter query string. */
export async function fetchCategory(slug: string, query: string): Promise<CategoryView> {
  const qs = query ? `?${query}` : "";
  const res = await fetch(`${API}/api/shop/categories/${encodeURIComponent(slug)}${qs}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`category fetch failed: ${res.status}`);
  return (await res.json()) as CategoryView;
}

/** Client: fetch a single product by slug (for the quick-view modal). */
export async function fetchProduct(slug: string): Promise<ProductDetail> {
  const res = await fetch(`${API}/api/shop/products/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`product fetch failed: ${res.status}`);
  return (await res.json()) as ProductDetail;
}

/** Client: submit a product review (goes to moderation). */
export async function postReview(slug: string, body: { name: string; rating: number; text: string }): Promise<void> {
  const res = await fetch(`${API}/api/shop/products/${encodeURIComponent(slug)}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`review failed: ${res.status}`);
}

export interface OrderStatusView {
  id: number;
  status: string;
  payment_method: string;
  payment_status: "unpaid" | "pending" | "paid" | "refunded";
  total: number;
  created_at: string;
  items: { title: string; price: number; qty: number; kind: "product" | "service"; slug: string | null }[];
}

/** Client: customer order lookup — the phone must match the order's phone. */
export async function fetchOrderStatus(id: number, phone: string): Promise<OrderStatusView> {
  const res = await fetch(`${API}/api/shop/orders/${id}?phone=${encodeURIComponent(phone)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`order lookup failed: ${res.status}`);
  return (await res.json()) as OrderStatusView;
}

export interface CartLineCheck {
  kind: "product" | "service";
  id: number;
  ok: boolean;
  price: number | null;
  in_stock: boolean | null;
}

/** Client: re-check cart lines against the DB (existence, price, stock). */
export async function validateCart(items: { kind: "product" | "service"; id: number; qty: number }[]): Promise<{ items: CartLineCheck[] }> {
  const res = await fetch(`${API}/api/shop/cart/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(`cart validate failed: ${res.status}`);
  return res.json();
}

/** Client: submit an order. The backend recomputes the total from DB prices. */
export async function createOrder(payload: OrderPayload): Promise<{ ok: boolean; id: number; total: number; discount: number }> {
  const res = await fetch(`${API}/api/shop/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `order failed: ${res.status}`);
  }
  return res.json();
}
