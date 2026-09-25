// Thin client for the backend admin API. Same-origin: the Vite dev proxy and
// the production mount (backend serves /admin) both keep the session cookie.

export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail || `HTTP ${status}`);
  }
}

/** Human-readable message from a FastAPI error body ({detail: str | obj | [...]}). */
function parseDetail(text: string): string {
  try {
    const d = JSON.parse(text).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map((e) => `${(e.loc ?? []).slice(1).join(".")}: ${e.msg}`).join("; ");
    if (d && typeof d === "object") return d.message ?? d.code ?? JSON.stringify(d);
  } catch {
    /* not JSON */
  }
  return text;
}

let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(path, {
    credentials: "include",
    ...opts,
    headers: opts.body && !isForm ? { "Content-Type": "application/json" } : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401 && !path.startsWith("/api/auth/")) onUnauthorized();
    throw new ApiError(res.status, parseDetail(text));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

/** multipart body with a single "file" field */
function upload(file: File): RequestInit {
  const form = new FormData();
  form.append("file", file);
  return { method: "POST", body: form };
}

function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== false) p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const mediaUrl = (path: string) => `/media/${path}`;

export const api = {
  // auth
  login: (username: string, password: string) =>
    req<{ ok: boolean; username: string; role: Role }>("/api/auth/login", json("POST", { username, password })),
  logout: () => req("/api/auth/logout", json("POST")),
  me: () => req<{ authenticated: boolean; username: string; role: Role }>("/api/auth/me"),

  // dashboard
  stats: () => req<Stats>("/api/admin/shop/stats"),

  // orders
  orders: (p: { status?: string; payment?: string; q?: string } = {}) =>
    req<Order[]>(`/api/admin/shop/orders${qs(p)}`),
  setOrderStatus: (id: number, status: OrderStatus) =>
    req<Order>(`/api/admin/shop/orders/${id}`, json("PATCH", { status })),
  setOrderPayment: (id: number, payment_status: PaymentStatus) =>
    req<Order>(`/api/admin/shop/orders/${id}/payment`, json("PATCH", { payment_status })),
  deleteOrder: (id: number) => req(`/api/admin/shop/orders/${id}`, json("DELETE")),

  // categories
  categories: () => req<Category[]>("/api/admin/shop/categories"),
  category: (id: number) => req<Category>(`/api/admin/shop/categories/${id}`),
  createCategory: (body: CategoryIn) => req<Category>("/api/admin/shop/categories", json("POST", body)),
  updateCategory: (id: number, body: CategoryIn) =>
    req<Category>(`/api/admin/shop/categories/${id}`, json("PUT", body)),
  deleteCategory: (id: number) => req(`/api/admin/shop/categories/${id}`, json("DELETE")),
  uploadCategoryImage: (id: number, file: File) => req<Category>(`/api/admin/shop/categories/${id}/image`, upload(file)),
  deleteCategoryImage: (id: number) => req<Category>(`/api/admin/shop/categories/${id}/image`, json("DELETE")),
  reorderCategories: (ids: number[]) => req("/api/admin/shop/categories/reorder", json("POST", { ids })),

  // category attributes
  attributes: (catId: number) => req<Attribute[]>(`/api/admin/shop/categories/${catId}/attributes`),
  createAttribute: (catId: number, body: AttributeIn) =>
    req<Attribute>(`/api/admin/shop/categories/${catId}/attributes`, json("POST", body)),
  updateAttribute: (id: number, body: AttributeIn) => req<Attribute>(`/api/admin/shop/attributes/${id}`, json("PUT", body)),
  deleteAttribute: (id: number) => req(`/api/admin/shop/attributes/${id}`, json("DELETE")),
  reorderAttributes: (catId: number, ids: number[]) =>
    req(`/api/admin/shop/categories/${catId}/attributes/reorder`, json("POST", { ids })),

  // services
  allServices: () => req<ShopService[]>("/api/admin/shop/services"),
  services: (catId: number) => req<ShopService[]>(`/api/admin/shop/categories/${catId}/services`),
  createService: (catId: number, body: ShopServiceIn) =>
    req<ShopService>(`/api/admin/shop/categories/${catId}/services`, json("POST", body)),
  updateService: (id: number, body: Partial<ShopServiceIn> & { category_id?: number }) =>
    req<ShopService>(`/api/admin/shop/services/${id}`, json("PUT", body)),
  deleteService: (id: number) => req(`/api/admin/shop/services/${id}`, json("DELETE")),
  uploadServiceImage: (id: number, file: File) => req<ShopService>(`/api/admin/shop/services/${id}/image`, upload(file)),
  deleteServiceImage: (id: number) => req<ShopService>(`/api/admin/shop/services/${id}/image`, json("DELETE")),

  // products
  products: (categoryId?: number) => req<Product[]>(`/api/admin/shop/products${qs({ category_id: categoryId })}`),
  product: (id: number) => req<Product>(`/api/admin/shop/products/${id}`),
  createProduct: (body: ProductIn) => req<Product>("/api/admin/shop/products", json("POST", body)),
  updateProduct: (id: number, body: Partial<ProductIn>) => req<Product>(`/api/admin/shop/products/${id}`, json("PUT", body)),
  deleteProduct: (id: number) => req(`/api/admin/shop/products/${id}`, json("DELETE")),
  images: (productId: number) => req<ProductImage[]>(`/api/admin/shop/products/${productId}/images`),
  uploadImage: (productId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return req<ProductImage>(`/api/admin/shop/products/${productId}/images`, { method: "POST", body: form });
  },
  deleteImage: (id: number) => req(`/api/admin/shop/images/${id}`, json("DELETE")),
  reorderImages: (productId: number, ids: number[]) =>
    req(`/api/admin/shop/products/${productId}/images/reorder`, json("POST", { ids })),

  // brands
  brands: () => req<Brand[]>("/api/admin/shop/brands"),
  createBrand: (body: { name: string; slug?: string; enabled?: boolean }) =>
    req<Brand>("/api/admin/shop/brands", json("POST", body)),
  updateBrand: (id: number, body: { name?: string; slug?: string; enabled?: boolean }) =>
    req<Brand>(`/api/admin/shop/brands/${id}`, json("PUT", body)),
  deleteBrand: (id: number) => req(`/api/admin/shop/brands/${id}`, json("DELETE")),
  reorderBrands: (ids: number[]) => req("/api/admin/shop/brands/reorder", json("POST", { ids })),

  // reviews
  reviews: (status?: string) => req<Review[]>(`/api/admin/shop/reviews${qs({ status })}`),
  setReviewStatus: (id: number, status: ReviewStatus) =>
    req<Review>(`/api/admin/shop/reviews/${id}`, json("PATCH", { status })),
  deleteReview: (id: number) => req(`/api/admin/shop/reviews/${id}`, json("DELETE")),

  // promos
  promos: () => req<Promo[]>("/api/admin/shop/promos"),
  createPromo: (body: PromoIn) => req<Promo>("/api/admin/shop/promos", json("POST", body)),
  updatePromo: (id: number, body: Partial<PromoIn>) => req<Promo>(`/api/admin/shop/promos/${id}`, json("PUT", body)),
  deletePromo: (id: number) => req(`/api/admin/shop/promos/${id}`, json("DELETE")),

  // site: banners + info pages
  banners: () => req<Banner[]>("/api/admin/site/banners"),
  createBanner: (body: BannerIn) => req<Banner>("/api/admin/site/banners", json("POST", body)),
  updateBanner: (id: number, body: BannerIn) => req<Banner>(`/api/admin/site/banners/${id}`, json("PUT", body)),
  deleteBanner: (id: number) => req(`/api/admin/site/banners/${id}`, json("DELETE")),
  reorderBanners: (ids: number[]) => req("/api/admin/site/banners/reorder", json("POST", { ids })),
  uploadBannerImage: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return req<Banner>(`/api/admin/site/banners/${id}/image`, { method: "POST", body: form });
  },
  pages: () => req<SitePage[]>("/api/admin/site/pages"),
  page: (id: number) => req<SitePage>(`/api/admin/site/pages/${id}`),
  createPage: (body: SitePageIn) => req<SitePage>("/api/admin/site/pages", json("POST", body)),
  updatePage: (id: number, body: SitePageIn) => req<SitePage>(`/api/admin/site/pages/${id}`, json("PUT", body)),
  deletePage: (id: number) => req(`/api/admin/site/pages/${id}`, json("DELETE")),

  // delivery zones
  zones: () => req<Zone[]>("/api/admin/shop/delivery-zones"),
  createZone: (body: ZoneIn) => req<Zone>("/api/admin/shop/delivery-zones", json("POST", body)),
  updateZone: (id: number, body: ZoneIn) => req<Zone>(`/api/admin/shop/delivery-zones/${id}`, json("PUT", body)),
  deleteZone: (id: number) => req(`/api/admin/shop/delivery-zones/${id}`, json("DELETE")),
  reorderZones: (ids: number[]) => req("/api/admin/shop/delivery-zones/reorder", json("POST", { ids })),

  // settings
  settings: () => req<Settings>("/api/admin/shop/settings"),
  updateSettings: (body: Settings) => req<Settings>("/api/admin/shop/settings", json("PUT", body)),

  // leads
  leads: () => req<Lead[]>("/api/admin/leads"),
  setLeadStatus: (id: number, status: LeadStatus) => req<Lead>(`/api/admin/leads/${id}`, json("PATCH", { status })),
  deleteLead: (id: number) => req(`/api/admin/leads/${id}`, json("DELETE")),

  // POS
  posLookup: (code: string) => req<PosLookup>(`/api/admin/pos/lookup${qs({ code })}`),
  createSale: (body: SaleIn) => req<Sale>("/api/admin/pos/sales", json("POST", body)),
  sales: (p: { date_from?: string; date_to?: string; debt?: boolean } = {}) =>
    req<Sale[]>(`/api/admin/pos/sales${qs(p)}`),
  sale: (id: number) => req<Sale>(`/api/admin/pos/sales/${id}`),
  settleSale: (id: number) => req<Sale>(`/api/admin/pos/sales/${id}/settle`, json("POST")),
  voidSale: (id: number) => req(`/api/admin/pos/sales/${id}/void`, json("POST")),

  // warehouse
  stock: (q = "", low = false) => req<StockRow[]>(`/api/admin/warehouse/stock${qs({ q, low: low ? 1 : undefined })}`),
  movements: (p: { product_id?: number; kind?: string; limit?: number; offset?: number } = {}) =>
    req<{ total: number; items: Movement[] }>(`/api/admin/warehouse/movements${qs(p)}`),
  createMovement: (body: MovementIn) =>
    req<{ ok: boolean; stock_qty: number | null }>("/api/admin/warehouse/movements", json("POST", body)),
  suppliers: () => req<Supplier[]>("/api/admin/warehouse/suppliers"),
  createSupplier: (body: { name: string; phone?: string; note?: string }) =>
    req<Supplier>("/api/admin/warehouse/suppliers", json("POST", body)),
  updateSupplier: (id: number, body: Partial<Supplier>) =>
    req<Supplier>(`/api/admin/warehouse/suppliers/${id}`, json("PATCH", body)),
  deleteSupplier: (id: number) => req(`/api/admin/warehouse/suppliers/${id}`, json("DELETE")),
  purchases: (limit = 50, offset = 0) =>
    req<{ total: number; items: Purchase[] }>(`/api/admin/warehouse/purchases${qs({ limit, offset })}`),
  createPurchase: (body: PurchaseIn) => req<Purchase>("/api/admin/warehouse/purchases", json("POST", body)),

  // reports
  salesReport: (date_from?: string, date_to?: string) =>
    req<SalesReport>(`/api/admin/reports/sales${qs({ date_from, date_to })}`),
  stockReport: () => req<StockReport>("/api/admin/reports/stock"),
  servicesReport: (date_from?: string, date_to?: string) =>
    req<ServicesReport>(`/api/admin/reports/services${qs({ date_from, date_to })}`),
  reportCsvUrl: (kind: "sales" | "stock" | "services", date_from?: string, date_to?: string) =>
    `/api/admin/reports/${kind}${qs({ format: "csv", date_from, date_to })}`,

  // users
  users: () => req<User[]>("/api/admin/users"),
  createUser: (body: { username: string; password: string; role: Role }) =>
    req<User>("/api/admin/users", json("POST", body)),
  updateUser: (id: number, body: { password?: string; role?: Role; active?: boolean }) =>
    req<User>(`/api/admin/users/${id}`, json("PATCH", body)),
  deleteUser: (id: number) => req(`/api/admin/users/${id}`, json("DELETE")),
};

// ---- types ----
export type Role = "owner" | "warehouse" | "sales" | "content";
export type Lang = "ru" | "tk" | "en";
export const LANGS: Lang[] = ["ru", "tk", "en"];

export interface Stats {
  orders_new: number;
  orders_today: number;
  orders_week: number;
  revenue_week: number | null;
  reviews_pending: number;
  top_products: { id: number; title: string; sold: number }[];
  low_stock: { id: number; title: string; stock_qty: number }[];
}

export type OrderStatus = "new" | "confirmed" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded";
export interface Order {
  id: number;
  customer_name: string;
  phone: string;
  address: string;
  payment_method: string;
  comment: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total: number;
  promo_code: string;
  delivery: number;
  delivery_zone: string;
  discount: number;
  created_at: string;
  items: { product_id: number | null; service_id: number | null; kind: "product" | "service"; title: string; price: number; qty: number }[];
}

export interface Attribute {
  id: number;
  key: string;
  type: "select" | "number";
  unit: string;
  filterable: boolean;
  sort_order: number;
  translations: { lang: Lang; label: string }[];
}
export interface AttributeIn {
  key: string;
  type: "select" | "number";
  unit: string;
  filterable: boolean;
  translations: { lang: Lang; label: string }[];
}
export interface Category {
  id: number;
  slug: string;
  enabled: boolean;
  sort_order: number;
  parent_id: number | null;
  image: string | null;
  product_count: number;
  translations: { lang: Lang; name: string }[];
  attributes: Attribute[];
}
export interface CategoryIn {
  slug: string;
  enabled: boolean;
  parent_id: number | null;
  translations: { lang: Lang; name: string }[];
}
export interface ShopServiceTr {
  lang: Lang;
  title: string;
  short: string;
  body: string;
  feats: string[];
}
export interface ShopService {
  id: number;
  slug: string;
  category_id: number;
  price: number;
  price_from: boolean;
  image: string | null;
  currency: string;
  icon: string;
  enabled: boolean;
  sort_order: number;
  translations: ShopServiceTr[];
}
export interface ShopServiceIn {
  slug: string;
  price: number;
  price_from: boolean;
  icon: string;
  enabled: boolean;
  translations: ShopServiceTr[];
}

export interface Spec {
  label: string;
  value: string;
}
export interface ProductTr {
  lang: Lang;
  title: string;
  short: string;
  body: string;
  specs: Spec[];
}
export interface ComponentIn {
  product_id: number | null;
  service_id: number | null;
  qty: number;
}
export interface Component extends ComponentIn {
  title: string;
  price: number;
}
export interface ProductAttr {
  attribute_id: number;
  value: string;
  num_value: number | null;
}
export interface Product {
  id: number;
  slug: string;
  category_id: number;
  brand_id: number | null;
  is_new: boolean;
  price: number;
  old_price: number | null;
  currency: string;
  in_stock: boolean;
  stock_qty: number | null;
  sku: string;
  barcode: string | null;
  enabled: boolean;
  sort_order: number;
  image_count: number;
  translations: ProductTr[];
  attributes: ProductAttr[];
  components: Component[];
}
export interface ProductIn {
  slug: string;
  category_id: number;
  brand_id: number | null;
  is_new: boolean;
  price: number;
  old_price: number | null;
  in_stock: boolean;
  stock_qty: number | null;
  sku: string;
  barcode: string | null;
  enabled: boolean;
  translations: ProductTr[];
  attributes: ProductAttr[];
  components: ComponentIn[];
}
export interface ProductImage {
  id: number;
  filename: string;
  sort_order: number;
}

export interface Brand {
  id: number;
  slug: string | null;
  name: string;
  enabled: boolean;
  sort_order: number;
}

export type ReviewStatus = "pending" | "approved" | "rejected";
export interface Review {
  id: number;
  product_id: number;
  product_title: string;
  product_slug: string;
  name: string;
  rating: number;
  text: string;
  status: ReviewStatus;
  created_at: string;
}

export interface Promo {
  id: number;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  min_total: number;
  active: boolean;
  expires_at: string | null;
  used_count: number;
  max_uses: number | null;
  created_at: string;
}
export interface PromoIn {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  min_total: number;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
}

export interface Settings {
  phone: string;
  whatsapp: string;
  email: string;
  address_ru: string;
  address_tk: string;
  address_en: string;
  hours_ru: string;
  hours_tk: string;
  hours_en: string;
}

export type LeadStatus = "new" | "read" | "done";
export interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string;
  message: string;
  service_id: number | null;
  service_title: string;
  status: LeadStatus;
  created_at: string;
}

export interface PosLookup {
  id: number;
  title: string;
  price: number;
  currency: string;
  stock_qty: number | null;
  barcode: string | null;
  sku: string | null;
}
export interface SaleIn {
  items: { product_id: number; qty: number }[];
  sold_total?: number | null;
  payment_method: "cash" | "terminal" | "debt";
  debtor_name?: string | null;
  debtor_phone?: string | null;
}
export interface Sale {
  id: number;
  seller: string;
  subtotal: number;
  sold_total: number;
  discount: number;
  cost_total: number;
  status: "paid" | "debt";
  payment_method: "cash" | "terminal" | "debt";
  debtor_name: string | null;
  debtor_phone: string | null;
  settled_at: string | null;
  created_at: string | null;
  items: { product_id: number | null; title: string; price: number; qty: number }[];
}

export interface StockRow {
  id: number;
  title: string;
  sku: string | null;
  stock_qty: number | null;
  cost_price: number | null;
  price: number;
  in_stock: boolean;
  enabled: boolean;
  low: boolean;
}
export type MovementKind = "receipt" | "sale" | "return" | "writeoff" | "adjust";
export interface Movement {
  id: number;
  product_id: number;
  product_title: string;
  qty_delta: number;
  stock_after: number | null;
  kind: MovementKind;
  note: string;
  unit_cost: number | null;
  supplier_id: number | null;
  order_id: number | null;
  purchase_id: number | null;
  username: string;
  created_at: string | null;
}
export interface MovementIn {
  product_id: number;
  kind: "receipt" | "writeoff" | "adjust";
  qty?: number;
  new_qty?: number;
  note?: string;
  unit_cost?: number;
  supplier_id?: number;
}
export interface Supplier {
  id: number;
  name: string;
  phone: string;
  note: string;
  active: boolean;
  created_at: string | null;
}
export interface Purchase {
  id: number;
  supplier_id: number | null;
  supplier_name: string;
  note: string;
  total_cost: number;
  username: string;
  created_at: string | null;
  items: { product_id: number | null; title: string; qty: number; unit_cost: number }[];
}
export interface PurchaseIn {
  supplier_id: number | null;
  note: string;
  items: { product_id: number; qty: number; unit_cost: number }[];
}

export interface SalesReport {
  from: string;
  to: string;
  orders: number;
  revenue: number;
  discounts: number;
  delivery: number;
  cogs: number;
  gross_profit: number;
  avg_check: number;
  cost_coverage: number | null;
  channels: Record<"online" | "pos", { orders: number; revenue: number; profit: number }>;
  debts_outstanding: number;
  daily: { day: string; orders: number; revenue: number }[];
  top_products: { id: number; title: string; qty: number; revenue: number; profit: number }[];
}
export interface StockReportRow {
  id: number;
  title: string;
  sku: string | null;
  stock_qty: number | null;
  cost_price: number | null;
  price: number;
  value_cost: number;
}
export interface StockReport {
  value_cost: number;
  value_retail: number;
  units: number;
  tracked_count: number;
  dead_days: number;
  low_stock: StockReportRow[];
  dead_stock: StockReportRow[];
  items: StockReportRow[];
}
export interface ServicesReport {
  from: string;
  to: string;
  total_count: number;
  total_revenue: number;
  services: { id: number; title: string; count: number; revenue: number }[];
}

export interface User {
  id: number;
  username: string;
  role: Role;
  active: boolean;
  created_at: string | null;
}

export interface BannerTr {
  lang: Lang;
  title: string;
  subtitle: string;
}
export interface Banner {
  id: number;
  image: string | null;
  link: string;
  enabled: boolean;
  sort_order: number;
  translations: BannerTr[];
}
export interface BannerIn {
  link: string;
  enabled: boolean;
  translations: BannerTr[];
}

export interface PageBlock {
  title: string;
  body: string;
}
export interface SitePageTr {
  lang: Lang;
  title: string;
  lead: string;
  blocks: PageBlock[];
}
export interface SitePage {
  id: number;
  slug: string;
  enabled: boolean;
  sort_order: number;
  translations: SitePageTr[];
}
export interface SitePageIn {
  slug: string;
  enabled: boolean;
  translations: SitePageTr[];
}

export interface ZoneTr {
  lang: Lang;
  name: string;
  note: string;
}
export interface ZoneIn {
  price: number;
  free_from: number | null;
  is_pickup: boolean;
  is_default: boolean;
  enabled: boolean;
  translations: ZoneTr[];
}
export interface Zone extends ZoneIn {
  id: number;
  sort_order: number;
}
