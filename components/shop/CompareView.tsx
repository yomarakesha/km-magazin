"use client";
import { Fragment, useEffect, useState } from "react";
import type { ProductDetail } from "@/lib/shop-types";
import { fetchProduct } from "@/lib/shop-api";
import Modal from "./ui/Modal";
import ProductImage from "./ProductImage";
import Icon from "./ui/Icon";
import { useShop } from "./shop-context";

/** Side-by-side comparison of the selected products: image/price/stock + a
 *  spec table aligned across the union of their attributes. */
export default function CompareView() {
  const { compareOpen, closeCompare, compareItems, mediaBase, t, pick, add } = useShop();
  const [details, setDetails] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!compareOpen) return;
    let live = true;
    setLoading(true); setDetails([]);
    Promise.all(compareItems.map((c) => fetchProduct(c.slug).catch(() => null)))
      .then((res) => { if (live) setDetails(res.filter((d): d is ProductDetail => d != null)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [compareOpen, compareItems]);

  if (!compareOpen) return null;

  // union of attribute keys across all products, in first-seen order
  const keys: { key: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const d of details) {
    for (const a of d.attributes) {
      if (!seen.has(a.key)) { seen.add(a.key); keys.push({ key: a.key, label: pick(a.label) || a.key }); }
    }
  }

  return (
    <Modal onClose={closeCompare} label={t("compareTitle")}>
      <div className="shop-compare">
        <h2 className="shop-compare-h">{t("compareTitle")}</h2>
        {loading || details.length === 0 ? (
          <div className="shop-empty">…</div>
        ) : (
          <div className="shop-compare-table" style={{ gridTemplateColumns: `minmax(116px, 150px) repeat(${details.length}, minmax(150px, 1fr))` }}>
            <div className="shop-compare-corner" />
            {details.map((d) => (
              <div key={d.id} className="shop-compare-head">
                <div className="shop-compare-img">
                  <ProductImage src={d.images[0] ? `${mediaBase}/${d.images[0]}` : null} alt={pick(d.title)} seed={d.slug} category={d.category} variant="thumb" />
                </div>
                <div className="shop-compare-title">{pick(d.title)}</div>
                <div className="shop-compare-price">{d.price.toLocaleString("ru-RU")} {d.currency}</div>
                <button className="shop-btn sm" onClick={() => add({ id: d.id, slug: d.slug, titles: d.title, price: d.price, currency: d.currency, image: d.images[0] ?? null })}>
                  <Icon name="cart" size={15} /> {t("addToCart")}
                </button>
              </div>
            ))}

            <div className="shop-compare-key">{t("inStock")}</div>
            {details.map((d) => (
              <div key={d.id} className="shop-compare-cell">
                <span className={`shop-stock ${d.in_stock ? "in" : "out"}`} style={{ position: "static" }}>
                  {d.in_stock ? t("inStock") : t("toOrder")}
                </span>
              </div>
            ))}

            {keys.map((k) => (
              <Fragment key={k.key}>
                <div className="shop-compare-key">{k.label}</div>
                {details.map((d) => {
                  const a = d.attributes.find((x) => x.key === k.key);
                  return <div key={d.id} className="shop-compare-cell">{a ? `${a.value}${a.unit ? ` ${a.unit}` : ""}` : "—"}</div>;
                })}
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
