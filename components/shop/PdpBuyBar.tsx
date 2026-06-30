"use client";
import Icon from "./ui/Icon";

/** Slim sticky buy bar that slides in once the main buy area scrolls out of view. */
export default function PdpBuyBar({
  show, title, price, currency, added, inStock, onAdd, t,
}: {
  show: boolean;
  title: string;
  price: number;
  currency: string;
  added: boolean;
  inStock: boolean;
  onAdd: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className={`shop-buybar ${show ? "show" : ""}`} aria-hidden={!show}>
      <div className="shop-wrap shop-buybar-in">
        <div className="shop-buybar-l">
          <span className="shop-buybar-title">{title}</span>
          <span className={`shop-stock ${inStock ? "in" : "out"}`} style={{ position: "static" }}>
            {inStock ? t("inStock") : t("toOrder")}
          </span>
        </div>
        <div className="shop-buybar-r">
          <span className="shop-buybar-price">{price.toLocaleString("ru-RU")} {currency}</span>
          <button className={`shop-btn ${added ? "added" : ""}`} onClick={onAdd}>
            {added ? <><Icon name="check" size={16} /> {t("inCart")}</> : t("addToCart")}
          </button>
        </div>
      </div>
    </div>
  );
}
