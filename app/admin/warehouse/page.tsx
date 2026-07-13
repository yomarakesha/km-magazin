"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type StockRow } from "@/lib/admin-api";
import { useToast } from "../_components/useToast";

type Op = { row: StockRow; kind: "receipt" | "writeoff" | "adjust" } | null;

export default function WarehousePage() {
  const { show, node } = useToast();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [q, setQ] = useState("");
  const [low, setLow] = useState(false);
  const [op, setOp] = useState<Op>(null);
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.getStock(q, low).then(setRows).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, [q, low]); // eslint-disable-line react-hooks/exhaustive-deps

  function openOp(row: StockRow, kind: NonNullable<Op>["kind"]) {
    setOp({ row, kind });
    setQty(kind === "adjust" ? String(row.stock_qty ?? 0) : "");
    setCost(row.cost_price != null ? String(row.cost_price) : "");
    setNote("");
  }

  async function submitOp() {
    if (!op) return;
    const n = parseInt(qty, 10);
    if (isNaN(n) || n < 0) return show("Укажите количество", "err");
    setBusy(true);
    try {
      await api.createMovement({
        product_id: op.row.id,
        kind: op.kind,
        ...(op.kind === "adjust" ? { new_qty: n } : { qty: n }),
        note: note.trim(),
        ...(op.kind === "receipt" && cost.trim() !== "" ? { unit_cost: parseInt(cost, 10) || 0 } : {}),
      });
      show("Готово");
      setOp(null);
      load();
    } catch (e) { show(String(e), "err"); }
    finally { setBusy(false); }
  }

  const OP_TITLE = { receipt: "Приход", writeoff: "Списание", adjust: "Инвентаризация" } as const;

  return (
    <>
      <h1 className="adm-h1">Склад — остатки</h1>
      <p className="adm-sub">Остаток «—» = учёт не ведётся (товар «под заказ»). Приход включает учёт автоматически.</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input className="adm-in" style={{ flex: "1 1 240px" }} value={q}
          onChange={(e) => setQ(e.target.value)} placeholder="Поиск: название или SKU" />
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} />
          Только низкие остатки
        </label>
      </div>

      <div className="adm-table-wrap">
        <table className="leads-table">
          <thead>
            <tr><th>Товар</th><th>SKU</th><th>Остаток</th><th>Закупка</th><th>Цена</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ opacity: r.enabled ? 1 : 0.5 }}>
                <td>
                  {r.title}
                  {r.low && <span className="adm-tr-badge">мало</span>}
                </td>
                <td style={{ color: "var(--tx3)" }}>{r.sku || "—"}</td>
                <td><b>{r.stock_qty ?? "—"}</b></td>
                <td>{r.cost_price != null ? `${r.cost_price.toLocaleString("ru-RU")}` : "—"}</td>
                <td>{r.price.toLocaleString("ru-RU")}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="adm-btn ghost sm" onClick={() => openOp(r, "receipt")}>+ Приход</button>{" "}
                  <button className="adm-btn ghost sm" onClick={() => openOp(r, "writeoff")} disabled={r.stock_qty == null || r.stock_qty === 0}>− Списать</button>{" "}
                  <button className="adm-btn ghost sm" onClick={() => openOp(r, "adjust")}>Инвент.</button>{" "}
                  <Link className="adm-btn ghost sm" href={`/admin/warehouse/movements?product_id=${r.id}`}>История</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--tx3)", padding: 24 }}>Ничего не найдено</td></tr>}
          </tbody>
        </table>
      </div>

      {op && (
        <div className="adm-confirm-back" onClick={() => setOp(null)}>
          <div className="adm-confirm" onClick={(e) => e.stopPropagation()}>
            <h3>{OP_TITLE[op.kind]}: {op.row.title}</h3>
            <div className="adm-field"><label>{op.kind === "adjust" ? "Фактический остаток" : "Количество"}</label>
              <input className="adm-in" type="number" min={0} value={qty} autoFocus
                onChange={(e) => setQty(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitOp(); }} /></div>
            {op.kind === "receipt" && (
              <div className="adm-field"><label>Закупочная цена, TMT (за шт.)</label>
                <input className="adm-in" type="number" min={0} value={cost}
                  onChange={(e) => setCost(e.target.value)} placeholder="необязательно" /></div>
            )}
            <div className="adm-field"><label>Комментарий</label>
              <input className="adm-in" value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={op.kind === "writeoff" ? "напр. брак, витрина" : ""} /></div>
            <div className="adm-actions" style={{ margin: 0 }}>
              <button className="adm-btn" onClick={submitOp} disabled={busy}>{busy ? "…" : "Провести"}</button>
              <button className="adm-btn ghost" onClick={() => setOp(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
      {node}
    </>
  );
}
