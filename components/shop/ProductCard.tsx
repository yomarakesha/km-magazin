"use client";
import Link from "next/link";
import { useState } from "react";
import type { ShopCard } from "@/lib/shop-types";
import { useShop } from "./shop-context";
import ProductImage from "./ProductImage";
import Icon from "./ui/Icon";
import Reveal from "@/components/Reveal";

export default function ProductCard({ p, i = 0, category }: { p: ShopCard; i?: number; category?: string }) {
  const { pick, t, mediaBase, add, openQuickView, toggleCompare, inCompare } = useShop();
  const [added, setAdded] = useState(false);
  const title = pick(p.title);
  const img = p.image ? `${mediaBase}/${p.image}` : null;

  function addToCart() {
    add({ id: p.id, slug: p.slug, titles: p.title, price: p.price, currency: p.currency, image: p.image });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <Reveal className="shop-card" delay={(i % 8) * 0.04}>
      <div className="shop-card-img">
        <Link href={`/shop/product/${p.slug}`} aria-label={title} className="shop-card-imglink">
          <ProductImage src={img} alt={title} seed={p.slug} category={category} variant="card" />
        </Link>
        <span className={`shop-stock ${p.in_stock ? "in" : "out"}`}>
          {p.in_stock ? t("inStock") : t("toOrder")}
        </span>
        <div className="shop-card-tools">
          <button className="shop-qv" onClick={() => openQuickView(p.slug)} aria-label={t("specs")} title={t("specs")}>
            <Icon name="eye" size={17} />
          </button>
          <button
            className={`shop-qv ${inCompare(p.id) ? "on" : ""}`}
            onClick={() => toggleCompare(p)}
            aria-label={t("compare")}
            title={t("compare")}
            aria-pressed={inCompare(p.id)}
          >
            <Icon name="compare" size={16} />
          </button>
        </div>
      </div>
      <div className="shop-card-body">
        <Link href={`/shop/product/${p.slug}`} className="shop-card-title">{title}</Link>
        {pick(p.short) && <p className="shop-card-short">{pick(p.short)}</p>}
        <div className="shop-card-foot">
          <span className="shop-price">{p.price.toLocaleString("ru-RU")} {p.currency}</span>
          <button className={`shop-btn sm ${added ? "added" : ""}`} onClick={addToCart}>
            {added ? <Icon name="check" size={16} /> : t("addToCart")}
          </button>
        </div>
      </div>
    </Reveal>
  );
}
