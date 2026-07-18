"use client";
import { useState } from "react";
import type { Catalog, ShopCard } from "@/lib/shop-types";
import { fetchCatalogPage } from "@/lib/shop-api";
import { useShop } from "./shop-context";
import ProductCard from "./ProductCard";
import ShopSidebar from "./ShopSidebar";
import Icon from "./ui/Icon";

export default function CatalogView({ catalog }: { catalog: Catalog }) {
  const { t, settings } = useShop();
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
      {/* ---- hero: copy + catalog CTA ---- */}
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
            </div>
          </div>
        </div>
      </section>

      {/* ---- contact band bridging the hero seam ---- */}
      {settings.phone && (
        <div className="shop-wrap wide">
          <div className="shop-promo">
            <span className="shop-promo-lead"><Icon name="phone" size={17} /> {t("needHelp")}</span>
            <a href={`tel:${settings.phone.replace(/\s/g, "")}`}><Icon name="phone" size={15} /> {t("callUs")} · {settings.phone}</a>
          </div>
        </div>
      )}

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
