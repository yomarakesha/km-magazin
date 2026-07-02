"use client";
import Link from "next/link";
import { useShop } from "@/components/shop/shop-context";
import ProductCard from "@/components/shop/ProductCard";

/** Favorites are stored client-side (localStorage snapshots, like the cart). */
export default function FavoritesPage() {
  const { t, favs } = useShop();

  return (
    <div className="shop-wrap">
      <h1 className="shop-h1">{t("favorites")}</h1>
      {favs.length === 0 ? (
        <>
          <p className="shop-empty">{t("favoritesEmpty")}</p>
          <Link href="/shop" className="shop-btn ghost">{t("continueShopping")}</Link>
        </>
      ) : (
        <div className="shop-grid">
          {favs.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}
        </div>
      )}
    </div>
  );
}
