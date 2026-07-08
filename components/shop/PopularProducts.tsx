"use client";
import { useEffect, useState } from "react";
import type { ShopCard } from "@/lib/shop-types";
import { fetchCatalogPage } from "@/lib/shop-api";
import { useShop } from "./shop-context";
import ProductCard from "./ProductCard";

/** A small "popular products" shelf shown inside empty states (empty cart,
 *  favorites, no search results) so a dead end always offers a way forward. */
export default function PopularProducts({ limit = 4, excludeIds = [] }: { limit?: number; excludeIds?: number[] }) {
  const { t } = useShop();
  const [cards, setCards] = useState<ShopCard[]>([]);

  useEffect(() => {
    let live = true;
    fetchCatalogPage(0, limit + excludeIds.length)
      .then((c) => { if (live) setCards(c.products.filter((p) => !excludeIds.includes(p.id)).slice(0, limit)); })
      .catch(() => {});
    return () => { live = false; };
  }, [limit]); // eslint-disable-line react-hooks/exhaustive-deps

  if (cards.length === 0) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <div className="shop-section-label">{t("popular")}</div>
      <div className="shop-grid">
        {cards.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}
      </div>
    </div>
  );
}
