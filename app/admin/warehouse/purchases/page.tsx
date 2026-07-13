"use client";
import { useEffect, useState } from "react";
import { api, type PurchaseRow, type SupplierRow, type StockRow } from "@/lib/admin-api";
import { useToast } from "../../_components/useToast";

type DraftItem = { product_id: number | ""; qty: string; unit_cost: string };
const EMPTY: DraftItem = { product_id: "", qty: "1", unit_cost: "" };

export default function PurchasesPage() {
  const { show, node } = useToast();
  const [list, setList] = useState<PurchaseRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [products, setProducts] = useState<StockRow[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  // draft
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ ...EMPTY }]);
  const [busy, setBusy] = useState(false);

  const load = () => api.getPurchases().then((r) => setList(r.items)).catch((e) => show(String(e), "err"));
  useEffect(() => {
    load();
    api.getSuppliers().then(setSuppliers).catch(() => {});
    api.getStock().then(setProducts).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setItem(i: number, patch: Partial<DraftItem>) {
    setItems((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }

  const draftTotal = items.reduce((sum, it) => {
    const q = parseInt(it.qty, 10) || 0;
    const c = parseInt(it.unit_cost, 10) || 0;
    return sum + q * c;
  }, 0);

  async function post() {
    const rows = items
      .filter((it) => it.product_id !== "")
      .map((it) => ({
        product_id: Number(it.product_id),
        qty: parseInt(it.qty, 10) || 0,
        unit_cost: parseInt(it.unit_cost, 10) || 0,
      }));
    if (rows.length === 0) return show("Добавьте хотя бы один товар", "err");
    if (rows.some((r) => r.qty < 1)) return show("Количество должно быть ≥ 1", "err");
    setBusy(true);
    try {
      await api.createPurchase({
        supplier_id: supplierId === "" ? null : Number(supplierId),
        note: note.trim(),
        items: rows,
      });
      show("Накладная проведена, остатки обновлены");
      setSupplierId(""); setNote(""); setItems([{ ...EMPTY }]);
      load();
      api.getStock().then(setProducts).catch(() => {});
    } catch (e) { show(String(e), "err"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <h1 className="adm-h1">Закупки</h1>
      <p className="adm-sub">Приходная накладная: остатки и закупочные цены обновляются при проведении. Документ неизменяем — коррекции через журнал склада.</p>

      <div className="adm-block" style={{ borderStyle: "dashed" }}>
        <h3>Новая накладная</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div className="adm-field" style={{ flex: "0 1 220px", marginBottom: 0 }}><label>Поставщик</label>
            <select className="adm-in" value={supplierId}
              onChange={(e) => setSupplierId(e.target.value === "" ? "" : Number(e.target.value))}>
              <option value="">— без поставщика —</option>
              {suppliers.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div className="adm-field" style={{ flex: "1 1 240px", marginBottom: 0 }}><label>Комментарий</label>
            <input className="adm-in" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>

        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select className="adm-in" style={{ flex: "2 1 240px" }} value={it.product_id}
              onChange={(e) => setItem(i, { product_id: e.target.value === "" ? "" : Number(e.target.value) })}>
              <option value="">— товар —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.title}{p.sku ? ` (${p.sku})` : ""} — ост. {p.stock_qty ?? "—"}</option>
              ))}
            </select>
            <input className="adm-in" style={{ width: 90 }} type="number" min={1} value={it.qty}
              onChange={(e) => setItem(i, { qty: e.target.value })} placeholder="кол-во" />
            <input className="adm-in" style={{ width: 130 }} type="number" min={0} value={it.unit_cost}
              onChange={(e) => setItem(i, { unit_cost: e.target.value })} placeholder="цена закупки" />
            <button className="adm-btn ghost sm" onClick={() => setItems((l) => l.filter((_, j) => j !== i))}
              disabled={items.length === 1}>✕</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="adm-btn ghost sm" onClick={() => setItems((l) => [...l, { ...EMPTY }])}>+ строка</button>
          <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 13 }}>
            Итого: <b>{draftTotal.toLocaleString("ru-RU")} TMT</b>
          </span>
          <button className="adm-btn" onClick={post} disabled={busy}>{busy ? "…" : "Провести"}</button>
        </div>
      </div>

      {list.map((d) => (
        <div className="adm-block" key={d.id}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}
            onClick={() => setOpen(open === d.id ? null : d.id)}>
            <b>#{d.id}</b>
            <span>{d.supplier_name || "без поставщика"}</span>
            <span style={{ color: "var(--tx3)", fontSize: 13 }}>
              {d.created_at ? new Date(d.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
              {d.username && ` · ${d.username}`}
            </span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--mono)" }}>
              {d.total_cost.toLocaleString("ru-RU")} TMT · {d.items.length} поз.
            </span>
          </div>
          {open === d.id && (
            <div className="adm-table-wrap" style={{ marginTop: 12 }}>
              <table className="leads-table">
                <thead><tr><th>Товар</th><th>Кол-во</th><th>Цена закупки</th><th>Сумма</th></tr></thead>
                <tbody>
                  {d.items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.title}</td>
                      <td>{it.qty}</td>
                      <td>{it.unit_cost.toLocaleString("ru-RU")}</td>
                      <td>{(it.qty * it.unit_cost).toLocaleString("ru-RU")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {d.note && <p style={{ color: "var(--tx2)", fontSize: 13, margin: "10px 0 0" }}>{d.note}</p>}
            </div>
          )}
        </div>
      ))}
      {list.length === 0 && <p className="adm-sub">Накладных пока нет.</p>}
      {node}
    </>
  );
}
