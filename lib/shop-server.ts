import type { Catalog, CategoryView, I18n, ProductDetail } from "./shop-types";
import type { SearchResult } from "./shop-api";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

// SSR fetches are cached for 60s and tagged "shop". After an admin shop write
// the backend pings POST /api/revalidate to invalidate the "shop" tag, so the
// NEXT render rebuilds from fresh data (not necessarily the in-flight request);
// meanwhile normal traffic stops hammering the API on every render.
const SHOP_CACHE: { next: { revalidate: number; tags: string[] } } = {
  next: { revalidate: 60, tags: ["shop"] },
};

// Every SSR render comes from the one frontend host, so without this the whole
// site would share a single rate-limit bucket. The shared secret marks these
// fetches as internal so the backend skips throttling them. Omitted when unset.
const INTERNAL_HEADERS: Record<string, string> = process.env.REVALIDATE_SECRET
  ? { "x-internal-key": process.env.REVALIDATE_SECRET }
  : {};

/** SSR: full category view (no filters) for metadata + JSON-LD ItemList. */
export async function getCategory(slug: string): Promise<CategoryView | null> {
  try {
    const res = await fetch(`${API_URL}/api/shop/categories/${encodeURIComponent(slug)}`, {
      ...SHOP_CACHE,
      headers: INTERNAL_HEADERS,
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
      ...SHOP_CACHE,
      headers: INTERNAL_HEADERS,
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`catalog fetch failed: ${res.status}`);
    return (await res.json()) as Catalog;
  } catch (err) {
    console.error("[shop-server] catalog unavailable:", err);
    return null;
  }
}

/** SSR: first page of search results, so they land in the HTML and get
 * crawled; the client hydrates and takes over sort/load-more. */
export async function getSearch(query: string): Promise<SearchResult | null> {
  try {
    const res = await fetch(`${API_URL}/api/shop/search?${query}`, {
      ...SHOP_CACHE,
      headers: INTERNAL_HEADERS,
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as SearchResult;
  } catch {
    return null;
  }
}

/** SSR: load a single product by slug. */
export async function getProduct(slug: string): Promise<ProductDetail | null> {
  try {
    const res = await fetch(`${API_URL}/api/shop/products/${encodeURIComponent(slug)}`, {
      ...SHOP_CACHE,
      headers: INTERNAL_HEADERS,
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as ProductDetail;
  } catch (err) {
    console.error("[shop-server] product unavailable:", err);
    return null;
  }
}
