"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ShopCard } from "@/lib/shop-types";
import { fetchSearch } from "@/lib/shop-api";
import { useShop } from "@/components/shop/shop-context";
import ProductCard from "@/components/shop/ProductCard";
import ShopSidebar from "@/components/shop/ShopSidebar";
import { SkeletonGrid } from "@/components/shop/ui/Skeleton";

const SORTS = ["sortDefault", "sortPriceAsc", "sortPriceDesc", "sortNew"] as const;
const SORT_VAL: Record<string, string> = { sortDefault: "", sortPriceAsc: "price_asc", sortPriceDesc: "price_desc", sortNew: "new" };

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="shop-wrap"><p className="shop-empty">…</p></div>}>
      <SearchInner />
    </Suspense>
  );
}

function SearchInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { t } = useShop();
  const [products, setProducts] = useState<ShopCard[]>([]);
  const [loading, setLoading] = useState(true);

  const query = sp.toString();
  const q = sp.get("q") ?? "";

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchSearch(query)
      .then((d) => { if (live) setProducts(d.products); })
      .catch(() => { if (live) setProducts([]); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [query]);

  function setSort(value: string) {
    const next = new URLSearchParams(query);
    if (value) next.set("sort", value); else next.delete("sort");
    router.replace(`/shop/search?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="shop-wrap shop-list-layout">
      <ShopSidebar />
      <div className="shop-list-main">
        <div className="shop-cat-top">
          <h1 className="shop-h1">{t("searchTitle")}: {q}</h1>
          <div className="shop-cat-controls">
            {!loading && <span className="shop-count">{products.length} {t("found")}</span>}
            <select className="shop-sort" value={sp.get("sort") ?? ""} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => <option key={s} value={SORT_VAL[s]}>{t(s)}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonGrid />
        ) : products.length === 0 ? (
          <p className="shop-empty">{t("nothingFound")}</p>
        ) : (
          <div className="shop-grid">
            {products.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}
