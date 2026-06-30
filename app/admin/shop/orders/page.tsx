"use client";
import { Fragment, useEffect, useState } from "react";
import { api, type AdminOrder } from "@/lib/admin-api";
import { useToast } from "../../_components/useToast";

const NEXT: Record<string, string> = { new: "confirmed", confirmed: "delivered", delivered: "cancelled", cancelled: "new" };
const ST_LABEL: Record<string, string> = { new: "Новый", confirmed: "Подтверждён", delivered: "Доставлен", cancelled: "Отменён" };
const PAY_LABEL: Record<string, string> = { cash: "Наличные", terminal: "Терминал" };

export default function OrdersPage() {
  const { show, node } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  const load = () => api.getOrders().then(setOrders).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function cycle(o: AdminOrder) {
    await api.setOrderStatus(o.id, NEXT[o.status] ?? "new").catch((e) => show(String(e), "err"));
    load();
  }
  async function del(o: AdminOrder) {
    if (!confirm("Удалить заказ?")) return;
    await api.deleteOrder(o.id).catch((e) => show(String(e), "err"));
    load();
  }

  return (
    <>
      <h1 className="adm-h1">Заказы</h1>
      <p className="adm-sub">Заказы из магазина техники. Оплата при доставке.</p>

      {orders.length === 0 ? (
        <p style={{ color: "var(--tx3)" }}>Заказов пока нет.</p>
      ) : (
        <div className="adm-table-wrap">
        <table className="leads-table">
          <thead>
            <tr><th>Дата</th><th>Клиент</th><th>Контакт</th><th>Сумма</th><th>Оплата</th><th>Статус</th><th></th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <Fragment key={o.id}>
                <tr className={o.status === "new" ? "new" : ""}>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--tx3)" }}>
                    {new Date(o.created_at).toLocaleString("ru-RU")}
                  </td>
                  <td><b>{o.customer_name}</b><br />
                    <button className="adm-btn ghost sm" onClick={() => setOpen(open === o.id ? null : o.id)}>
                      {o.items.length} поз. {open === o.id ? "▲" : "▼"}
                    </button>
                  </td>
                  <td style={{ fontSize: 13 }}>{o.phone}<br />{o.address}</td>
                  <td><b>{o.total} TMT</b></td>
                  <td style={{ fontSize: 13 }}>{PAY_LABEL[o.payment_method] ?? o.payment_method}</td>
                  <td>
                    <button className={`badge-st ${o.status === "new" ? "new" : o.status === "cancelled" ? "done" : "read"}`}
                      style={{ cursor: "pointer", background: "none" }} onClick={() => cycle(o)}>
                      {ST_LABEL[o.status] ?? o.status}
                    </button>
                  </td>
                  <td><button className="adm-btn danger sm" onClick={() => del(o)}>✕</button></td>
                </tr>
                {open === o.id && (
                  <tr>
                    <td colSpan={7} style={{ background: "var(--surf2)" }}>
                      <ul style={{ margin: 0, padding: "8px 16px", fontSize: 13 }}>
                        {o.items.map((it, k) => (
                          <li key={k}>{it.title} — {it.qty} × {it.price} TMT = {it.qty * it.price} TMT</li>
                        ))}
                      </ul>
                      {o.comment && <p style={{ padding: "0 16px 8px", fontSize: 13, color: "var(--tx2)" }}>Комментарий: {o.comment}</p>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        </div>
      )}
      {node}
    </>
  );
}
