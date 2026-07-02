"use client";
import { useState } from "react";
import type { ShopService } from "@/lib/shop-types";
import { useShop } from "./shop-context";
import Icon from "./ui/Icon";

const KNOWN = new Set(["wrench", "settings", "refresh", "shield", "truck", "box"]);
const svcIcon = (icon: string) => (KNOWN.has(icon) ? icon : "wrench") as "wrench";

/** A priced category service rendered as an add-to-cart tile. */
export default function ServiceCard({ s }: { s: ShopService }) {
  const { pick, t, add } = useShop();
  const [added, setAdded] = useState(false);

  function addToCart() {
    add({ id: s.id, kind: "service", slug: s.slug, titles: s.title, price: s.price, currency: s.currency, image: null, category_id: s.category_id });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <div className="shop-svc">
      <div className="shop-svc-ic"><Icon name={svcIcon(s.icon)} size={20} /></div>
      <div className="shop-svc-body">
        <div className="shop-svc-title">{pick(s.title)}</div>
        {pick(s.short) && <p className="shop-svc-short">{pick(s.short)}</p>}
      </div>
      <div className="shop-svc-foot">
        <span className="shop-svc-price">{s.price.toLocaleString("ru-RU")} {s.currency}</span>
        <button className={`shop-btn sm ${added ? "added" : ""}`} onClick={addToCart}>
          {added ? <Icon name="check" size={16} /> : t("addToCart")}
        </button>
      </div>
    </div>
  );
}
