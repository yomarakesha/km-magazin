"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type AdminRole, type SaleRow } from "@/lib/admin-api";
import { useToast } from "../../_components/useToast";
import { useConfirm } from "../../_components/useConfirm";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
const fmt = (n: number) => n.toLocaleString("ru-RU");
const PAY_LABEL: Record<string, string> = { cash: "наличные", terminal: "терминал", debt: "долг" };

export default function PosSalesPage() {
  const { show, node } = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const [role, setRole] = useState<AdminRole>("sales");
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [debtOnly, setDebtOnly] = useState(false);

  const load = () =>
    api.getSales(debtOnly ? { debt: true } : { from, to })
      .then(setRows)
      .catch((e) => show(String(e), "err"));

  useEffect(() => { api.me().then((m) => setRole(m.role)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [from, to, debtOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  async function settle(s: SaleRow) {
    if (!(await ask(`Долг «${s.debtor_name}» на ${fmt(s.sold_total)} TMT погашен?`))) return;
    await api.settleSale(s.id).then(() => show("Долг погашен")).catch((e) => show(String(e), "err"));
    load();
  }

  async function voidSale(s: SaleRow) {
    if (!(await ask(`Отменить чек #${s.id}? Товар вернётся на склад.`))) return;
    await api.voidSale(s.id).then(() => show("Чек отменён, остаток возвращён")).catch((e) => show(String(e), "err"));
    load();
  }

  const debtsTotal = rows.filter((r) => r.status === "debt").reduce((s, r) => s + r.sold_total, 0);

  return (
    <>
      <h1 className="adm-h1">Продажи и долги</h1>
      <p className="adm-sub">Продажи с кассы. Долги висят до погашения — имя и телефон в строке.</p>

      <div style={{ display: "flex", gap: 10, alignItems: "end", marginBottom: 16, flexWrap: "wrap" }}>
        {!debtOnly && (
          <>
            <div className="adm-field" style={{ marginBottom: 0 }}><label>С</label>
              <input className="adm-in" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="adm-field" style={{ marginBottom: 0 }}><label>По</label>
              <input className="adm-in" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </>
        )}
        <button className={`adm-btn ${debtOnly ? "" : "ghost"}`} onClick={() => setDebtOnly(!debtOnly)}>
          {debtOnly ? `Долги: ${fmt(debtsTotal)} TMT` : "Только долги"}
        </button>
      </div>

      <div className="adm-table-wrap">
        <table className="leads-table">
          <thead>
            <tr><th>№</th><th>Дата</th><th>Продавец</th><th>Позиции</th><th>Итог</th><th>Оплата</th><th>Статус</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>#{s.id}</td>
                <td>{s.created_at ? new Date(s.created_at).toLocaleString("ru-RU") : "—"}</td>
                <td>{s.seller}</td>
                <td style={{ maxWidth: 260 }}>
                  {s.items.map((it) => `${it.title} ×${it.qty}`).join(", ")}
                </td>
                <td>
                  <b>{fmt(s.sold_total)}</b>
                  {s.discount > 0 && <span style={{ color: "#ffb86b", fontSize: 13 }}> (−{fmt(s.discount)})</span>}
                  {s.discount < 0 && <span style={{ color: "var(--green-br)", fontSize: 13 }}> (+{fmt(-s.discount)})</span>}
                </td>
                <td>{PAY_LABEL[s.payment_method] ?? s.payment_method}</td>
                <td>
                  {s.status === "debt" ? (
                    <span style={{ color: "#ff9a9a" }}>
                      долг · {s.debtor_name} {s.debtor_phone}
                    </span>
                  ) : (
                    <span style={{ color: "var(--green-br)" }}>
                      оплачено{s.settled_at ? " (долг погашен)" : ""}
                    </span>
                  )}
                </td>
                <td>
                  <div className="adm-actions" style={{ margin: 0 }}>
                    <Link className="adm-btn ghost sm" href={`/admin/pos/receipt/${s.id}`}>Чек</Link>
                    {s.status === "debt" && (
                      <button className="adm-btn sm" onClick={() => settle(s)}>Погасить</button>
                    )}
                    {role === "owner" && (
                      <button className="adm-btn danger sm" onClick={() => voidSale(s)}>Отмена</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--tx3)", padding: 20 }}>
                {debtOnly ? "Долгов нет" : "Продаж за период нет"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {node}
      {confirmNode}
    </>
  );
}
