"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProductDetail } from "@/lib/shop-types";
import { useShop } from "./shop-context";
import Icon from "./ui/Icon";
import ProductImage from "./ProductImage";
import Modal from "./ui/Modal";
import RelatedProducts from "./RelatedProducts";
import ServicesSection from "./ServicesSection";
import PdpBuyBar from "./PdpBuyBar";
import Reviews from "./Reviews";
import RecentlyViewed, { rememberViewed } from "./RecentlyViewed";
import Stars from "./ui/Stars";
import Reveal from "@/components/Reveal";

export default function ProductView({ p }: { p: ProductDetail }) {
  const { t, pick, lang, mediaBase, add, settings, toggleFav, isFav } = useShop();
  const [active, setActive] = useState(0);
  const [added, setAdded] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [shared, setShared] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const title = pick(p.title);

  // native share sheet where available (mobile), else copy the link to clipboard
  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const data = { title, text: `${title} — ${p.price} ${p.currency}`, url };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch { /* user cancelled the share sheet — nothing to do */ }
  }
  const images = p.images.map((src) => `${mediaBase}/${src}`);
  const hasImg = images.length > 0;
  const mainSrc = hasImg ? images[active] : null;
  const specs = p.specs[lang] ?? p.specs.ru ?? [];

  function addToCart() {
    add({ id: p.id, slug: p.slug, titles: p.title, price: p.price, currency: p.currency, image: p.images[0] ?? null, category_id: p.category_id });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const favCard = { id: p.id, slug: p.slug, category_id: p.category_id, price: p.price, old_price: p.old_price, currency: p.currency, in_stock: p.in_stock, image: p.images[0] ?? null, title: p.title, short: p.short };

  // record this product in the "recently viewed" shelf
  useEffect(() => {
    rememberViewed(favCard);
  }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
          {p.rating != null && (p.rating_count ?? 0) > 0 && (
            <a href="#reviews" className="shop-pdp-stars"><Stars value={p.rating} count={p.rating_count} size={16} /></a>
          )}
          {pick(p.short) && <p className="shop-pdp-short">{pick(p.short)}</p>}
          <div className="shop-pdp-price">
            {p.old_price != null && p.old_price > p.price && (
              <>
                <s className="shop-price-old lg">{p.old_price.toLocaleString("ru-RU")}</s>
                <span className="shop-sale-badge inline">−{Math.round((1 - p.price / p.old_price) * 100)}%</span>
              </>
            )}
            {p.price.toLocaleString("ru-RU")} {p.currency}
          </div>
          {p.in_stock && p.stock_qty != null && p.stock_qty > 0 && p.stock_qty <= 5 && (
            <p className="shop-low-stock"><Icon name="box" size={15} /> {t("lowStock")}: {p.stock_qty}</p>
          )}
          <div className="shop-pdp-actions" ref={actionsRef}>
            <button className={`shop-btn ${added ? "added" : ""}`} onClick={addToCart}>
              {added ? <><Icon name="check" size={16} /> {t("inCart")}</> : t("addToCart")}
            </button>
            <button
              className={`shop-btn ghost shop-fav-toggle ${isFav(p.id) ? "on" : ""}`}
              onClick={() => toggleFav(favCard)}
              aria-pressed={isFav(p.id)}
            >
              <Icon name="heart" size={16} /> {isFav(p.id) ? t("inFavorites") : t("favorites")}
            </button>
            <button className="shop-btn ghost" onClick={share} title={t("share")}>
              <Icon name="share" size={16} /> {shared ? t("shareCopied") : t("share")}
            </button>
          </div>
          <div className="shop-pdp-trust">
            <span><Icon name="truck" size={16} /> {t("fastDelivery")}</span>
            <span><Icon name="shield" size={16} /> {t("warranty")}</span>
            {settings.phone && <span><Icon name="phone" size={15} /> {settings.phone}</span>}
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

      {p.services && p.services.length > 0 && (
        <Reveal>
          <ServicesSection services={p.services} heading={t("services")} />
        </Reveal>
      )}

      <Reviews slug={p.slug} reviews={p.reviews ?? []} rating={p.rating ?? null} count={p.rating_count ?? 0} />

      <RelatedProducts category={p.category} excludeId={p.id} />

      <RecentlyViewed excludeId={p.id} />

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
