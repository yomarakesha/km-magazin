"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CategoryView, Facet, I18n } from "@/lib/shop-types";
import { fetchCategory } from "@/lib/shop-api";
import { useShop } from "./shop-context";
import ProductCard from "./ProductCard";

const SORTS = ["sortDefault", "sortPriceAsc", "sortPriceDesc", "sortNew"] as const;
const SORT_VAL: Record<string, string> = { sortDefault: "", sortPriceAsc: "price_asc", sortPriceDesc: "price_desc", sortNew: "new" };

export default function CategoryClient({ slug }: { slug: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { t, pick } = useShop();
  const [data, setData] = useState<CategoryView | null>(null);
  const [loading, setLoading] = useState(true);

  const query = sp.toString();

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchCategory(slug, query)
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setData(null); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [slug, query]);

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
    // select attribute: one chip per value
    const f = facetByKey.get(key);
    const lab = f ? pick(f.label) : key;
    for (const v of raw.split(",").filter(Boolean)) {
      chips.push({ label: `${lab}: ${v}`, onRemove: () => toggleSelect(key, v) });
    }
  }

  const currentSort = sp.get("sort") ?? "";
  const count = data?.products.length ?? 0;

  return (
    <div className="shop-wrap shop-cat-layout">
      <aside className="shop-filters">
        <div className="shop-filters-head">
          <h3>{t("filters")}</h3>
          {chips.length > 0 && <button className="shop-link" onClick={reset}>{t("reset")}</button>}
        </div>

        <div className="shop-facet">
          <div className="shop-facet-title">{t("price")}</div>
          <div className="shop-range">
            <input type="number" placeholder={t("from")} defaultValue={sp.get("price_min") ?? ""}
              onBlur={(e) => setParam("price_min", e.target.value)} />
            <input type="number" placeholder={t("to")} defaultValue={sp.get("price_max") ?? ""}
              onBlur={(e) => setParam("price_max", e.target.value)} />
          </div>
        </div>

        <label className="shop-check">
          <input type="checkbox" checked={!!sp.get("in_stock")} onChange={() => toggleBool("in_stock")} />
          {t("onlyInStock")}
        </label>

        {data?.facets.map((f) => (
          <FacetBlock key={f.key} f={f} pick={pick} t={t}
            isSelected={isSelected} toggleSelect={toggleSelect}
            minVal={sp.get(`${f.key}_min`) ?? ""} maxVal={sp.get(`${f.key}_max`) ?? ""}
            setParam={setParam} />
        ))}
      </aside>

      <section className="shop-cat-main">
        <div className="shop-cat-top">
          <h1 className="shop-h1">{data ? pick(data.name) : ""}</h1>
          <div className="shop-cat-controls">
            {!loading && <span className="shop-count">{count} {t("found")}</span>}
            <select className="shop-sort" value={currentSort} onChange={(e) => setParam("sort", e.target.value)}>
              {SORTS.map((s) => <option key={s} value={SORT_VAL[s]}>{t(s)}</option>)}
            </select>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="shop-chips">
            {chips.map((c, i) => (
              <button key={i} className="shop-chip" onClick={c.onRemove}>{c.label} <span>✕</span></button>
            ))}
            <button className="shop-chip clear" onClick={reset}>{t("reset")}</button>
          </div>
        )}

        {loading ? (
          <p className="shop-empty">…</p>
        ) : !data || data.products.length === 0 ? (
          <p className="shop-empty">{t("nothingFound")}</p>
        ) : (
          <div className="shop-grid">
            {data.products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function FacetBlock({
  f, pick, t, isSelected, toggleSelect, minVal, maxVal, setParam,
}: {
  f: Facet;
  pick: (m: I18n) => string;
  t: (k: string) => string;
  isSelected: (key: string, value: string) => boolean;
  toggleSelect: (key: string, value: string) => void;
  minVal: string;
  maxVal: string;
  setParam: (key: string, value: string) => void;
}) {
  const label = pick(f.label) || f.key;
  if (f.type === "number") {
    return (
      <div className="shop-facet">
        <div className="shop-facet-title">{label}{f.unit ? `, ${f.unit}` : ""}</div>
        <div className="shop-range">
          <input type="number" placeholder={f.min != null ? String(f.min) : t("from")} defaultValue={minVal}
            onBlur={(e) => setParam(`${f.key}_min`, e.target.value)} />
          <input type="number" placeholder={f.max != null ? String(f.max) : t("to")} defaultValue={maxVal}
            onBlur={(e) => setParam(`${f.key}_max`, e.target.value)} />
        </div>
      </div>
    );
  }
  const options = (f.options ?? []).filter((o) => o.count > 0 || isSelected(f.key, o.value));
  if (options.length === 0) return null;
  return (
    <div className="shop-facet">
      <div className="shop-facet-title">{label}{f.unit ? `, ${f.unit}` : ""}</div>
      <div className="shop-facet-opts">
        {options.map((o) => (
          <label key={o.value} className="shop-check">
            <input type="checkbox" checked={isSelected(f.key, o.value)} onChange={() => toggleSelect(f.key, o.value)} />
            <span>{o.value}</span>
            <span className="shop-facet-count">{o.count}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
