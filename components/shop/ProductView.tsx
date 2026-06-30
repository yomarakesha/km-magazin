"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProductDetail } from "@/lib/shop-types";
import { SHOP, waLink } from "@/lib/shop-config";
import { useShop } from "./shop-context";
import Icon from "./ui/Icon";
import ProductImage from "./ProductImage";
import Modal from "./ui/Modal";
import RelatedProducts from "./RelatedProducts";
import PdpBuyBar from "./PdpBuyBar";
import Reveal from "@/components/Reveal";

export default function ProductView({ p }: { p: ProductDetail }) {
  const { t, pick, lang, mediaBase, add } = useShop();
  const [active, setActive] = useState(0);
  const [added, setAdded] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const title = pick(p.title);
  const images = p.images.map((src) => `${mediaBase}/${src}`);
  const hasImg = images.length > 0;
  const mainSrc = hasImg ? images[active] : null;
  const specs = p.specs[lang] ?? p.specs.ru ?? [];

  function addToCart() {
    add({ id: p.id, slug: p.slug, titles: p.title, price: p.price, currency: p.currency, image: p.images[0] ?? null });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  // sticky buy bar appears once the main buy actions scroll out of view
  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="shop-wrap shop-pdp">
      <p className="shop-crumbs">
        <Link href="/shop">{t("catalog")}</Link> ›{" "}
        <Link href={`/shop/category/${p.category}`}>{p.category}</Link>
      </p>

      <div className="shop-pdp-grid">
        <div className="shop-pdp-gallery">
          <button className="shop-pdp-main" onClick={() => hasImg && setZoom(true)} aria-label={title} style={{ cursor: hasImg ? "zoom-in" : "default" }}>
            <ProductImage src={mainSrc} alt={title} seed={p.slug} category={p.category} variant="pdp" />
            {hasImg && <span className="shop-pdp-zoom"><Icon name="search" size={16} /></span>}
          </button>
          {images.length > 1 && (
            <div className="shop-pdp-thumbs">
              {images.map((src, i) => (
                <button key={i} className={i === active ? "on" : ""} onClick={() => setActive(i)} aria-label={`${title} ${i + 1}`}>
                  <ProductImage src={src} alt="" seed={`${p.slug}-${i}`} variant="thumb" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shop-pdp-info">
          <span className={`shop-stock ${p.in_stock ? "in" : "out"}`} style={{ position: "static" }}>
            {p.in_stock ? t("inStock") : t("toOrder")}
          </span>
          <h1 className="shop-h1">{title}</h1>
          {pick(p.short) && <p className="shop-pdp-short">{pick(p.short)}</p>}
          <div className="shop-pdp-price">{p.price.toLocaleString("ru-RU")} {p.currency}</div>
          <div className="shop-pdp-actions" ref={actionsRef}>
            <button className={`shop-btn ${added ? "added" : ""}`} onClick={addToCart}>
              {added ? <><Icon name="check" size={16} /> {t("inCart")}</> : t("addToCart")}
            </button>
            <a className="shop-btn wa" href={waLink(`${title} — ${p.price} ${p.currency}`)} target="_blank" rel="noreferrer">
              <Icon name="whatsapp" size={16} /> {t("orderWhatsapp")}
            </a>
          </div>
          <div className="shop-pdp-trust">
            <span><Icon name="truck" size={16} /> {t("fastDelivery")}</span>
            <span><Icon name="shield" size={16} /> {t("warranty")}</span>
            <span><Icon name="phone" size={15} /> {SHOP.phone}</span>
          </div>

          {p.attributes.length > 0 && (
            <div className="shop-highlights">
              <div className="shop-section-label">{t("highlights")}</div>
              <div className="shop-highlight-grid">
                {p.attributes.slice(0, 6).map((a) => (
                  <div key={a.key} className="shop-highlight">
                    <span className="hl-v">{a.value}{a.unit ? ` ${a.unit}` : ""}</span>
                    <span className="hl-k">{pick(a.label) || a.key}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {pick(p.body) && (
        <Reveal className="shop-pdp-body">
          <div className="shop-section-label">{t("overview")}</div>
          <p>{pick(p.body)}</p>
        </Reveal>
      )}

      {specs.length > 0 && (
        <Reveal className="shop-pdp-specs">
          <div className="shop-section-label">{t("specs")}</div>
          <table>
            <tbody>
              {specs.map((s, i) => (
                <tr key={i}><td>{s.label}</td><td>{s.value}</td></tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      )}

      <RelatedProducts category={p.category} excludeId={p.id} />

      <PdpBuyBar show={showBar} title={title} price={p.price} currency={p.currency}
        added={added} inStock={p.in_stock} onAdd={addToCart} t={t} />

      {zoom && hasImg && (
        <Modal onClose={() => setZoom(false)} label={title}>
          <div className="shop-zoom">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[active]} alt={title} />
          </div>
        </Modal>
      )}
    </div>
  );
}
