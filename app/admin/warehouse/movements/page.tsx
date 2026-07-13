"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type MovementRow, type MovementKind } from "@/lib/admin-api";
import { useToast } from "../../_components/useToast";

const PAGE = 50;

const KIND_LABEL: Record<MovementKind, string> = {
  receipt: "приход",
  sale: "продажа",
  return: "возврат",
  writeoff: "списание",
  adjust: "корректировка",
};
const KIND_COLOR: Record<MovementKind, string> = {
  receipt: "var(--green-br)",
  sale: "var(--tx2)",
  return: "#e8b34b",
  writeoff: "#ff9a9a",
  adjust: "#7db4ff",
};

function MovementsInner() {
  const { show, node } = useToast();
  const params = useSearchParams();
  const productId = params.get("product_id");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<MovementRow[]>([]);

  useEffect(() => {
    api.getMovements({
      product_id: productId ? Number(productId) : undefined,
      kind: kind || undefined,
      limit: PAGE,
      offset: page * PAGE,
    })
      .then((r) => { setRows(r.items); setTotal(r.total); })
      .catch((e) => show(String(e), "err"));
  }, [productId, kind, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <h1 className="adm-h1">Журнал склада</h1>
      <p className="adm-sub">
        Каждое движение остатка: кто, когда, сколько и почему.
        {productId && <> Фильтр по товару #{productId} — <a href="/admin/warehouse/movements">сбросить</a>.</>}
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <select className="adm-in" style={{ width: 200 }} value={kind}
          onChange={(e) => { setKind(e.target.value); setPage(0); }}>
          <option value="">Все операции</option>
          {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      <div className="adm-table-wrap">
        <table className="leads-table">
          <thead>
            <tr><th>Дата</th><th>Товар</th><th>Операция</th><th>Кол-во</th><th>Остаток</th><th>Закупка</th><th>Кто</th><th>Комментарий</th></tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td style={{ whiteSpace: "nowrap", color: "var(--tx3)" }}>
                  {m.created_at ? new Date(m.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                </td>
                <td>{m.product_title}</td>
                <td><span style={{ color: KIND_COLOR[m.kind] }}>{KIND_LABEL[m.kind]}</span></td>
                <td style={{ fontFamily: "var(--mono)" }}>{m.qty_delta > 0 ? `+${m.qty_delta}` : m.qty_delta}</td>
                <td>{m.stock_after ?? "—"}</td>
                <td>{m.unit_cost != null ? m.unit_cost.toLocaleString("ru-RU") : "—"}</td>
                <td style={{ color: "var(--tx3)" }}>{m.username || "магазин"}</td>
                <td style={{ color: "var(--tx2)" }}>
                  {m.note}
                  {m.order_id != null && <> <a href={`/admin/shop/orders`}>заказ #{m.order_id}</a></>}
                  {m.purchase_id != null && <> <a href={`/admin/warehouse/purchases`}>накладная #{m.purchase_id}</a></>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--tx3)", padding: 24 }}>Движений нет</td></tr>}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="adm-pager">
          <button className="adm-btn ghost sm" disabled={page === 0} onClick={() => setPage(page - 1)}>←</button>
          <span>{page + 1} / {pages}</span>
          <button className="adm-btn ghost sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>→</button>
        </div>
      )}
      {node}
    </>
  );
}

export default function MovementsPage() {
  return (
    <Suspense fallback={<div className="adm-loading">Загрузка…</div>}>
      <MovementsInner />
    </Suspense>
  );
}
