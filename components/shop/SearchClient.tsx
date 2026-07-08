"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ShopCard } from "@/lib/shop-types";
import { fetchSearch, type SearchResult } from "@/lib/shop-api";
import { useShop } from "@/components/shop/shop-context";
import ProductCard from "@/components/shop/ProductCard";
import ShopSidebar from "@/components/shop/ShopSidebar";
import PopularProducts from "@/components/shop/PopularProducts";
import { SkeletonGrid } from "@/components/shop/ui/Skeleton";

const SORTS = ["sortDefault", "sortPriceAsc", "sortPriceDesc", "sortNew"] as const;
const SORT_VAL: Record<string, string> = { sortDefault: "", sortPriceAsc: "price_asc", sortPriceDesc: "price_desc", sortNew: "new" };

/** Hydrates the SSR-rendered first page (`initial`, fetched for
 * `initialQuery`) and takes over sorting + load-more client-side. */
export default function SearchClient({ initial, initialQuery }: { initial: SearchResult | null; initialQuery: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { t } = useShop();
  const [products, setProducts] = useState<ShopCard[]>(initial?.products ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [loading, setLoading] = useState(initial === null);
  const [more, setMore] = useState(false);

  const query = sp.toString();
  const q = sp.get("q") ?? "";
  // discards a stale loadMore whose page belongs to a since-changed query
  const reqId = useRef(0);

  useEffect(() => {
    // the SSR payload already covers the initial query; refetch only after
    // the client changes it (sort switch, new search) or SSR came up empty
    if (query === initialQuery && initial !== null) return;
    reqId.current += 1;
    const my = reqId.current;
    setLoading(true);
    fetchSearch(query)
      .then((d) => { if (reqId.current === my) { setProducts(d.products); setTotal(d.total); } })
      .catch(() => { if (reqId.current === my) { setProducts([]); setTotal(0); } })
      .finally(() => { if (reqId.current === my) setLoading(false); });
  }, [query, initialQuery, initial]);

  const hasMore = products.length < total;

  async function loadMore() {
    const my = reqId.current;
    setMore(true);
    try {
      const next = new URLSearchParams(query);
      next.set("offset", String(products.length));
      const d = await fetchSearch(next.toString());
      if (reqId.current === my) setProducts((cur) => [...cur, ...d.products]);
    } catch {}
    finally { if (reqId.current === my) setMore(false); }
  }

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
            {!loading && <span className="shop-count">{total} {t("found")}</span>}
            <select className="shop-sort" value={sp.get("sort") ?? ""} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => <option key={s} value={SORT_VAL[s]}>{t(s)}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonGrid />
        ) : products.length === 0 ? (
          <>
            <p className="shop-empty">{t("nothingFound")}</p>
            <PopularProducts />
          </>
        ) : (
          <>
            <div className="shop-grid">
              {products.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}
            </div>
            {hasMore && (
              <div className="shop-more">
                <button className="shop-btn ghost" onClick={loadMore} disabled={more}>
                  {more ? "…" : `${t("showMore")} (${total - products.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
