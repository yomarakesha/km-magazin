"use client";
import Link from "next/link";
import { useState } from "react";
import type { ProductDetail } from "@/lib/shop-types";
import { SHOP, waLink } from "@/lib/shop-config";
import { useShop } from "./shop-context";

export default function ProductView({ p }: { p: ProductDetail }) {
  const { t, pick, lang, mediaBase, add } = useShop();
  const [active, setActive] = useState(0);
  const [added, setAdded] = useState(false);

  const title = pick(p.title);
  const images = p.images.map((src) => `${mediaBase}/${src}`);
  const specs = p.specs[lang] ?? p.specs.ru ?? [];

  function addToCart() {
    add({ id: p.id, slug: p.slug, titles: p.title, price: p.price, currency: p.currency, image: p.images[0] ?? null });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="shop-wrap shop-pdp">
      <p className="shop-crumbs">
        <Link href="/shop">{t("catalog")}</Link> ›{" "}
        <Link href={`/shop/category/${p.category}`}>{p.category}</Link>
      </p>

      <div className="shop-pdp-grid">
        <div className="shop-pdp-gallery">
          <div className="shop-pdp-main">
            {images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[active]} alt={title} />
            ) : (
              <div className="shop-card-noimg">KM</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="shop-pdp-thumbs">
              {images.map((src, i) => (
                <button key={i} className={i === active ? "on" : ""} onClick={() => setActive(i)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shop-pdp-info">
          <h1 className="shop-h1">{title}</h1>
          <span className={`shop-stock ${p.in_stock ? "in" : "out"}`}>
            {p.in_stock ? t("inStock") : t("toOrder")}
          </span>
          {pick(p.short) && <p className="shop-pdp-short">{pick(p.short)}</p>}
          <div className="shop-pdp-price">{p.price.toLocaleString("ru-RU")} {p.currency}</div>
          <div className="shop-pdp-actions">
            <button className="shop-btn" onClick={addToCart}>{added ? "✓ " + t("inCart") : t("addToCart")}</button>
            <a className="shop-btn wa" href={waLink(`${title} — ${p.price} ${p.currency}`)} target="_blank" rel="noreferrer">
              {t("orderWhatsapp")}
            </a>
          </div>
          <p className="shop-pdp-delivery">🚚 {t("deliveryNote")} · 📞 {SHOP.phone}</p>

          {p.attributes.length > 0 && (
            <ul className="shop-attrs">
              {p.attributes.map((a) => (
                <li key={a.key}>
                  <span>{pick(a.label) || a.key}</span>
                  <span>{a.value}{a.unit ? ` ${a.unit}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {pick(p.body) && (
        <div className="shop-pdp-body">
          <p>{pick(p.body)}</p>
        </div>
      )}

      {specs.length > 0 && (
        <div className="shop-pdp-specs">
          <h2 className="shop-h2">{t("specs")}</h2>
          <table>
            <tbody>
              {specs.map((s, i) => (
                <tr key={i}><td>{s.label}</td><td>{s.value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
