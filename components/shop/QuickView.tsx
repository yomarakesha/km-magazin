"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductDetail } from "@/lib/shop-types";
import { fetchProduct } from "@/lib/shop-api";
import Modal from "./ui/Modal";
import Icon from "./ui/Icon";
import ProductImage from "./ProductImage";
import { useShop } from "./shop-context";

export default function QuickView() {
  const { quickView, closeQuickView, t, pick, lang, mediaBase, add } = useShop();
  const [data, setData] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!quickView) { setData(null); return; }
    let live = true;
    setLoading(true); setData(null); setAdded(false);
    fetchProduct(quickView)
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setData(null); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [quickView]);

  if (!quickView) return null;

  const title = data ? pick(data.title) : "";
  const img = data?.images[0] ? `${mediaBase}/${data.images[0]}` : null;
  // характеристики: attribute rows first (filterable), then free-form specs
  const specRows = data
    ? [
        ...data.attributes.map((a) => ({ label: pick(a.label), value: a.unit ? `${a.value} ${a.unit}` : a.value })),
        ...(data.specs[lang] ?? data.specs.ru ?? []),
      ]
    : [];

  function addToCart() {
    if (!data) return;
    add({ id: data.id, slug: data.slug, titles: data.title, price: data.price, currency: data.currency, image: data.images[0] ?? null, category_id: data.category_id });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <Modal onClose={closeQuickView} label={title}>
      {loading || !data ? (
        <div className="shop-empty">…</div>
      ) : (
        <div className="shop-qv-grid">
          <div className="shop-qv-img">
            <ProductImage src={img} alt={title} seed={data.slug} category={data.category} variant="pdp" />
          </div>
          <div className="shop-qv-info">
            <span className={`shop-stock ${data.in_stock ? "in" : "out"}`} style={{ position: "static" }}>
              {data.in_stock ? t("inStock") : t("toOrder")}
            </span>
            <h2>{title}</h2>
            {pick(data.short) && <p className="shop-pdp-short">{pick(data.short)}</p>}
            <div className="shop-pdp-price">{data.price.toLocaleString("ru-RU")} {data.currency}</div>
            <div className="shop-pdp-actions">
              <button className={`shop-btn ${added ? "added" : ""}`} onClick={addToCart}>
                {added ? <><Icon name="check" size={16} /> {t("inCart")}</> : t("addToCart")}
              </button>
            </div>
            {specRows.length > 0 && (
              <div className="shop-qv-specs">
                <div className="shop-section-label">{t("specs")}</div>
                <table className="shop-specs-table"><tbody>
                  {specRows.map((row, i) => (
                    <tr key={i}><td>{row.label}</td><td>{row.value}</td></tr>
                  ))}
                </tbody></table>
              </div>
            )}
            <Link href={`/shop/product/${data.slug}`} className="shop-link" onClick={closeQuickView}>
              {t("details")} <Icon name="arrow" size={14} />
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
