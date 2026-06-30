"use client";
import Link from "next/link";
import { useShop } from "@/components/shop/shop-context";
import Icon from "@/components/shop/ui/Icon";
import ProductImage from "@/components/shop/ProductImage";

export default function CartPage() {
  const { t, pick, mediaBase, items, setQty, remove, total } = useShop();

  if (items.length === 0) {
    return (
      <div className="shop-wrap">
        <h1 className="shop-h1">{t("cart")}</h1>
        <p className="shop-empty">{t("emptyCart")}</p>
        <Link href="/shop" className="shop-btn ghost">{t("continueShopping")}</Link>
      </div>
    );
  }

  return (
    <div className="shop-wrap">
      <h1 className="shop-h1">{t("cart")}</h1>
      <div className="shop-cart-list">
        {items.map((it) => (
          <div className="shop-cart-item" key={it.id}>
            <Link href={`/shop/product/${it.slug}`} className="shop-cart-img">
              <ProductImage src={it.image ? `${mediaBase}/${it.image}` : null} alt={pick(it.titles)} seed={it.slug} variant="thumb" />
            </Link>
            <div className="shop-cart-info">
              <Link href={`/shop/product/${it.slug}`} className="shop-cart-title">{pick(it.titles)}</Link>
              <div className="shop-price">{it.price.toLocaleString("ru-RU")} {it.currency}</div>
            </div>
            <div className="shop-qty">
              <button onClick={() => setQty(it.id, it.qty - 1)} aria-label={t("remove")}><Icon name="minus" size={15} /></button>
              <input type="number" value={it.qty} min={1}
                onChange={(e) => setQty(it.id, Number(e.target.value) || 1)} />
              <button onClick={() => setQty(it.id, it.qty + 1)} aria-label={t("addToCart")}><Icon name="plus" size={15} /></button>
            </div>
            <div className="shop-cart-sum">{(it.price * it.qty).toLocaleString("ru-RU")} {it.currency}</div>
            <button className="shop-cart-rm" onClick={() => remove(it.id)} title={t("remove")} aria-label={t("remove")}><Icon name="trash" size={16} /></button>
          </div>
        ))}
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
