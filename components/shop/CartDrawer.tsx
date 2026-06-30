"use client";
import Link from "next/link";
import Drawer from "./ui/Drawer";
import { useShop } from "./shop-context";
import Icon from "./ui/Icon";
import ProductImage from "./ProductImage";

export default function CartDrawer() {
  const { t, pick, mediaBase, items, setQty, remove, total, count, cartOpen, closeCart } = useShop();
  if (!cartOpen) return null;

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
        items.map((it) => (
          <div className="shop-dline" key={it.id}>
            <Link href={`/shop/product/${it.slug}`} className="shop-dline-img" onClick={closeCart}>
              <ProductImage src={it.image ? `${mediaBase}/${it.image}` : null} alt={pick(it.titles)} seed={it.slug} variant="mini" />
            </Link>
            <div>
              <Link href={`/shop/product/${it.slug}`} className="shop-dline-title" onClick={closeCart}>
                {pick(it.titles)}
              </Link>
              <div className="shop-qty">
                <button onClick={() => setQty(it.id, it.qty - 1)} aria-label={t("remove")}><Icon name="minus" size={15} /></button>
                <input type="number" value={it.qty} min={1}
                  onChange={(e) => setQty(it.id, Number(e.target.value) || 1)} />
                <button onClick={() => setQty(it.id, it.qty + 1)} aria-label={t("addToCart")}><Icon name="plus" size={15} /></button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <span className="shop-cart-sum">{(it.price * it.qty).toLocaleString("ru-RU")} {it.currency}</span>
              <button className="shop-dline-rm" onClick={() => remove(it.id)} title={t("remove")} aria-label={t("remove")}><Icon name="trash" size={15} /></button>
            </div>
          </div>
        ))
      )}
    </Drawer>
  );
}
