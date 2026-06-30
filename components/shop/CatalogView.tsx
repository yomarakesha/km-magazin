"use client";
import Link from "next/link";
import type { Catalog } from "@/lib/shop-types";
import { useShop } from "./shop-context";
import ProductCard from "./ProductCard";

export default function CatalogView({ catalog }: { catalog: Catalog }) {
  const { t, pick } = useShop();
  return (
    <div className="shop-wrap">
      <h1 className="shop-h1">{t("catalog")}</h1>

      {catalog.categories.length > 0 && (
        <div className="shop-cat-grid">
          {catalog.categories.map((c) => (
            <Link key={c.slug} href={`/shop/category/${c.slug}`} className="shop-cat-tile">
              <span className="shop-cat-name">{pick(c.name)}</span>
              <span className="shop-cat-count">{c.product_count}</span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="shop-h2">{t("allProducts")}</h2>
      {catalog.products.length === 0 ? (
        <p className="shop-empty">{t("nothingFound")}</p>
      ) : (
        <div className="shop-grid">
          {catalog.products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
