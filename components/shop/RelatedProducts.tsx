"use client";
import { useEffect, useState } from "react";
import type { ShopCard } from "@/lib/shop-types";
import { fetchCategory } from "@/lib/shop-api";
import { useShop } from "./shop-context";
import ProductCard from "./ProductCard";

/** Other products in the same category. Reuses the category endpoint — no
 *  backend change. Hidden until at least one sibling product is found. */
export default function RelatedProducts({ category, excludeId }: { category: string; excludeId: number }) {
  const { t } = useShop();
  const [items, setItems] = useState<ShopCard[]>([]);

  useEffect(() => {
    let live = true;
    fetchCategory(category, "")
      .then((d) => { if (live) setItems(d.products.filter((p) => p.id !== excludeId).slice(0, 4)); })
      .catch(() => { if (live) setItems([]); });
    return () => { live = false; };
  }, [category, excludeId]);

  if (items.length === 0) return null;

  return (
    <section className="shop-related">
      <h2 className="shop-h2">{t("related")}</h2>
      <div className="shop-grid">
        {items.map((p, i) => <ProductCard key={p.id} p={p} i={i} category={category} />)}
      </div>
    </section>
  );
}
