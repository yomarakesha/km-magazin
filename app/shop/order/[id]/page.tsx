"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useShop } from "@/components/shop/shop-context";
import { fetchOrderStatus, fetchProduct, type OrderStatusView } from "@/lib/shop-api";
import Icon from "@/components/shop/ui/Icon";

const ST_KEY: Record<string, string> = {
  new: "stNew", confirmed: "stConfirmed", delivered: "stDelivered", cancelled: "stCancelled",
};
const PAY_KEY: Record<string, string> = {
  paid: "paid", unpaid: "unpaid", pending: "pendingPay", refunded: "refunded",
};
const STEPS = ["new", "confirmed", "delivered"] as const;

export default function OrderStatusPage() {
  return (
    <Suspense fallback={<div className="shop-wrap"><p className="shop-empty">…</p></div>}>
      <OrderStatusInner />
    </Suspense>
  );
}

function OrderStatusInner() {
  const { id } = useParams<{ id: string }>();
  const phoneParam = useSearchParams().get("phone") ?? "";
  const { t, lang, add, services } = useShop();
  const [phone, setPhone] = useState(phoneParam);
  const [order, setOrder] = useState<OrderStatusView | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [reordering, setReordering] = useState(false);

  // rebuild the cart from a past order: products fetched fresh by slug, services
  // matched from the loaded catalog. Anything gone/deleted is skipped.
  async function reorder() {
    if (!order) return;
    setReordering(true);
    let missed = false;
    for (const it of order.items) {
      if (!it.slug) { missed = true; continue; }
      if (it.kind === "service") {
        const s = services.find((sv) => sv.slug === it.slug);
        if (s) add({ id: s.id, slug: s.slug, titles: s.title, price: s.price, currency: s.currency, image: null, category_id: s.category_id, kind: "service" }, it.qty);
        else missed = true;
      } else {
        try {
          const p = await fetchProduct(it.slug);
          add({ id: p.id, slug: p.slug, titles: p.title, price: p.price, currency: p.currency, image: p.images[0] ?? null, category_id: p.category_id }, it.qty);
        } catch { missed = true; }
      }
    }
    setReordering(false);
    setErr(missed ? t("reorderPartial") : "");
  }

  async function lookup(p: string) {
    if (!p.trim()) return;
    setBusy(true);
    setErr("");
    try {
      setOrder(await fetchOrderStatus(Number(id), p.trim()));
    } catch {
      setOrder(null);
      setErr(t("trackNotFound"));
    } finally {
      setBusy(false);
    }
  }

  // auto-lookup when arriving from the checkout success screen (?phone=)
  useEffect(() => {
    if (phoneParam) lookup(phoneParam);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stepIdx = order ? STEPS.indexOf(order.status as (typeof STEPS)[number]) : -1;

  return (
    <div className="shop-wrap shop-narrow" style={{ paddingTop: 28 }}>
      <h1 className="shop-h1">{t("trackTitle")} #{id}</h1>

      {!order && (
        <form
          className="shop-form"
          onSubmit={(e) => { e.preventDefault(); lookup(phone); }}
          style={{ maxWidth: 420 }}
        >
          <p style={{ color: "var(--tx2)", fontSize: 14 }}>{t("trackHint")}</p>
          <label>{t("phone")}
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" required />
          </label>
          {err && <p className="shop-err">{err}</p>}
          <button className="shop-btn block" type="submit" disabled={busy}>{busy ? "…" : t("trackFind")}</button>
        </form>
      )}

      {order && (
        <div className="shop-order-status">
          {order.status === "cancelled" ? (
            <p className="shop-track-cancelled">{t("stCancelled")}</p>
          ) : (
            <ol className="shop-track">
              {STEPS.map((s, i) => (
                <li key={s} className={i <= stepIdx ? "done" : ""}>
                  <span className="dot">{i < stepIdx ? <Icon name="check" size={12} strokeWidth={2.4} /> : i + 1}</span>
                  {t(ST_KEY[s])}
                </li>
              ))}
            </ol>
          )}

          <p style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--tx3)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span>{t("orderDate")}: {new Date(order.created_at).toLocaleString(lang === "ru" ? "ru-RU" : lang === "tk" ? "tk-TM" : "en-GB")}</span>
            <span className={`shop-pay-badge ${order.payment_status}`}>{t(PAY_KEY[order.payment_status] ?? "unpaid")}</span>
          </p>

          <aside className="shop-order-summary" style={{ marginTop: 12 }}>
            {order.items.map((it, k) => (
              <div key={k} className="shop-order-row">
                <span>{it.kind === "service" && <span className="shop-dline-tag">{t("service")}</span>} {it.title} × {it.qty}</span>
                <span>{(it.price * it.qty).toLocaleString("ru-RU")} TMT</span>
              </div>
            ))}
            <div className="shop-order-row total"><span>{t("total")}</span><b>{order.total.toLocaleString("ru-RU")} TMT</b></div>
          </aside>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button className="shop-btn" onClick={reorder} disabled={reordering}>
              <Icon name="cart" size={16} /> {reordering ? "…" : t("reorder")}
            </button>
            <Link href="/shop/cart" className="shop-btn ghost">{t("cart")}</Link>
          </div>
          {err && <p style={{ fontSize: 13, color: "var(--tx3)", marginTop: 8 }}>{err}</p>}
        </div>
      )}

      <p style={{ marginTop: 24 }}>
        <Link href="/shop" className="shop-btn ghost">{t("continueShopping")}</Link>
      </p>
    </div>
  );
}
