"use client";
import Link from "next/link";
import { useState } from "react";
import { useShop, cartUid } from "@/components/shop/shop-context";
import { checkPromo, createOrder, type PromoCheckResult } from "@/lib/shop-api";
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
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoCheckResult | null>(null);
  const [promoErr, setPromoErr] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);

  const discount = promo ? Math.min(promo.discount, total) : 0;
  const payable = total - discount;

  async function applyPromo() {
    if (!promoInput.trim()) return;
    setPromoBusy(true);
    setPromoErr("");
    try {
      setPromo(await checkPromo(promoInput.trim(), total));
    } catch {
      setPromo(null);
      setPromoErr(t("promoInvalid"));
    } finally {
      setPromoBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim() || !phone.trim()) { setErr(`${t("name")} / ${t("phone")}`); return; }
    setBusy(true);
    try {
      const res = await createOrder({
        customer_name: name.trim(), phone: phone.trim(), address: address.trim(),
        payment_method: payment, comment: comment.trim(),
        promo_code: promo?.code ?? "",
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
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={`/shop/order/${done}?phone=${encodeURIComponent(phone.trim())}`} className="shop-btn ghost">{t("trackOrder")}</Link>
            <Link href="/shop" className="shop-btn">{t("continueShopping")}</Link>
          </div>
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
    ...(discount > 0 ? [`${t("discount")} (${promo?.code}): −${discount.toLocaleString("ru-RU")} TMT`] : []),
    `${t("total")}: ${payable.toLocaleString("ru-RU")} TMT`,
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
          <label>{t("promo")}
            {promo ? (
              <span className="shop-promo-ok">
                <b>{promo.code}</b> — {t("promoApplied")} (−{discount.toLocaleString("ru-RU")} TMT)
                <button type="button" className="shop-promo-x" onClick={() => { setPromo(null); setPromoInput(""); }}>{t("promoRemove")}</button>
              </span>
            ) : (
              <span style={{ display: "flex", gap: 8 }}>
                <input value={promoInput} onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoErr(""); }}
                  placeholder="SALE10" style={{ flex: 1 }} />
                <button type="button" className="shop-btn ghost" onClick={applyPromo} disabled={promoBusy || !promoInput.trim()}>
                  {promoBusy ? "…" : t("promoApply")}
                </button>
              </span>
            )}
            {promoErr && <span className="shop-err" style={{ marginTop: 6 }}>{promoErr}</span>}
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
          {discount > 0 && (
            <div className="shop-order-row" style={{ color: "var(--sh-acc-d)" }}>
              <span>{t("discount")} ({promo?.code})</span>
              <span>−{discount.toLocaleString("ru-RU")} TMT</span>
            </div>
          )}
          <div className="shop-order-row total"><span>{t("total")}</span><b>{payable.toLocaleString("ru-RU")} TMT</b></div>
        </aside>
      </div>
    </div>
  );
}
