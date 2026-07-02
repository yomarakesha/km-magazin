"use client";
import Link from "next/link";
import Drawer from "./ui/Drawer";
import { useShop, cartUid } from "./shop-context";
import Icon from "./ui/Icon";
import ProductImage from "./ProductImage";

export default function CartDrawer() {
  const { t, pick, mediaBase, items, setQty, remove, total, count, cartOpen, closeCart, services, add } = useShop();
  if (!cartOpen) return null;

  // upsell: services matching the categories of products in the cart,
  // excluding services already added
  const catIds = new Set(items.filter((i) => i.kind === "product").map((i) => i.category_id).filter(Boolean));
  const inCart = new Set(items.filter((i) => i.kind === "service").map((i) => i.id));
  const upsell = services
    .filter((s) => s.category_id != null && catIds.has(s.category_id) && !inCart.has(s.id))
    .slice(0, 3);

  const foot = items.length > 0 ? (
    <>
      <div className="shop-order-row total"><span>{t("total")}</span><b>{total.toLocaleString("ru-RU")} TMT</b></div>
      <Link href="/shop/checkout" className="shop-btn block" onClick={closeCart}>{t("checkout")}</Link>
      <button className="shop-btn ghost block" onClick={closeCart}>{t("continueShopping")}</button>
    </>
  ) : undefined;

  return (
    <Drawer title={`${t("cart")}${count > 0 ? ` · ${count}` : ""}`} onClose={closeCart} foot={foot}>
      {items.length === 0 ? (
        <div className="shop-drawer-empty">
          <p>{t("emptyCart")}</p>
        </div>
      ) : (
        items.map((it) => {
          const uid = cartUid(it);
          const isSvc = it.kind === "service";
          const img = <ProductImage src={it.image ? `${mediaBase}/${it.image}` : null} alt={pick(it.titles)} seed={it.slug} variant="mini" />;
          return (
          <div className="shop-dline" key={uid}>
            {isSvc ? (
              <span className="shop-dline-img">{img}</span>
            ) : (
              <Link href={`/shop/product/${it.slug}`} className="shop-dline-img" onClick={closeCart}>{img}</Link>
            )}
            <div>
              {isSvc ? (
                <span className="shop-dline-title">{pick(it.titles)} <span className="shop-dline-tag">{t("service")}</span></span>
              ) : (
                <Link href={`/shop/product/${it.slug}`} className="shop-dline-title" onClick={closeCart}>
                  {pick(it.titles)}
                </Link>
              )}
              <div className="shop-qty">
                <button onClick={() => setQty(uid, it.qty - 1)} aria-label={t("remove")}><Icon name="minus" size={15} /></button>
                <input type="number" value={it.qty} min={1}
                  onChange={(e) => setQty(uid, Number(e.target.value) || 1)} />
                <button onClick={() => setQty(uid, it.qty + 1)} aria-label={t("addToCart")}><Icon name="plus" size={15} /></button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <span className="shop-cart-sum">{(it.price * it.qty).toLocaleString("ru-RU")} {it.currency}</span>
              <button className="shop-dline-rm" onClick={() => remove(uid)} title={t("remove")} aria-label={t("remove")}><Icon name="trash" size={15} /></button>
            </div>
          </div>
          );
        })
      )}

      {items.length > 0 && upsell.length > 0 && (
        <div className="shop-upsell">
          <div className="shop-upsell-h">{t("upsell")}</div>
          {upsell.map((s) => (
            <div className="shop-upsell-row" key={s.id}>
              <span className="shop-upsell-title">{pick(s.title)}</span>
              <span className="shop-upsell-price">{s.price.toLocaleString("ru-RU")} {s.currency}</span>
              <button
                className="shop-btn sm"
                onClick={() => add({ id: s.id, kind: "service", slug: s.slug, titles: s.title, price: s.price, currency: s.currency, image: null, category_id: s.category_id })}
              >
                +
              </button>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
