"use client";
import Link from "next/link";
import { useState } from "react";
import { useShop, cartUid } from "@/components/shop/shop-context";
import { createOrder } from "@/lib/shop-api";
import Icon from "@/components/shop/ui/Icon";

export default function CheckoutPage() {
  const { t, pick, items, total, clear, settings, wa } = useShop();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<"cash" | "terminal">("cash");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim() || !phone.trim()) { setErr(`${t("name")} / ${t("phone")}`); return; }
    setBusy(true);
    try {
      const res = await createOrder({
        customer_name: name.trim(), phone: phone.trim(), address: address.trim(),
        payment_method: payment, comment: comment.trim(),
        items: items.map((it) => ({ kind: it.kind, id: it.id, qty: it.qty })),
      });
      clear();
      setDone(res.id);
    } catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  }

  if (done != null) {
    return (
      <div className="shop-wrap shop-narrow">
        <div className="shop-ok">
          <div className="shop-ok-icon"><Icon name="check" size={32} strokeWidth={2.2} /></div>
          <h1 className="shop-h1">{t("orderOk")}</h1>
          <p>{t("orderOkText")}</p>
          <p className="shop-order-no">{t("orderNumber")}: <b>#{done}</b></p>
          <Link href="/shop" className="shop-btn">{t("continueShopping")}</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="shop-wrap" style={{ paddingTop: 28 }}>
        <h1 className="shop-h1">{t("checkout")}</h1>
        <p className="shop-empty">{t("emptyCart")}</p>
        <Link href="/shop" className="shop-btn ghost">{t("continueShopping")}</Link>
      </div>
    );
  }

  const waText = [
    `${t("checkout")}:`,
    ...items.map((it) => `• ${pick(it.titles)} × ${it.qty} — ${(it.price * it.qty).toLocaleString("ru-RU")} ${it.currency}`),
    `${t("total")}: ${total.toLocaleString("ru-RU")} TMT`,
  ].join("\n");

  return (
    <div className="shop-wrap" style={{ paddingTop: 28 }}>
      <h1 className="shop-h1">{t("checkout")}</h1>

      <div className="shop-checkout-grid">
        <form className="shop-form" onSubmit={submit}>
          <label>{t("name")}
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </label>
          <label>{t("phone")}
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" required />
          </label>
          <label>{t("address")}
            <input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
          </label>
          <fieldset className="shop-pay">
            <legend>{t("payment")}</legend>
            <label className="shop-radio">
              <input type="radio" name="pay" checked={payment === "cash"} onChange={() => setPayment("cash")} />
              {t("cash")}
            </label>
            <label className="shop-radio">
              <input type="radio" name="pay" checked={payment === "terminal"} onChange={() => setPayment("terminal")} />
              {t("terminal")}
            </label>
          </fieldset>
          <label>{t("comment")}
            <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          </label>
          {err && <p className="shop-err">{err}</p>}
          <button className="shop-btn block" type="submit" disabled={busy}>{busy ? t("sending") : t("placeOrder")}</button>
          {settings.whatsapp && <a className="shop-btn wa block" href={wa(waText)} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} /> {t("orderWhatsapp")}</a>}
        </form>

        <aside className="shop-order-summary">
          <h3>{t("cart")}</h3>
          {items.map((it) => (
            <div key={cartUid(it)} className="shop-order-row">
              <span>{pick(it.titles)} × {it.qty}</span>
              <span>{(it.price * it.qty).toLocaleString("ru-RU")} TMT</span>
            </div>
          ))}
          <div className="shop-order-row total"><span>{t("total")}</span><b>{total.toLocaleString("ru-RU")} TMT</b></div>
        </aside>
      </div>
    </div>
  );
}
