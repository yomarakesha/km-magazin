import type { Catalog, CategoryView, I18n, ProductDetail } from "./shop-types";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

/** SSR: full category view (no filters) for metadata + JSON-LD ItemList. */
export async function getCategory(slug: string): Promise<CategoryView | null> {
  try {
    const res = await fetch(`${API_URL}/api/shop/categories/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as CategoryView;
  } catch {
    return null;
  }
}

/** SSR: category name map for metadata (no filters applied). */
export async function getCategoryName(slug: string): Promise<I18n | null> {
  const view = await getCategory(slug);
  return view ? view.name : null;
}

/** SSR: load the shop catalog (categories + featured products). */
export async function getCatalog(): Promise<Catalog | null> {
  try {
    const res = await fetch(`${API_URL}/api/shop/catalog`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`catalog fetch failed: ${res.status}`);
    return (await res.json()) as Catalog;
  } catch (err) {
    console.error("[shop-server] catalog unavailable:", err);
    return null;
  }
}

/** SSR: load a single product by slug. */
export async function getProduct(slug: string): Promise<ProductDetail | null> {
  try {
    const res = await fetch(`${API_URL}/api/shop/products/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as ProductDetail;
  } catch (err) {
    console.error("[shop-server] product unavailable:", err);
    return null;
  }
}
