"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CategoryView, ShopCard } from "@/lib/shop-types";
import { fetchCategory } from "@/lib/shop-api";
import { useShop } from "./shop-context";
import ProductCard from "./ProductCard";
import ShopSidebar from "./ShopSidebar";
import ServicesSection from "./ServicesSection";
import FilterBar from "./FilterBar";
import Icon from "./ui/Icon";
import { SkeletonGrid } from "./ui/Skeleton";

const SORTS = ["sortDefault", "sortPriceAsc", "sortPriceDesc", "sortNew"] as const;
const SORT_VAL: Record<string, string> = { sortDefault: "", sortPriceAsc: "price_asc", sortPriceDesc: "price_desc", sortNew: "new" };

export default function CategoryClient({ slug }: { slug: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { t, pick } = useShop();
  const [data, setData] = useState<CategoryView | null>(null);
  const [extra, setExtra] = useState<ShopCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);

  const query = sp.toString();
  // bumped whenever slug/query changes; a loadMore whose token is stale (its
  // page belongs to a filter/sort that has since changed) discards its result.
  const reqId = useRef(0);

  useEffect(() => {
    reqId.current += 1;
    const my = reqId.current;
    setLoading(true);
    setExtra([]); // filters/sort changed — restart from the first page
    fetchCategory(slug, query)
      .then((d) => { if (reqId.current === my) setData(d); })
      .catch(() => { if (reqId.current === my) setData(null); })
      .finally(() => { if (reqId.current === my) setLoading(false); });
  }, [slug, query]);

  const products = data ? [...data.products, ...extra] : [];
  const hasMore = data != null && products.length < data.total;

  async function loadMore() {
    if (!data) return;
    const my = reqId.current;
    setMore(true);
    try {
      const next = new URLSearchParams(query);
      next.set("offset", String(products.length));
      const d = await fetchCategory(slug, next.toString());
      if (reqId.current === my) setExtra((cur) => [...cur, ...d.products]);
    } catch {}
    finally { if (reqId.current === my) setMore(false); }
  }

  function apply(next: URLSearchParams) {
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : `/shop/category/${slug}`, { scroll: false });
  }
  function toggleSelect(key: string, value: string) {
    const next = new URLSearchParams(query);
    const set = new Set((next.get(key) ?? "").split(",").filter(Boolean));
    if (set.has(value)) set.delete(value); else set.add(value);
    if (set.size) next.set(key, [...set].join(",")); else next.delete(key);
    apply(next);
  }
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(query);
    if (value) next.set(key, value); else next.delete(key);
    apply(next);
  }
  function toggleBool(key: string) {
    const next = new URLSearchParams(query);
    if (next.get(key)) next.delete(key); else next.set(key, "1");
    apply(next);
  }
  function reset() { router.replace(`/shop/category/${slug}`, { scroll: false }); }

  const get = (key: string) => sp.get(key) ?? "";
  const isSelected = (key: string, value: string) =>
    (sp.get(key) ?? "").split(",").filter(Boolean).includes(value);

  // active-filter chips
  const chips: { label: string; onRemove: () => void }[] = [];
  const facetByKey = new Map((data?.facets ?? []).map((f) => [f.key, f]));
  for (const [key, raw] of new URLSearchParams(query).entries()) {
    if (key === "sort") continue;
    if (key === "in_stock") { chips.push({ label: t("onlyInStock"), onRemove: () => toggleBool("in_stock") }); continue; }
    if (key === "price_min") { chips.push({ label: `${t("price")} ${t("from")} ${raw}`, onRemove: () => setParam("price_min", "") }); continue; }
    if (key === "price_max") { chips.push({ label: `${t("price")} ${t("to")} ${raw}`, onRemove: () => setParam("price_max", "") }); continue; }
    const numKey = key.replace(/_(min|max)$/, "");
    const isNum = /_(min|max)$/.test(key);
    if (isNum) {
      const f = facetByKey.get(numKey);
      const lab = f ? pick(f.label) : numKey;
      const edge = key.endsWith("_min") ? t("from") : t("to");
      chips.push({ label: `${lab} ${edge} ${raw}`, onRemove: () => setParam(key, "") });
      continue;
    }
    const f = facetByKey.get(key);
    const lab = f ? pick(f.label) : key;
    for (const v of raw.split(",").filter(Boolean)) {
      chips.push({ label: `${lab}: ${v}`, onRemove: () => toggleSelect(key, v) });
    }
  }

  const currentSort = sp.get("sort") ?? "";
  const count = data?.total ?? 0;

  return (
    <div className="shop-wrap wide shop-list-layout">
      <ShopSidebar />

      <div className="shop-list-main">
        <div className="shop-cat-top">
          <h1 className="shop-h1">{data ? pick(data.name) : ""}</h1>
          <div className="shop-cat-controls">
            {!loading && <span className="shop-count">{count} {t("found")}</span>}
            <select className="shop-sort" value={currentSort} onChange={(e) => setParam("sort", e.target.value)}>
              {SORTS.map((s) => <option key={s} value={SORT_VAL[s]}>{t(s)}</option>)}
            </select>
          </div>
        </div>

        <FilterBar facets={data?.facets ?? []} t={t} pick={pick} get={get}
          isSelected={isSelected} toggleSelect={toggleSelect} setParam={setParam} toggleBool={toggleBool} />

        {chips.length > 0 && (
          <div className="shop-chips">
            {chips.map((c, i) => (
              <button key={i} className="shop-chip" onClick={c.onRemove}>{c.label} <Icon name="close" size={12} /></button>
            ))}
            <button className="shop-chip clear" onClick={reset}>{t("reset")}</button>
          </div>
        )}

        {loading ? (
          <SkeletonGrid />
        ) : !data || products.length === 0 ? (
          <p className="shop-empty">{t("nothingFound")}</p>
        ) : (
          <>
            <div className="shop-grid">
              {products.map((p, i) => <ProductCard key={p.id} p={p} i={i} category={slug} />)}
            </div>
            {hasMore && (
              <div className="shop-more">
                <button className="shop-btn ghost" onClick={loadMore} disabled={more}>
                  {more ? "…" : `${t("showMore")} (${(data?.total ?? 0) - products.length})`}
                </button>
              </div>
            )}
          </>
        )}

        {!loading && data && <ServicesSection services={data.services} />}
      </div>
    </div>
  );
}
