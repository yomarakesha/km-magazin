"use client";
import { useEffect, useState } from "react";
import { api, type AdminRole, type SalesReport, type StockReport, type ServicesReport } from "@/lib/admin-api";
import { useToast } from "../_components/useToast";

type Tab = "sales" | "stock" | "services";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
const fmt = (n: number) => n.toLocaleString("ru-RU");

export default function ReportsPage() {
  const { show, node } = useToast();
  const [role, setRole] = useState<AdminRole>("owner");
  const [tab, setTab] = useState<Tab>("sales");
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));

  const [sales, setSales] = useState<SalesReport | null>(null);
  const [stock, setStock] = useState<StockReport | null>(null);
  const [services, setServices] = useState<ServicesReport | null>(null);

  useEffect(() => {
    api.me().then((m) => {
      setRole(m.role);
      // land on the first tab the role can see
      if (m.role === "warehouse") setTab("stock");
    }).catch(() => {});
  }, []);

  const canSales = role === "owner" || role === "sales";
  const canStock = role === "owner" || role === "warehouse";
  const canServices = canSales;

  useEffect(() => {
    if (tab === "sales" && canSales) api.getSalesReport(from, to).then(setSales).catch((e) => show(String(e), "err"));
    if (tab === "stock" && canStock) api.getStockReport().then(setStock).catch((e) => show(String(e), "err"));
    if (tab === "services" && canServices) api.getServicesReport(from, to).then(setServices).catch((e) => show(String(e), "err"));
  }, [tab, from, to, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const TABS: { id: Tab; label: string; on: boolean }[] = [
    { id: "sales", label: "Продажи и прибыль", on: canSales },
    { id: "stock", label: "Склад", on: canStock },
    { id: "services", label: "Услуги", on: canServices },
  ];

  return (
    <>
      <h1 className="adm-h1">Отчёты</h1>

      <div className="adm-tabs" style={{ marginBottom: 16 }}>
        {TABS.filter((t) => t.on).map((t) => (
          <button key={t.id} className={tab === t.id ? "act" : ""} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab !== "stock" && (
        <div style={{ display: "flex", gap: 10, alignItems: "end", marginBottom: 16, flexWrap: "wrap" }}>
          <div className="adm-field" style={{ marginBottom: 0 }}><label>С</label>
            <input className="adm-in" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="adm-field" style={{ marginBottom: 0 }}><label>По</label>
            <input className="adm-in" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <a className="adm-btn ghost" href={api.reportCsvUrl(tab, from, to)}>Скачать CSV</a>
        </div>
      )}

      {/* ---- Продажи ---- */}
      {tab === "sales" && canSales && sales && (
        <>
          <div className="adm-cards">
            <div className="adm-card"><span>Выручка</span><b>{fmt(sales.revenue)} TMT</b></div>
            <div className="adm-card"><span>Заказов</span><b>{fmt(sales.orders)}</b></div>
            <div className="adm-card"><span>Средний чек</span><b>{fmt(sales.avg_check)} TMT</b></div>
            <div className="adm-card"><span>Себестоимость</span><b>{fmt(sales.cogs)} TMT</b></div>
            <div className="adm-card"><span>Прибыль</span><b style={{ color: "var(--green-br)" }}>{fmt(sales.gross_profit)} TMT</b></div>
            <div className="adm-card"><span>Скидки</span><b>−{fmt(sales.discounts)} TMT</b></div>
          </div>
          {sales.cost_coverage != null && sales.cost_coverage < 1 && (
            <p className="adm-sub">⚠ Себестоимость известна для {Math.round(sales.cost_coverage * 100)}% позиций — прибыль оценочная. Проведите закупки, чтобы уточнить.</p>
          )}

          <h3 style={{ marginTop: 22 }}>Топ товаров</h3>
          <div className="adm-table-wrap">
            <table className="leads-table">
              <thead><tr><th>Товар</th><th>Продано</th><th>Выручка</th><th>Прибыль</th></tr></thead>
              <tbody>
                {sales.top_products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.title}</td><td>{p.qty}</td><td>{fmt(p.revenue)}</td>
                    <td style={{ color: p.profit >= 0 ? "var(--green-br)" : "#ff9a9a" }}>{fmt(p.profit)}</td>
                  </tr>
                ))}
                {sales.top_products.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--tx3)", padding: 20 }}>Нет продаж за период</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ---- Склад ---- */}
      {tab === "stock" && canStock && stock && (
        <>
          <div className="adm-cards">
            <div className="adm-card"><span>Стоимость (закуп)</span><b>{fmt(stock.value_cost)} TMT</b></div>
            <div className="adm-card"><span>Стоимость (розница)</span><b>{fmt(stock.value_retail)} TMT</b></div>
            <div className="adm-card"><span>Единиц на складе</span><b>{fmt(stock.units)}</b></div>
            <div className="adm-card"><span>Позиций с учётом</span><b>{fmt(stock.tracked_count)}</b></div>
          </div>
          <div style={{ margin: "10px 0 20px" }}>
            <a className="adm-btn ghost" href={api.reportCsvUrl("stock")}>Скачать CSV</a>
          </div>

          <h3>Низкие остатки (≤5)</h3>
          <StockTable rows={stock.low_stock} empty="Нет товаров с низким остатком" />

          <h3 style={{ marginTop: 22 }}>Мёртвый запас (нет продаж {stock.dead_days} дн.)</h3>
          <StockTable rows={stock.dead_stock} empty="Мёртвого запаса нет" />
        </>
      )}

      {/* ---- Услуги ---- */}
      {tab === "services" && canServices && services && (
        <>
          <div className="adm-cards">
            <div className="adm-card"><span>Заказано услуг</span><b>{fmt(services.total_count)}</b></div>
            <div className="adm-card"><span>Выручка с услуг</span><b>{fmt(services.total_revenue)} TMT</b></div>
          </div>
          <div className="adm-table-wrap" style={{ marginTop: 16 }}>
            <table className="leads-table">
              <thead><tr><th>Услуга</th><th>Заказано</th><th>Выручка</th></tr></thead>
              <tbody>
                {services.services.map((s) => (
                  <tr key={s.id}><td>{s.title}</td><td>{s.count}</td><td>{fmt(s.revenue)}</td></tr>
                ))}
                {services.services.length === 0 && <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--tx3)", padding: 20 }}>Нет заказов услуг за период</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
      {node}
    </>
  );
}

function StockTable({ rows, empty }: { rows: StockReport["items"]; empty: string }) {
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  return (
    <div className="adm-table-wrap">
      <table className="leads-table">
        <thead><tr><th>Товар</th><th>SKU</th><th>Остаток</th><th>Закупка</th><th>Стоимость</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.title}</td>
              <td style={{ color: "var(--tx3)" }}>{r.sku || "—"}</td>
              <td><b>{r.stock_qty ?? "—"}</b></td>
              <td>{r.cost_price != null ? fmt(r.cost_price) : "—"}</td>
              <td>{fmt(r.value_cost)}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--tx3)", padding: 18 }}>{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
