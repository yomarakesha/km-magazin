"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CatalogCategory, I18n, Lang, ShopCard } from "@/lib/shop-types";
import { T } from "@/lib/shop-i18n";

const LANGS: Lang[] = ["ru", "tk", "en"];

export interface CartItem {
  id: number;
  slug: string;
  titles: I18n;
  price: number;
  currency: string;
  image: string | null;
  qty: number;
}

interface ShopCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  pick: (m: I18n) => string;
  mediaBase: string;
  categories: CatalogCategory[];
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  count: number;
  total: number;
  // UI state
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  quickView: string | null;
  openQuickView: (slug: string) => void;
  closeQuickView: () => void;
  toast: { id: number; message: string } | null;
  // compare
  compareItems: ShopCard[];
  toggleCompare: (card: ShopCard) => void;
  inCompare: (id: number) => boolean;
  clearCompare: () => void;
  compareMax: number;
  compareOpen: boolean;
  openCompare: () => void;
  closeCompare: () => void;
}

const COMPARE_MAX = 4;

const Ctx = createContext<ShopCtx | null>(null);
const CART_KEY = "km_cart";

export function ShopProvider({ mediaBase, categories = [], children }: { mediaBase: string; categories?: CatalogCategory[]; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [quickView, setQuickView] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [compareItems, setCompareItems] = useState<ShopCard[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  // auto-dismiss the toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    try {
      const sl = localStorage.getItem("km_lang") as Lang | null;
      if (sl && LANGS.includes(sl)) setLangState(sl);
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("km_lang", l); } catch {}
    document.documentElement.lang = l;
  };

  const pick = (m: I18n) => m?.[lang] || m?.ru || Object.values(m || {})[0] || "";

  const add: ShopCtx["add"] = (item, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((x) => x.id === item.id);
      if (found) return prev.map((x) => (x.id === item.id ? { ...x, qty: x.qty + qty } : x));
      return [...prev, { ...item, qty }];
    });
    setToast({ id: Date.now(), message: pick(item.titles) });
  };
  const openCart = () => setCartOpen(true);
  const closeCart = () => setCartOpen(false);
  const openQuickView = (slug: string) => setQuickView(slug);
  const closeQuickView = () => setQuickView(null);

  const inCompare = (id: number) => compareItems.some((c) => c.id === id);
  const toggleCompare = (card: ShopCard) =>
    setCompareItems((prev) => {
      if (prev.some((c) => c.id === card.id)) return prev.filter((c) => c.id !== card.id);
      if (prev.length >= COMPARE_MAX) {
        setToast({ id: Date.now(), message: `max ${COMPARE_MAX}` });
        return prev;
      }
      return [...prev, card];
    });
  const clearCompare = () => { setCompareItems([]); setCompareOpen(false); };
  const openCompare = () => setCompareOpen(true);
  const closeCompare = () => setCompareOpen(false);
  const setQty = (id: number, qty: number) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x)));
  const remove = (id: number) => setItems((prev) => prev.filter((x) => x.id !== id));
  const clear = () => setItems([]);

  const t = (key: string) => T[lang][key] ?? key;

  const count = items.reduce((n, x) => n + x.qty, 0);
  const total = items.reduce((s, x) => s + x.price * x.qty, 0);

  const value = useMemo<ShopCtx>(
    () => ({
      lang, setLang, t, pick, mediaBase, categories, items, add, setQty, remove, clear, count, total,
      cartOpen, openCart, closeCart, quickView, openQuickView, closeQuickView, toast,
      compareItems, toggleCompare, inCompare, clearCompare, compareMax: COMPARE_MAX, compareOpen, openCompare, closeCompare,
    }),
    [lang, items, mediaBase, categories, cartOpen, quickView, toast, compareItems, compareOpen] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShop() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}

export { LANGS };
