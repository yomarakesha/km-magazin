"use client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: opts.body && !(opts.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : undefined,
    ...opts,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(`API ${status}: ${detail}`);
  }
}

export const api = {
  base: API,
  // auth
  login: (password: string) => req("/api/auth/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => req("/api/auth/logout", { method: "POST" }),
  me: () => req<{ authenticated: boolean }>("/api/auth/me"),
  // content blocks
  getBlocks: () => req<{ keys: string[]; langs: string[]; blocks: Record<string, Record<string, Record<string, unknown>>> }>("/api/admin/content"),
  putBlock: (lang: string, key: string, data: Record<string, unknown>) =>
    req(`/api/admin/content/${lang}/${key}`, { method: "PUT", body: JSON.stringify({ data }) }),
  // services
  getServices: () => req<AdminService[]>("/api/admin/services"),
  getService: (id: number) => req<AdminService>(`/api/admin/services/${id}`),
  createService: (body: unknown) => req<AdminService>("/api/admin/services", { method: "POST", body: JSON.stringify(body) }),
  updateService: (id: number, body: unknown) => req<AdminService>(`/api/admin/services/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteService: (id: number) => req(`/api/admin/services/${id}`, { method: "DELETE" }),
  reorderServices: (ids: number[]) => req("/api/admin/services/reorder", { method: "POST", body: JSON.stringify({ ids }) }),
  // media
  getMedia: (serviceId: number) => req<AdminMedia[]>(`/api/admin/services/${serviceId}/media`),
  uploadMedia: (serviceId: number, form: FormData) =>
    req<AdminMedia>(`/api/admin/services/${serviceId}/media`, { method: "POST", body: form }),
  updateMedia: (id: number, body: unknown) => req<AdminMedia>(`/api/admin/media/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteMedia: (id: number) => req(`/api/admin/media/${id}`, { method: "DELETE" }),
  reorderMedia: (serviceId: number, ids: number[]) =>
    req(`/api/admin/services/${serviceId}/media/reorder`, { method: "POST", body: JSON.stringify({ ids }) }),
  // leads
  getLeads: () => req<Lead[]>("/api/admin/leads"),
  setLeadStatus: (id: number, status: string) => req<Lead>(`/api/admin/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteLead: (id: number) => req(`/api/admin/leads/${id}`, { method: "DELETE" }),

  // shop: categories
  getCategories: () => req<AdminCategory[]>("/api/admin/shop/categories"),
  getCategory: (id: number) => req<AdminCategory>(`/api/admin/shop/categories/${id}`),
  createCategory: (body: unknown) => req<AdminCategory>("/api/admin/shop/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id: number, body: unknown) => req<AdminCategory>(`/api/admin/shop/categories/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCategory: (id: number) => req(`/api/admin/shop/categories/${id}`, { method: "DELETE" }),
  reorderCategories: (ids: number[]) => req("/api/admin/shop/categories/reorder", { method: "POST", body: JSON.stringify({ ids }) }),
  // shop: category attributes (filters)
  getAttributes: (catId: number) => req<AdminAttribute[]>(`/api/admin/shop/categories/${catId}/attributes`),
  createAttribute: (catId: number, body: unknown) => req<AdminAttribute>(`/api/admin/shop/categories/${catId}/attributes`, { method: "POST", body: JSON.stringify(body) }),
  updateAttribute: (id: number, body: unknown) => req<AdminAttribute>(`/api/admin/shop/attributes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteAttribute: (id: number) => req(`/api/admin/shop/attributes/${id}`, { method: "DELETE" }),
  reorderAttributes: (catId: number, ids: number[]) => req(`/api/admin/shop/categories/${catId}/attributes/reorder`, { method: "POST", body: JSON.stringify({ ids }) }),
  // shop: products
  getProducts: (categoryId?: number) => req<AdminProduct[]>(`/api/admin/shop/products${categoryId ? `?category_id=${categoryId}` : ""}`),
  getProduct: (id: number) => req<AdminProduct>(`/api/admin/shop/products/${id}`),
  createProduct: (body: unknown) => req<AdminProduct>("/api/admin/shop/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id: number, body: unknown) => req<AdminProduct>(`/api/admin/shop/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProduct: (id: number) => req(`/api/admin/shop/products/${id}`, { method: "DELETE" }),
  reorderProducts: (ids: number[]) => req("/api/admin/shop/products/reorder", { method: "POST", body: JSON.stringify({ ids }) }),
  // shop: product images
  getProductImages: (productId: number) => req<AdminProductImage[]>(`/api/admin/shop/products/${productId}/images`),
  uploadProductImage: (productId: number, form: FormData) => req<AdminProductImage>(`/api/admin/shop/products/${productId}/images`, { method: "POST", body: form }),
  deleteProductImage: (id: number) => req(`/api/admin/shop/images/${id}`, { method: "DELETE" }),
  reorderProductImages: (productId: number, ids: number[]) => req(`/api/admin/shop/products/${productId}/images/reorder`, { method: "POST", body: JSON.stringify({ ids }) }),
  // shop: category services (priced add-ons)
  getShopServices: (catId: number) => req<AdminShopService[]>(`/api/admin/shop/categories/${catId}/services`),
  createShopService: (catId: number, body: unknown) => req<AdminShopService>(`/api/admin/shop/categories/${catId}/services`, { method: "POST", body: JSON.stringify(body) }),
  updateShopService: (id: number, body: unknown) => req<AdminShopService>(`/api/admin/shop/services/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteShopService: (id: number) => req(`/api/admin/shop/services/${id}`, { method: "DELETE" }),
  reorderShopServices: (catId: number, ids: number[]) => req(`/api/admin/shop/categories/${catId}/services/reorder`, { method: "POST", body: JSON.stringify({ ids }) }),
  // shop: brands
  getBrands: () => req<AdminBrand[]>("/api/admin/shop/brands"),
  createBrand: (body: unknown) => req<AdminBrand>("/api/admin/shop/brands", { method: "POST", body: JSON.stringify(body) }),
  updateBrand: (id: number, body: unknown) => req<AdminBrand>(`/api/admin/shop/brands/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteBrand: (id: number) => req(`/api/admin/shop/brands/${id}`, { method: "DELETE" }),
  reorderBrands: (ids: number[]) => req("/api/admin/shop/brands/reorder", { method: "POST", body: JSON.stringify({ ids }) }),
  // shop: reviews (moderation)
  getReviews: (status?: string) => req<AdminReview[]>(`/api/admin/shop/reviews${status ? `?status=${status}` : ""}`),
  setReviewStatus: (id: number, status: string) => req<AdminReview>(`/api/admin/shop/reviews/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteReview: (id: number) => req(`/api/admin/shop/reviews/${id}`, { method: "DELETE" }),
  // shop: settings (contacts)
  getShopSettings: () => req<AdminShopSettings>("/api/admin/shop/settings"),
  updateShopSettings: (body: unknown) => req<AdminShopSettings>("/api/admin/shop/settings", { method: "PUT", body: JSON.stringify(body) }),
  // shop: orders
  getOrders: (opts?: { status?: string; q?: string }) => {
    const p = new URLSearchParams();
    if (opts?.status) p.set("status", opts.status);
    if (opts?.q) p.set("q", opts.q);
    const qs = p.toString();
    return req<AdminOrder[]>(`/api/admin/shop/orders${qs ? `?${qs}` : ""}`);
  },
  getShopStats: () => req<AdminShopStats>("/api/admin/shop/stats"),
  // shop: promo codes
  getPromos: () => req<AdminPromo[]>("/api/admin/shop/promos"),
  createPromo: (body: unknown) => req<AdminPromo>("/api/admin/shop/promos", { method: "POST", body: JSON.stringify(body) }),
  updatePromo: (id: number, body: unknown) => req<AdminPromo>(`/api/admin/shop/promos/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deletePromo: (id: number) => req(`/api/admin/shop/promos/${id}`, { method: "DELETE" }),
  setOrderStatus: (id: number, status: string) => req<AdminOrder>(`/api/admin/shop/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteOrder: (id: number) => req(`/api/admin/shop/orders/${id}`, { method: "DELETE" }),
};

// ---- Shop admin types ----
export interface AdminCategoryTr { lang: string; name: string }
export interface AdminAttributeTr { lang: string; label: string }
export interface AdminAttribute {
  id: number; key: string; type: "select" | "number"; unit: string;
  filterable: boolean; sort_order: number; translations: AdminAttributeTr[];
}
export interface AdminCategory {
  id: number; slug: string; enabled: boolean; sort_order: number;
  parent_id: number | null;
  product_count: number; translations: AdminCategoryTr[]; attributes: AdminAttribute[];
}
export interface ProductSpec { label: string; value: string }
export interface AdminProductTr { lang: string; title: string; short: string; body: string; specs: ProductSpec[] }
export interface AdminProductAttr { attribute_id: number; value: string; num_value: number | null }
export interface AdminProduct {
  id: number; slug: string; category_id: number; price: number; old_price: number | null; stock_qty: number | null; currency: string;
  in_stock: boolean; sku: string; enabled: boolean; sort_order: number; image_count: number;
  translations: AdminProductTr[]; attributes: AdminProductAttr[];
}
export interface AdminProductImage { id: number; filename: string; sort_order: number }
export interface AdminShopServiceTr { lang: string; title: string; short: string }
export interface AdminShopService {
  id: number; slug: string; category_id: number; price: number; currency: string;
  icon: string; enabled: boolean; sort_order: number; translations: AdminShopServiceTr[];
}
export interface AdminBrand { id: number; name: string; enabled: boolean; sort_order: number }
export interface AdminReview {
  id: number; product_id: number; product_title: string; product_slug: string;
  name: string; rating: number; text: string; status: string; created_at: string;
}
export interface AdminShopSettings { phone: string; whatsapp: string; address_ru: string; address_tk: string; address_en: string }
export interface AdminOrderItem { product_id: number | null; service_id?: number | null; kind?: "product" | "service"; title: string; price: number; qty: number }
export interface AdminOrder {
  id: number; customer_name: string; phone: string; address: string;
  payment_method: string; comment: string; status: string; total: number;
  promo_code?: string; discount?: number;
  created_at: string; items: AdminOrderItem[];
}
export interface AdminPromo {
  id: number; code: string; kind: "percent" | "fixed"; value: number;
  min_total: number; active: boolean; expires_at: string | null;
  used_count: number; created_at: string;
}
export interface AdminShopStats {
  orders_new: number; orders_today: number; orders_week: number; revenue_week: number;
  reviews_pending: number;
  top_products: { id: number; title: string; sold: number }[];
  low_stock: { id: number; title: string; stock_qty: number }[];
}

export interface AdminTranslation {
  lang: string; code: string; short: string; title: string; body: string; feats: string[];
}
export interface AdminService {
  id: number; slug: string; icon: string; enabled: boolean; sort_order: number;
  media_count?: number; translations: AdminTranslation[];
}
export interface AdminMedia {
  id: number; kind: string; filename: string; poster: string | null;
  still: boolean; caption_kind: string; sort_order: number;
}
export interface Lead {
  id: number; name: string; phone: string; email: string; message: string;
  status: string; created_at: string;
}
