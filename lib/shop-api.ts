"use client";
import type { CategoryView, ShopCard } from "./shop-types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface SearchResult {
  mediaBase: string;
  query: string;
  products: ShopCard[];
}

/** Client: search products by text + optional sort. */
export async function fetchSearch(query: string): Promise<SearchResult> {
  const res = await fetch(`${API}/api/shop/search?${query}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  return (await res.json()) as SearchResult;
}

export interface OrderItemPayload {
  product_id: number;
  qty: number;
}
export interface OrderPayload {
  customer_name: string;
  phone: string;
  address: string;
  payment_method: "cash" | "terminal";
  comment: string;
  items: OrderItemPayload[];
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

/** Client: submit an order. The backend recomputes the total from DB prices. */
export async function createOrder(payload: OrderPayload): Promise<{ ok: boolean; id: number; total: number }> {
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
