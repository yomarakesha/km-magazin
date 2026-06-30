"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { I18n, Lang } from "@/lib/shop-types";
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
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  count: number;
  total: number;
}

const Ctx = createContext<ShopCtx | null>(null);
const CART_KEY = "km_cart";

export function ShopProvider({ mediaBase, children }: { mediaBase: string; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");
  const [items, setItems] = useState<CartItem[]>([]);

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

  const add: ShopCtx["add"] = (item, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((x) => x.id === item.id);
      if (found) return prev.map((x) => (x.id === item.id ? { ...x, qty: x.qty + qty } : x));
      return [...prev, { ...item, qty }];
    });
  };
  const setQty = (id: number, qty: number) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x)));
  const remove = (id: number) => setItems((prev) => prev.filter((x) => x.id !== id));
  const clear = () => setItems([]);

  const pick = (m: I18n) => m?.[lang] || m?.ru || Object.values(m || {})[0] || "";
  const t = (key: string) => T[lang][key] ?? key;

  const count = items.reduce((n, x) => n + x.qty, 0);
  const total = items.reduce((s, x) => s + x.price * x.qty, 0);

  const value = useMemo<ShopCtx>(
    () => ({ lang, setLang, t, pick, mediaBase, items, add, setQty, remove, clear, count, total }),
    [lang, items, mediaBase] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShop() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}

export { LANGS };
