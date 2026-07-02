"use client";
import { useEffect, useState } from "react";
import type { ShopCard } from "@/lib/shop-types";
import { useShop } from "./shop-context";
import ProductCard from "./ProductCard";

const KEY = "km_seen";
const MAX = 8;

/** Record a viewed product (call from the PDP). Deduped, newest first. */
export function rememberViewed(card: ShopCard) {
  try {
    const cur: ShopCard[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const next = [card, ...cur.filter((c) => c.id !== card.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

/** "Recently viewed" shelf; reads localStorage after mount (hydration-safe). */
export default function RecentlyViewed({ excludeId }: { excludeId?: number }) {
  const { t } = useShop();
  const [items, setItems] = useState<ShopCard[]>([]);

  useEffect(() => {
    try {
      const cur: ShopCard[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      setItems(cur.filter((c) => c.id !== excludeId).slice(0, 4));
    } catch {}
  }, [excludeId]);

  if (items.length === 0) return null;
  return (
    <section className="shop-recent">
      <h2 className="shop-h2">{t("recentlyViewed")}</h2>
      <div className="shop-grid">
        {items.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}
      </div>
    </section>
  );
}
