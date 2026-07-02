/** Shared shop types. Texts arrive as per-language maps so the UI can switch
 *  language client-side, like the landing. */
export type Lang = "ru" | "tk" | "en";
export type I18n = Partial<Record<Lang, string>>;

export interface ShopCard {
  id: number;
  slug: string;
  category_id?: number;
  price: number;
  old_price?: number | null;
  currency: string;
  in_stock: boolean;
  image: string | null; // path relative to mediaBase, e.g. "products/x.jpg"
  title: I18n;
  short: I18n;
  rating?: number | null;
  rating_count?: number;
}

export interface CatalogCategory {
  id: number;
  parent_id: number | null;
  slug: string;
  name: I18n;
  product_count: number;
}

/** A priced service attached to a category (install, setup, repair…). */
export interface ShopService {
  id: number;
  slug: string;
  category_id?: number;
  price: number;
  currency: string;
  icon: string;
  title: I18n;
  short: I18n;
}

export interface ProductReview {
  name: string;
  rating: number;
  text: string;
  created_at: string;
}

export interface ShopBrand {
  id: number;
  name: string;
}

export interface ShopSettings {
  phone: string;
  whatsapp: string;
  address: I18n;
}

export interface Catalog {
  mediaBase: string;
  categories: CatalogCategory[];
  products: ShopCard[];
  total: number;
  services: ShopService[];
  brands: ShopBrand[];
  settings: ShopSettings;
}

export interface FacetOption {
  value: string;
  count: number;
}

export interface Facet {
  key: string;
  label: I18n;
  type: "select" | "number";
  unit: string;
  options?: FacetOption[]; // select
  min?: number | null; // number
  max?: number | null; // number
}

export interface CategoryView {
  mediaBase: string;
  slug: string;
  name: I18n;
  facets: Facet[];
  products: ShopCard[];
  total: number;
  services: ShopService[];
}

export interface ProductAttrView {
  key: string;
  label: I18n;
  value: string;
  unit: string;
}

export interface ProductDetail {
  mediaBase: string;
  id: number;
  slug: string;
  category: string;
  category_id?: number;
  price: number;
  old_price?: number | null;
  currency: string;
  in_stock: boolean;
  stock_qty?: number | null;
  title: I18n;
  short: I18n;
  body: I18n;
  specs: Partial<Record<Lang, { label: string; value: string }[]>>;
  images: string[];
  attributes: ProductAttrView[];
  services: ShopService[];
  rating?: number | null;
  rating_count?: number;
  reviews?: ProductReview[];
}
