"use client";
import { useShop } from "./shop-context";
import ProductImage from "./ProductImage";
import Icon from "./ui/Icon";

/** Sticky bottom bar showing the compare selection; opens the compare modal. */
export default function CompareBar() {
  const { compareItems, toggleCompare, clearCompare, openCompare, mediaBase, t, pick } = useShop();
  if (compareItems.length === 0) return null;

  return (
    <div className="shop-comparebar show">
      <div className="shop-wrap shop-comparebar-in">
        <div className="shop-cmp-thumbs">
          {compareItems.map((c) => (
            <div key={c.id} className="shop-cmp-thumb">
              <ProductImage src={c.image ? `${mediaBase}/${c.image}` : null} alt={pick(c.title)} seed={c.slug} variant="mini" />
              <button onClick={() => toggleCompare(c)} aria-label={t("remove")}><Icon name="close" size={11} /></button>
            </div>
          ))}
        </div>
        <div className="shop-cmp-actions">
          <button className="shop-link" onClick={clearCompare}>{t("clearAll")}</button>
          <button className="shop-btn" onClick={openCompare} disabled={compareItems.length < 2}>
            <Icon name="compare" size={16} /> {t("compare")} ({compareItems.length})
          </button>
        </div>
      </div>
    </div>
  );
}
