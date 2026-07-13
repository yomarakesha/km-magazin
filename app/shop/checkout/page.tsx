"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useShop, cartUid } from "@/components/shop/shop-context";
import { checkPromo, createOrder, validateCart, PromoError, type CartLineCheck, type PromoCheckResult } from "@/lib/shop-api";
import { rememberOrder } from "@/lib/my-orders";
import { effectiveDiscount } from "@/lib/cart";
import { formatPhone, canonicalPhone, isValidPhone } from "@/lib/phone";
import { loadCustomer, saveCustomer } from "@/lib/customer";
import Icon from "@/components/shop/ui/Icon";

export default function CheckoutPage() {
  const { t, pick, items, total, clear, settings, wa, remove, reprice } = useShop();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [fulfil, setFulfil] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState<"cash" | "terminal">("cash");
  const [comment, setComment] = useState("");

  // prefill from the last order placed on this device
  useEffect(() => {
    const c = loadCustomer();
    if (c) { setName(c.name); setPhone(formatPhone(c.phone)); setAddress(c.address); }
  }, []);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoCheckResult | null>(null);
  const [promoErr, setPromoErr] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  // server re-check of the cart: dead lines + price drift
  const [checks, setChecks] = useState<Map<string, CartLineCheck>>(new Map());

  useEffect(() => {
    if (items.length === 0) { setChecks(new Map()); return; }
    let live = true;
    validateCart(items.map((it) => ({ kind: it.kind, id: it.id, qty: it.qty })))
      .then((res) => {
        if (!live) return;
        setChecks(new Map(res.items.map((c) => [`${c.kind}:${c.id}`, c])));
      })
      .catch(() => {}); // backend down → order submit will surface errors anyway
    return () => { live = false; };
  }, [items]);

  const deadLines = items.filter((it) => checks.get(cartUid(it))?.ok === false);
  const driftLines = items.filter((it) => {
    const c = checks.get(cartUid(it));
    return c?.ok && c.price != null && c.price !== it.price;
  });

  // The promo was validated against the cart total at apply time. If the cart
  // changes afterwards, drop the promo so we never show a stale/invalid discount
  // (the server would reject or recompute it anyway).
  const appliedTotal = useRef<number | null>(null);
  useEffect(() => {
    if (promo && appliedTotal.current !== null && total !== appliedTotal.current) {
      setPromo(null);
      appliedTotal.current = null;
      setPromoErr(t("promoInvalid"));
    }
  }, [total, promo, t]);

  const discount = effectiveDiscount(promo?.discount, total);
  const payable = total - discount;
  const cur = items[0]?.currency ?? "TMT";

  async function applyPromo() {
    if (!promoInput.trim()) return;
    setPromoBusy(true);
    setPromoErr("");
    try {
      setPromo(await checkPromo(promoInput.trim(), total));
      appliedTotal.current = total;
    } catch (e) {
      setPromo(null);
      if (e instanceof PromoError && e.code === "below_min" && e.minTotal != null) {
        setPromoErr(`${t("promoMin")} ${e.minTotal.toLocaleString("ru-RU")} TMT`);
      } else {
        setPromoErr(t("promoInvalid"));
      }
    } finally {
      setPromoBusy(false);
    }
  }

  const storeAddress = pick(settings.address);
  // pickup → address is the store; delivery → the customer's typed address
  const finalAddress = fulfil === "pickup"
    ? `${t("pickup")}${storeAddress ? ` — ${storeAddress}` : ""}`
    : address.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim() || !phone.trim()) { setErr(`${t("name")} / ${t("phone")}`); return; }
    if (!isValidPhone(phone)) { setErr(t("phone")); return; }
    if (deadLines.length > 0) { setErr(t("itemUnavailable")); return; }
    // Price drifted since these lines were added: sync the cart to the server
    // prices and stop, so the customer confirms the corrected total before we
    // place an order that would be charged at the new price.
    if (driftLines.length > 0) {
      reprice(new Map(driftLines.map((it) => [cartUid(it), checks.get(cartUid(it))!.price!])));
      setErr(t("cartUpdated"));
      return;
    }
    const canonPhone = canonicalPhone(phone);
    setBusy(true);
    try {
      const res = await createOrder({
        customer_name: name.trim(), phone: canonPhone, address: finalAddress,
        payment_method: payment, comment: comment.trim(),
        promo_code: promo?.code ?? "",
        items: items.map((it) => ({ kind: it.kind, id: it.id, qty: it.qty })),
      });
      saveCustomer({ name: name.trim(), phone: canonPhone, address: address.trim() });
      clear();
      rememberOrder(res.id, canonPhone);
      setDone(res.id);
    } catch (e) {
      // structured 409 from the backend (cart_invalid) → human message
      setErr(String(e).includes("cart_invalid") ? t("itemUnavailable") : String(e));
    }
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
    ...(discount > 0 ? [`${t("discount")} (${promo?.code}): −${discount.toLocaleString("ru-RU")} ${cur}`] : []),
    `${t("total")}: ${payable.toLocaleString("ru-RU")} ${cur}`,
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
            <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))}
              type="tel" inputMode="tel" autoComplete="tel" placeholder="+993 65 123456" required />
          </label>
          <fieldset className="shop-pay">
            <legend>{t("delivery2")}</legend>
            <label className="shop-radio">
              <input type="radio" name="fulfil" checked={fulfil === "delivery"} onChange={() => setFulfil("delivery")} />
              {t("delivery2")}
            </label>
            <label className="shop-radio">
              <input type="radio" name="fulfil" checked={fulfil === "pickup"} onChange={() => setFulfil("pickup")} />
              {t("pickup")}
            </label>
          </fieldset>
          {fulfil === "delivery" ? (
            <label>{t("address")}
              <input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
            </label>
          ) : storeAddress ? (
            <p style={{ fontSize: 14, color: "var(--tx2)", margin: "-4px 0 4px" }}>
              <Icon name="box" size={15} /> {t("pickupAddr")}: {storeAddress}
            </p>
          ) : null}
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
          {driftLines.length > 0 && (
            <p className="shop-err" style={{ fontSize: 13 }}>{t("cartUpdated")}</p>
          )}
          {items.map((it) => {
            const c = checks.get(cartUid(it));
            const dead = c?.ok === false;
            const drift = c?.ok && c.price != null && c.price !== it.price;
            return (
            <div key={cartUid(it)} className="shop-order-row" style={dead ? { opacity: 0.55 } : undefined}>
              <span>
                {pick(it.titles)} × {it.qty}
                {dead && (
                  <span className="shop-err" style={{ display: "block", fontSize: 12 }}>
                    {t("itemUnavailable")}{" "}
                    <button type="button" className="shop-promo-x" onClick={() => remove(cartUid(it))}>{t("remove")}</button>
                  </span>
                )}
                {drift && (
                  <span style={{ display: "block", fontSize: 12, color: "var(--sh-acc-d)" }}>
                    {t("priceChanged")}: {c!.price!.toLocaleString("ru-RU")} {it.currency}
                  </span>
                )}
              </span>
              <span>{(it.price * it.qty).toLocaleString("ru-RU")} {it.currency}</span>
            </div>
            );
          })}
          {discount > 0 && (
            <div className="shop-order-row" style={{ color: "var(--sh-acc-d)" }}>
              <span>{t("discount")} ({promo?.code})</span>
              <span>−{discount.toLocaleString("ru-RU")} {cur}</span>
            </div>
          )}
          <div className="shop-order-row total"><span>{t("total")}</span><b>{payable.toLocaleString("ru-RU")} {cur}</b></div>
        </aside>
      </div>
    </div>
  );
}
