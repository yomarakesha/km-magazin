"use client";
import type { Catalog } from "@/lib/shop-types";
import { useShop } from "./shop-context";
import ProductCard from "./ProductCard";
import ShopSidebar from "./ShopSidebar";
import Icon from "./ui/Icon";

export default function CatalogView({ catalog }: { catalog: Catalog }) {
  const { t } = useShop();
  return (
    <>
      <section className="shop-hero">
        <div className="shop-wrap">
          <span className="shop-hero-tag"><span className="dot" /> KM · {t("shop")}</span>
          <h1>{t("catalog")}</h1>
          <p>{t("deliveryNote")}</p>
        </div>
      </section>

      <div className="shop-wrap">
        <div className="shop-trust-strip">
          <span><Icon name="truck" size={17} /> {t("fastDelivery")}</span>
          <span><Icon name="shield" size={17} /> {t("warranty")}</span>
          <span><Icon name="whatsapp" size={16} /> {t("orderWhatsapp")}</span>
          <span><Icon name="phone" size={15} /> {t("needHelp")}</span>
        </div>
      </div>

      <div className="shop-wrap shop-list-layout">
        <ShopSidebar />
        <div className="shop-list-main">
          <h2 className="shop-h2" style={{ marginTop: 0 }}>{t("allProducts")}</h2>
          {catalog.products.length === 0 ? (
            <p className="shop-empty">{t("nothingFound")}</p>
          ) : (
            <div className="shop-grid">
              {catalog.products.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
