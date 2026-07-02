"use client";
import Link from "next/link";
import { useState } from "react";
import type { ShopCard } from "@/lib/shop-types";
import { useShop } from "./shop-context";
import ProductImage from "./ProductImage";
import Icon from "./ui/Icon";
import Stars from "./ui/Stars";
import Reveal from "@/components/Reveal";

export default function ProductCard({ p, i = 0, category }: { p: ShopCard; i?: number; category?: string }) {
  const { pick, t, mediaBase, add, openQuickView, toggleCompare, inCompare, toggleFav, isFav } = useShop();
  const [added, setAdded] = useState(false);
  const title = pick(p.title);
  const img = p.image ? `${mediaBase}/${p.image}` : null;
  const hasSale = p.old_price != null && p.old_price > p.price;
  const salePct = hasSale ? Math.round((1 - p.price / p.old_price!) * 100) : 0;

  function addToCart() {
    add({ id: p.id, slug: p.slug, titles: p.title, price: p.price, currency: p.currency, image: p.image, category_id: p.category_id });
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
        {hasSale && <span className="shop-sale-badge">−{salePct}%</span>}
        <div className="shop-card-tools">
          <button
            className={`shop-qv ${isFav(p.id) ? "fav-on" : ""}`}
            onClick={() => toggleFav(p)}
            aria-label={t("favorites")}
            title={t("favorites")}
            aria-pressed={isFav(p.id)}
          >
            <Icon name="heart" size={16} />
          </button>
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
        {p.rating != null && (p.rating_count ?? 0) > 0 && <Stars value={p.rating} count={p.rating_count} />}
        {pick(p.short) && <p className="shop-card-short">{pick(p.short)}</p>}
        <div className="shop-card-foot">
          <span className="shop-price">
            {hasSale && <s className="shop-price-old">{p.old_price!.toLocaleString("ru-RU")}</s>}
            {p.price.toLocaleString("ru-RU")} {p.currency}
          </span>
          <button className={`shop-btn sm ${added ? "added" : ""}`} onClick={addToCart}>
            {added ? <Icon name="check" size={16} /> : t("addToCart")}
          </button>
        </div>
      </div>
    </Reveal>
  );
}
