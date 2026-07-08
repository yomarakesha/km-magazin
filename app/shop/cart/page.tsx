"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useShop, cartUid } from "@/components/shop/shop-context";
import { validateCart, type CartLineCheck } from "@/lib/shop-api";
import Icon from "@/components/shop/ui/Icon";
import ProductImage from "@/components/shop/ProductImage";
import PopularProducts from "@/components/shop/PopularProducts";

export default function CartPage() {
  const { t, pick, mediaBase, items, setQty, remove, total } = useShop();
  // server re-check: flag removed/disabled items and price drift
  const [checks, setChecks] = useState<Map<string, CartLineCheck>>(new Map());

  useEffect(() => {
    if (items.length === 0) { setChecks(new Map()); return; }
    let live = true;
    validateCart(items.map((it) => ({ kind: it.kind, id: it.id, qty: it.qty })))
      .then((res) => { if (live) setChecks(new Map(res.items.map((c) => [`${c.kind}:${c.id}`, c]))); })
      .catch(() => {});
    return () => { live = false; };
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="shop-wrap">
        <h1 className="shop-h1">{t("cart")}</h1>
        <p className="shop-empty">{t("emptyCart")}</p>
        <p style={{ color: "var(--tx2)", fontSize: 14, marginTop: -8, marginBottom: 16 }}>{t("emptyCartCta")}</p>
        <Link href="/shop" className="shop-btn ghost">{t("continueShopping")}</Link>
        <PopularProducts />
      </div>
    );
  }

  return (
    <div className="shop-wrap">
      <h1 className="shop-h1">{t("cart")}</h1>
      <div className="shop-cart-list">
        {items.map((it) => {
          const uid = cartUid(it);
          const isSvc = it.kind === "service";
          const c = checks.get(uid);
          const dead = c?.ok === false;
          const drift = c?.ok && c.price != null && c.price !== it.price;
          const img = <ProductImage src={it.image ? `${mediaBase}/${it.image}` : null} alt={pick(it.titles)} seed={it.slug} variant="thumb" />;
          return (
          <div className="shop-cart-item" key={uid} style={dead ? { opacity: 0.55 } : undefined}>
            {isSvc ? <span className="shop-cart-img">{img}</span> : (
              <Link href={`/shop/product/${it.slug}`} className="shop-cart-img">{img}</Link>
            )}
            <div className="shop-cart-info">
              {isSvc ? (
                <span className="shop-cart-title">{pick(it.titles)} <span className="shop-dline-tag">{t("service")}</span></span>
              ) : (
                <Link href={`/shop/product/${it.slug}`} className="shop-cart-title">{pick(it.titles)}</Link>
              )}
              <div className="shop-price">{it.price.toLocaleString("ru-RU")} {it.currency}</div>
              {dead && <div className="shop-err" style={{ fontSize: 12 }}>{t("itemUnavailable")}</div>}
              {drift && <div style={{ fontSize: 12, color: "var(--sh-acc-d)" }}>{t("priceChanged")}: {c!.price!.toLocaleString("ru-RU")} {it.currency}</div>}
            </div>
            <div className="shop-qty">
              <button onClick={() => setQty(uid, it.qty - 1)} aria-label={t("remove")}><Icon name="minus" size={15} /></button>
              <input type="number" value={it.qty} min={1}
                onChange={(e) => setQty(uid, Number(e.target.value) || 1)} />
              <button onClick={() => setQty(uid, it.qty + 1)} aria-label={t("addToCart")}><Icon name="plus" size={15} /></button>
            </div>
            <div className="shop-cart-sum">{(it.price * it.qty).toLocaleString("ru-RU")} {it.currency}</div>
            <button className="shop-cart-rm" onClick={() => remove(uid)} title={t("remove")} aria-label={t("remove")}><Icon name="trash" size={16} /></button>
          </div>
          );
        })}
      </div>

      <div className="shop-cart-foot">
        <div className="shop-total">{t("total")}: <b>{total.toLocaleString("ru-RU")} TMT</b></div>
        <div className="shop-cart-actions">
          <Link href="/shop" className="shop-btn ghost">{t("continueShopping")}</Link>
          <Link href="/shop/checkout" className="shop-btn">{t("checkout")}</Link>
        </div>
      </div>
    </div>
  );
}
