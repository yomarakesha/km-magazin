"use client";
import { useState } from "react";
import type { Catalog, ShopCard } from "@/lib/shop-types";
import { fetchCatalogPage } from "@/lib/shop-api";
import { useShop } from "./shop-context";
import ProductCard from "./ProductCard";
import ShopSidebar from "./ShopSidebar";
import Icon from "./ui/Icon";

export default function CatalogView({ catalog }: { catalog: Catalog }) {
  const { t, settings, wa } = useShop();
  const [extra, setExtra] = useState<ShopCard[]>([]);
  const [busy, setBusy] = useState(false);
  const products = [...catalog.products, ...extra];
  const hasMore = products.length < catalog.total;

  async function loadMore() {
    setBusy(true);
    try {
      const d = await fetchCatalogPage(products.length);
      setExtra((cur) => [...cur, ...d.products]);
    } catch {}
    finally { setBusy(false); }
  }

  return (
    <>
      {/* ---- split hero: copy + CTAs on the left, trust panel on the right ---- */}
      <section className="shop-hero">
        <div className="shop-wrap wide shop-hero-in">
          <div className="shop-hero-copy">
            <span className="shop-hero-tag"><span className="dot" /> KM · {t("shop")}</span>
            <h1>{t("catalog")}</h1>
            <p>{t("deliveryNote")}</p>
            <div className="shop-hero-cta">
              <a href="#products" className="shop-btn">
                <Icon name="grid" size={17} /> {t("allProducts")}
              </a>
              {settings.whatsapp && (
                <a href={wa(t("orderWhatsapp"))} target="_blank" rel="noreferrer" className="shop-btn wa">
                  <Icon name="whatsapp" size={17} /> WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="shop-hero-side" aria-hidden>
            <div className="shop-hero-stat">
              <div className="shop-hero-stat-ic"><Icon name="truck" size={20} /></div>
              <div><b>{t("fastDelivery")}</b><span>{t("delivery")}</span></div>
            </div>
            <div className="shop-hero-stat">
              <div className="shop-hero-stat-ic"><Icon name="shield" size={20} /></div>
              <div><b>{t("warranty")}</b><span>{t("guarantee")}</span></div>
            </div>
            <div className="shop-hero-stat">
              <div className="shop-hero-stat-ic"><Icon name="box" size={20} /></div>
              <div><b>{catalog.categories.length} {t("categories")}</b><span>{t("allProducts")}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- bright promo / trust band bridging the hero seam ---- */}
      <div className="shop-wrap wide">
        <div className="shop-promo">
          <span className="shop-promo-lead"><Icon name="whatsapp" size={17} /> {t("needHelp")}</span>
          {settings.whatsapp && <a href={wa(t("orderWhatsapp"))} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} /> {t("orderWhatsapp")}</a>}
          {settings.phone && <a href={`tel:${settings.phone.replace(/\s/g, "")}`}><Icon name="phone" size={15} /> {t("callUs")} · {settings.phone}</a>}
        </div>
      </div>

      {/* ---- main: category rail + product grid ---- */}
      <div className="shop-wrap wide shop-list-layout" id="products">
        <ShopSidebar />
        <div className="shop-list-main">
          <div className="shop-list-head">
            <h2 className="shop-h2" style={{ margin: 0 }}>{t("allProducts")}</h2>
            <span className="shop-count">{catalog.total}</span>
          </div>
          {products.length === 0 ? (
            <p className="shop-empty">{t("nothingFound")}</p>
          ) : (
            <>
              <div className="shop-grid">
                {products.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}
              </div>
              {hasMore && (
                <div className="shop-more">
                  <button className="shop-btn ghost" onClick={loadMore} disabled={busy}>
                    {busy ? "…" : `${t("showMore")} (${catalog.total - products.length})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ---- brands strip ---- */}
      {catalog.brands.length > 0 && (
        <div className="shop-wrap wide">
          <div className="shop-brands">
            <span className="shop-brands-label">{t("brands")}</span>
            <div className="shop-brands-row">
              {catalog.brands.map((b) => <span key={b.id} className="shop-brand">{b.name}</span>)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
