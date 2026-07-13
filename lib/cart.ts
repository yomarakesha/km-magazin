import type { I18n } from "./shop-types";

export type CartKind = "product" | "service";

export interface CartItem {
  id: number;
  kind: CartKind;
  slug: string;
  titles: I18n;
  price: number;
  currency: string;
  image: string | null;
  qty: number;
  category_id?: number | null; // for cart upsell matching
}

/** Stable cart key. Products and services have independent id spaces, so the
 *  kind must be part of the key to avoid a product and service colliding. */
export const cartUid = (i: { id: number; kind?: CartKind }) => `${i.kind ?? "product"}:${i.id}`;

/** Add `qty` of an item: merge into the existing line or append a new one. */
export function addItem(prev: CartItem[], entry: CartItem): CartItem[] {
  const uid = cartUid(entry);
  const found = prev.find((x) => cartUid(x) === uid);
  if (found) return prev.map((x) => (cartUid(x) === uid ? { ...x, qty: x.qty + entry.qty } : x));
  return [...prev, entry];
}

/** Set a line's quantity (clamped to >= 1; removal is explicit via removeItem). */
export function setItemQty(prev: CartItem[], uid: string, qty: number): CartItem[] {
  return prev.map((x) => (cartUid(x) === uid ? { ...x, qty: Math.max(1, qty) } : x));
}

export function removeItem(prev: CartItem[], uid: string): CartItem[] {
  return prev.filter((x) => cartUid(x) !== uid);
}

/** Overwrite line prices from a server re-check (uid → current price), so a
 *  drifted cart shows and charges the real price. Untouched lines keep ref. */
export function repriceItems(prev: CartItem[], priceByUid: Map<string, number>): CartItem[] {
  return prev.map((x) => {
    const p = priceByUid.get(cartUid(x));
    return p != null && p !== x.price ? { ...x, price: p } : x;
  });
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((n, x) => n + x.qty, 0);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((s, x) => s + x.price * x.qty, 0);
}

/** Effective discount at checkout: never exceeds the payable subtotal. */
export function effectiveDiscount(promoDiscount: number | null | undefined, total: number): number {
  return promoDiscount ? Math.min(promoDiscount, total) : 0;
}
