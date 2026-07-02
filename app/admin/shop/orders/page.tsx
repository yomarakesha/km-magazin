"use client";
import { Fragment, useEffect, useState } from "react";
import { api, type AdminOrder } from "@/lib/admin-api";
import { useToast } from "../../_components/useToast";

const ST_LABEL: Record<string, string> = { new: "Новый", confirmed: "Подтверждён", delivered: "Доставлен", cancelled: "Отменён" };
const PAY_LABEL: Record<string, string> = { cash: "Наличные", terminal: "Терминал" };
const FILTERS = [
  { value: "", label: "Все" },
  { value: "new", label: "Новые" },
  { value: "confirmed", label: "Подтверждённые" },
  { value: "delivered", label: "Доставленные" },
  { value: "cancelled", label: "Отменённые" },
];

function toCsv(orders: AdminOrder[]): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["ID", "Дата", "Клиент", "Телефон", "Адрес", "Оплата", "Статус", "Сумма", "Состав"];
  const rows = orders.map((o) => [
    o.id,
    new Date(o.created_at).toLocaleString("ru-RU"),
    o.customer_name,
    o.phone,
    o.address,
    PAY_LABEL[o.payment_method] ?? o.payment_method,
    ST_LABEL[o.status] ?? o.status,
    o.total,
    o.items.map((it) => `${it.kind === "service" ? "[услуга] " : ""}${it.title} x${it.qty}`).join("; "),
  ]);
  return [head, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
}

export default function OrdersPage() {
  const { show, node } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");

  const load = () =>
    api.getOrders({ status: filter || undefined, q: q.trim() || undefined })
      .then(setOrders).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(o: AdminOrder, status: string) {
    await api.setOrderStatus(o.id, status).catch((e) => show(String(e), "err"));
    load();
  }
  async function del(o: AdminOrder) {
    if (!confirm("Удалить заказ?")) return;
    await api.deleteOrder(o.id).catch((e) => show(String(e), "err"));
    load();
  }

  function exportCsv() {
    // BOM so Excel opens Cyrillic UTF-8 correctly
    const blob = new Blob(["﻿" + toCsv(orders)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <h1 className="adm-h1">Заказы</h1>
      <p className="adm-sub">Заказы из магазина техники. Оплата при доставке.</p>

      <div className="adm-tabs">
        {FILTERS.map((f) => (
          <button key={f.value} className={filter === f.value ? "on" : ""} onClick={() => setFilter(f.value)}>{f.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, margin: "10px 0 16px", flexWrap: "wrap" }}>
        <input className="adm-in" style={{ maxWidth: 280 }} value={q} placeholder="Поиск: телефон или имя"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") load(); }} />
        <button className="adm-btn ghost sm" onClick={load}>Найти</button>
        <button className="adm-btn ghost sm" onClick={exportCsv} disabled={orders.length === 0}>Экспорт CSV ({orders.length})</button>
      </div>

      {orders.length === 0 ? (
        <p style={{ color: "var(--tx3)" }}>Заказов не найдено.</p>
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
                    <select className="adm-in" style={{ width: "auto", fontSize: 12 }} value={o.status}
                      onChange={(e) => setStatus(o, e.target.value)}>
                      {Object.entries(ST_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td><button className="adm-btn danger sm" onClick={() => del(o)}>✕</button></td>
                </tr>
                {open === o.id && (
                  <tr>
                    <td colSpan={7} style={{ background: "var(--surf2)" }}>
                      <ul style={{ margin: 0, padding: "8px 16px", fontSize: 13 }}>
                        {o.items.map((it, k) => (
                          <li key={k}>
                            {it.kind === "service" && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--green-d)", border: "1px solid var(--green-d)", borderRadius: 4, padding: "1px 5px", marginRight: 6 }}>УСЛУГА</span>}
                            {it.title} — {it.qty} × {it.price} TMT = {it.qty * it.price} TMT
                          </li>
                        ))}
                      </ul>
                      {(o.discount ?? 0) > 0 && (
                        <p style={{ padding: "0 16px 8px", fontSize: 13, color: "var(--tx2)" }}>
                          Промокод <b>{o.promo_code}</b>: −{o.discount} TMT
                        </p>
                      )}
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
