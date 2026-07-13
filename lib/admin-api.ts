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

function rangeQs(from?: string, to?: string): string {
  const qs = new URLSearchParams();
  if (from) qs.set("date_from", from);
  if (to) qs.set("date_to", to);
  return qs.toString();
}

export const api = {
  base: API,
  // auth
  login: (username: string, password: string) =>
    req<{ ok: boolean; username: string; role: AdminRole }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => req("/api/auth/logout", { method: "POST" }),
  me: () => req<{ authenticated: boolean; username: string; role: AdminRole }>("/api/auth/me"),
  // admin users (owner only)
  getUsers: () => req<AdminUserRow[]>("/api/admin/users"),
  createUser: (body: { username: string; password: string; role: AdminRole }) =>
    req<AdminUserRow>("/api/admin/users", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id: number, body: { password?: string; role?: AdminRole; active?: boolean }) =>
    req<AdminUserRow>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteUser: (id: number) => req(`/api/admin/users/${id}`, { method: "DELETE" }),
  // warehouse
  getStock: (q = "", low = false) =>
    req<StockRow[]>(`/api/admin/warehouse/stock?q=${encodeURIComponent(q)}${low ? "&low=1" : ""}`),
  getMovements: (params: { product_id?: number; kind?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.product_id != null) qs.set("product_id", String(params.product_id));
    if (params.kind) qs.set("kind", params.kind);
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.offset != null) qs.set("offset", String(params.offset));
    return req<{ total: number; items: MovementRow[] }>(`/api/admin/warehouse/movements?${qs}`);
  },
  createMovement: (body: {
    product_id: number; kind: "receipt" | "writeoff" | "adjust";
    qty?: number; new_qty?: number; note?: string; unit_cost?: number; supplier_id?: number;
  }) => req<{ ok: boolean; product_id: number; stock_qty: number | null; cost_price: number | null }>(
    "/api/admin/warehouse/movements", { method: "POST", body: JSON.stringify(body) }),
  getSuppliers: () => req<SupplierRow[]>("/api/admin/warehouse/suppliers"),
  createSupplier: (body: { name: string; phone?: string; note?: string }) =>
    req<SupplierRow>("/api/admin/warehouse/suppliers", { method: "POST", body: JSON.stringify(body) }),
  updateSupplier: (id: number, body: { name?: string; phone?: string; note?: string; active?: boolean }) =>
    req<SupplierRow>(`/api/admin/warehouse/suppliers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteSupplier: (id: number) => req(`/api/admin/warehouse/suppliers/${id}`, { method: "DELETE" }),
  getPurchases: (limit = 50, offset = 0) =>
    req<{ total: number; items: PurchaseRow[] }>(`/api/admin/warehouse/purchases?limit=${limit}&offset=${offset}`),
  createPurchase: (body: { supplier_id?: number | null; note?: string; items: { product_id: number; qty: number; unit_cost: number }[] }) =>
    req<PurchaseRow>("/api/admin/warehouse/purchases", { method: "POST", body: JSON.stringify(body) }),
  // reports
  getSalesReport: (from?: string, to?: string) =>
    req<SalesReport>(`/api/admin/reports/sales?${rangeQs(from, to)}`),
  getStockReport: () => req<StockReport>("/api/admin/reports/stock"),
  getServicesReport: (from?: string, to?: string) =>
    req<ServicesReport>(`/api/admin/reports/services?${rangeQs(from, to)}`),
  reportCsvUrl: (kind: "sales" | "stock" | "services", from?: string, to?: string) =>
    `${API}/api/admin/reports/${kind}?format=csv${kind === "stock" ? "" : `&${rangeQs(from, to)}`}`,
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
  getOrders: (opts?: { status?: string; payment?: string; q?: string }) => {
    const p = new URLSearchParams();
    if (opts?.status) p.set("status", opts.status);
    if (opts?.payment) p.set("payment", opts.payment);
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
  setOrderPayment: (id: number, payment_status: string) => req<AdminOrder>(`/api/admin/shop/orders/${id}/payment`, { method: "PATCH", body: JSON.stringify({ payment_status }) }),
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
  payment_status: "unpaid" | "pending" | "paid" | "refunded";
  payment_provider: string | null; payment_ref: string | null;
  promo_code?: string; discount?: number;
  created_at: string; items: AdminOrderItem[];
}
export interface AdminPromo {
  id: number; code: string; kind: "percent" | "fixed"; value: number;
  min_total: number; active: boolean; expires_at: string | null;
  used_count: number; max_uses: number | null; created_at: string;
}
export interface AdminShopStats {
  orders_new: number; orders_today: number; orders_week: number; revenue_week: number;
  reviews_pending: number;
  top_products: { id: number; title: string; sold: number }[];
  low_stock: { id: number; title: string; stock_qty: number }[];
}

export type AdminRole = "owner" | "warehouse" | "sales" | "content";

export interface StockRow {
  id: number; title: string; sku: string | null; stock_qty: number | null;
  cost_price: number | null; price: number; in_stock: boolean; enabled: boolean; low: boolean;
}
export type MovementKind = "receipt" | "sale" | "return" | "writeoff" | "adjust";
export interface MovementRow {
  id: number; product_id: number; product_title: string; qty_delta: number;
  stock_after: number | null; kind: MovementKind; note: string; unit_cost: number | null;
  supplier_id: number | null; order_id: number | null; purchase_id: number | null;
  username: string; created_at: string | null;
}
export interface SupplierRow {
  id: number; name: string; phone: string; note: string; active: boolean; created_at: string | null;
}
export interface PurchaseRow {
  id: number; supplier_id: number | null; supplier_name: string; note: string;
  total_cost: number; username: string; created_at: string | null;
  items: { product_id: number | null; title: string; qty: number; unit_cost: number }[];
}

export interface SalesReport {
  from: string; to: string; orders: number; revenue: number; discounts: number;
  cogs: number; gross_profit: number; avg_check: number; cost_coverage: number | null;
  daily: { day: string; orders: number; revenue: number }[];
  top_products: { id: number; title: string; qty: number; revenue: number; profit: number }[];
}
export interface StockReportRow {
  id: number; title: string; sku: string | null; stock_qty: number | null;
  cost_price: number | null; price: number; value_cost: number;
}
export interface StockReport {
  value_cost: number; value_retail: number; units: number; tracked_count: number;
  dead_days: number;
  low_stock: StockReportRow[]; dead_stock: StockReportRow[]; items: StockReportRow[];
}
export interface ServicesReport {
  from: string; to: string; total_count: number; total_revenue: number;
  services: { id: number; title: string; count: number; revenue: number }[];
}
export interface AdminUserRow {
  id: number; username: string; role: AdminRole; active: boolean; created_at: string | null;
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
