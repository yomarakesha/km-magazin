/** Shared shop types. Texts arrive as per-language maps so the UI can switch
 *  language client-side, like the landing. */
export type Lang = "ru" | "tk" | "en";
export type I18n = Partial<Record<Lang, string>>;

export interface ShopCard {
  id: number;
  slug: string;
  price: number;
  currency: string;
  in_stock: boolean;
  image: string | null; // path relative to mediaBase, e.g. "products/x.jpg"
  title: I18n;
  short: I18n;
}

export interface CatalogCategory {
  slug: string;
  name: I18n;
  product_count: number;
}

export interface Catalog {
  mediaBase: string;
  categories: CatalogCategory[];
  products: ShopCard[];
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
  price: number;
  currency: string;
  in_stock: boolean;
  title: I18n;
  short: I18n;
  body: I18n;
  specs: Partial<Record<Lang, { label: string; value: string }[]>>;
  images: string[];
  attributes: ProductAttrView[];
}
