"use client";
import Link from "next/link";
import type { ShopCard } from "@/lib/shop-types";
import { useShop } from "./shop-context";

export default function ProductCard({ p }: { p: ShopCard }) {
  const { pick, t, mediaBase, add } = useShop();
  const title = pick(p.title);
  const img = p.image ? `${mediaBase}/${p.image}` : null;

  return (
    <div className="shop-card">
      <Link href={`/shop/product/${p.slug}`} className="shop-card-img">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={title} loading="lazy" />
        ) : (
          <div className="shop-card-noimg">KM</div>
        )}
        <span className={`shop-stock ${p.in_stock ? "in" : "out"}`}>
          {p.in_stock ? t("inStock") : t("toOrder")}
        </span>
      </Link>
      <div className="shop-card-body">
        <Link href={`/shop/product/${p.slug}`} className="shop-card-title">{title}</Link>
        {pick(p.short) && <p className="shop-card-short">{pick(p.short)}</p>}
        <div className="shop-card-foot">
          <span className="shop-price">{p.price.toLocaleString("ru-RU")} {p.currency}</span>
          <button
            className="shop-btn sm"
            onClick={() => add({ id: p.id, slug: p.slug, titles: p.title, price: p.price, currency: p.currency, image: p.image })}
          >
            {t("addToCart")}
          </button>
        </div>
      </div>
    </div>
  );
}
