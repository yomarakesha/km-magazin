"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useShop } from "@/components/shop/shop-context";
import { fetchOrderStatus, type OrderStatusView } from "@/lib/shop-api";
import { forgetOrder, loadMyOrders, type MyOrderRef } from "@/lib/my-orders";
import Icon from "@/components/shop/ui/Icon";

const ST_KEY: Record<string, string> = {
  new: "stNew", confirmed: "stConfirmed", delivered: "stDelivered", cancelled: "stCancelled",
};
const PAY_KEY: Record<string, string> = {
  paid: "paid", unpaid: "unpaid", pending: "pendingPay", refunded: "refunded",
};

export default function MyOrdersPage() {
  const { t, lang } = useShop();
  const [refs, setRefs] = useState<MyOrderRef[]>([]);
  const [statuses, setStatuses] = useState<Map<number, OrderStatusView>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const list = loadMyOrders();
    setRefs(list);
    if (list.length === 0) { setLoaded(true); return; }
    let live = true;
    Promise.allSettled(list.map((r) => fetchOrderStatus(r.id, r.phone)))
      .then((results) => {
        if (!live) return;
        const map = new Map<number, OrderStatusView>();
        results.forEach((res, i) => {
          if (res.status === "fulfilled") map.set(list[i].id, res.value);
        });
        setStatuses(map);
        setLoaded(true);
      });
    return () => { live = false; };
  }, []);

  function remove(id: number) {
    forgetOrder(id);
    setRefs((prev) => prev.filter((r) => r.id !== id));
  }

  const locale = lang === "ru" ? "ru-RU" : lang === "tk" ? "tk-TM" : "en-GB";

  return (
    <div className="shop-wrap shop-narrow" style={{ paddingTop: 28 }}>
      <h1 className="shop-h1">{t("myOrders")}</h1>
      {refs.length === 0 ? (
        <>
          <p className="shop-empty">{loaded ? t("myOrdersEmpty") : "…"}</p>
          <Link href="/shop" className="shop-btn ghost">{t("continueShopping")}</Link>
        </>
      ) : (
        <>
          <p style={{ color: "var(--tx2)", fontSize: 14 }}>{t("myOrdersHint")}</p>
          <div className="shop-cart-list">
            {refs.map((r) => {
              const o = statuses.get(r.id);
              return (
                <div className="shop-cart-item" key={r.id} style={{ alignItems: "center" }}>
                  <span className="shop-cart-img" style={{ display: "grid", placeItems: "center" }}>
                    <Icon name="box" size={22} />
                  </span>
                  <div className="shop-cart-info">
                    <Link
                      href={`/shop/order/${r.id}?phone=${encodeURIComponent(r.phone)}`}
                      className="shop-cart-title"
                    >
                      {t("orderNumber")} #{r.id}
                    </Link>
                    <div style={{ fontSize: 13, color: "var(--tx3)" }}>
                      {new Date(r.at).toLocaleString(locale)}
                      {o && <> · {o.items.length} · <b>{o.total.toLocaleString("ru-RU")} TMT</b></>}
                    </div>
                    {o && o.payment_status !== "unpaid" && (
                      <div style={{ marginTop: 4 }}>
                        <span className={`shop-pay-badge ${o.payment_status}`}>{t(PAY_KEY[o.payment_status] ?? "unpaid")}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {loaded ? (o ? t(ST_KEY[o.status] ?? "") || o.status : t("trackNotFound")) : "…"}
                  </div>
                  <button className="shop-cart-rm" onClick={() => remove(r.id)} title={t("remove")} aria-label={t("remove")}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              );
            })}
          </div>
          <p style={{ marginTop: 20 }}>
            <Link href="/shop" className="shop-btn ghost">{t("continueShopping")}</Link>
          </p>
        </>
      )}
    </div>
  );
}
