import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Card, Empty, Field, Input, Loaded, PageHead, Tabs, money, num, useLoad } from "../ui";

type Kind = "sales" | "stock" | "services";

export default function Reports() {
  const { can } = useAuth();
  const tabs: { value: Kind; label: string }[] = [];
  if (can("sales")) tabs.push({ value: "sales", label: "Продажи" }, { value: "services", label: "Услуги" });
  if (can("warehouse")) tabs.push({ value: "stock", label: "Склад" });
  const [kind, setKind] = useState<Kind>(tabs[0]?.value ?? "stock");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <>
      <PageHead
        title="Отчёты"
        actions={
          <a className="btn btn-outline" href={api.reportCsvUrl(kind, from || undefined, to || undefined)}>
            Скачать CSV
          </a>
        }
      />
      <div className="row between">
        <Tabs value={kind} onChange={setKind} options={tabs} />
        {kind !== "stock" && (
          <div className="row">
            <Field>
              <Input className="input-sm" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <span className="muted">—</span>
            <Field>
              <Input className="input-sm" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        )}
      </div>
      {kind === "sales" && <SalesReport from={from} to={to} />}
      {kind === "services" && <ServicesReport from={from} to={to} />}
      {kind === "stock" && <StockReport />}
    </>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="card stat">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
      {sub && <span className="muted small">{sub}</span>}
    </div>
  );
}

function SalesReport({ from, to }: { from: string; to: string }) {
  const state = useLoad(() => api.salesReport(from || undefined, to || undefined), [from, to]);
  return (
    <Loaded state={state}>
      {(r) => {
        const max = Math.max(1, ...r.daily.map((d) => d.revenue));
        return (
          <>
            <p className="muted small">
              Период: {r.from} — {r.to}
            </p>
            <div className="grid4">
              <Stat k="Выручка" v={money(r.revenue)} sub={`${num(r.orders)} продаж`} />
              <Stat k="Валовая прибыль" v={money(r.gross_profit)} sub={`себестоимость ${money(r.cogs)}`} />
              <Stat k="Средний чек" v={money(r.avg_check)} />
              <Stat k="Долги к получению" v={money(r.debts_outstanding)} sub={`скидки ${money(r.discounts)}`} />
            </div>
            <div className="grid2">
              <Card title="Выручка по дням">
                {r.daily.length === 0 ? (
                  <Empty title="Нет продаж" />
                ) : (
                  <>
                    <div className="bars">
                      {r.daily.map((d) => (
                        <div key={d.day} style={{ height: `${(d.revenue / max) * 100}%` }} title={`${d.day}: ${money(d.revenue)}`} />
                      ))}
                    </div>
                    <div className="row between muted small">
                      <span>{r.daily[0].day}</span>
                      <span>{r.daily[r.daily.length - 1].day}</span>
                    </div>
                  </>
                )}
              </Card>
              <Card title="Каналы">
                {(["online", "pos"] as const).map((c) => (
                  <div className="list-row" key={c}>
                    <span style={{ flex: 1 }}>{c === "online" ? "Сайт (заказы)" : "Касса"}</span>
                    <span className="dim small">{num(r.channels[c].orders)} шт.</span>
                    <b className="mono" style={{ minWidth: 120, textAlign: "right" }}>
                      {money(r.channels[c].revenue)}
                    </b>
                  </div>
                ))}
                {r.cost_coverage !== null && r.cost_coverage < 1 && (
                  <p className="muted small">Себестоимость известна для {Math.round(r.cost_coverage * 100)}% проданных единиц — прибыль приблизительная.</p>
                )}
              </Card>
            </div>
            <Card title="Топ товаров" flush>
              {r.top_products.length === 0 ? (
                <Empty title="Нет продаж" />
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Товар</th>
                      <th className="right">Продано</th>
                      <th className="right">Выручка</th>
                      <th className="right">Прибыль</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.top_products.map((p) => (
                      <tr key={p.id}>
                        <td className="title">{p.title}</td>
                        <td className="right mono">{num(p.qty)}</td>
                        <td className="right price">{money(p.revenue)}</td>
                        <td className="right mono dim">{money(p.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </>
        );
      }}
    </Loaded>
  );
}

function ServicesReport({ from, to }: { from: string; to: string }) {
  const state = useLoad(() => api.servicesReport(from || undefined, to || undefined), [from, to]);
  return (
    <Loaded state={state}>
      {(r) => (
        <>
          <div className="grid2">
            <Stat k="Оказано услуг" v={num(r.total_count)} />
            <Stat k="Выручка от услуг" v={money(r.total_revenue)} />
          </div>
          <Card flush>
            {r.services.length === 0 ? (
              <Empty title="Нет услуг за период" />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Услуга</th>
                    <th className="right">Кол-во</th>
                    <th className="right">Выручка</th>
                  </tr>
                </thead>
                <tbody>
                  {r.services.map((s) => (
                    <tr key={s.id}>
                      <td className="title">{s.title}</td>
                      <td className="right mono">{num(s.count)}</td>
                      <td className="right price">{money(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </Loaded>
  );
}

function StockReport() {
  const state = useLoad(api.stockReport);
  return (
    <Loaded state={state}>
      {(r) => (
        <>
          <div className="grid4">
            <Stat k="Склад по себестоимости" v={money(r.value_cost)} />
            <Stat k="Склад по розничной цене" v={money(r.value_retail)} />
            <Stat k="Единиц на складе" v={num(r.units)} sub={`${num(r.tracked_count)} товаров с учётом`} />
            <Stat k="Без движения" v={num(r.dead_stock.length)} sub={`более ${r.dead_days} дней`} />
          </div>
          <div className="grid2">
            <Card title="Заканчиваются">
              {r.low_stock.length === 0 ? (
                <Empty title="Всё в наличии" />
              ) : (
                r.low_stock.map((p) => (
                  <div className="list-row" key={p.id}>
                    <span style={{ flex: 1 }}>{p.title}</span>
                    <span className={`badge ${p.stock_qty === 0 ? "soft-red" : "soft-amber"}`}>{p.stock_qty} шт.</span>
                  </div>
                ))
              )}
            </Card>
            <Card title={`Без продаж более ${r.dead_days} дней`}>
              {r.dead_stock.length === 0 ? (
                <Empty title="Таких нет" />
              ) : (
                r.dead_stock.map((p) => (
                  <div className="list-row" key={p.id}>
                    <span style={{ flex: 1 }}>{p.title}</span>
                    <span className="dim small">{p.stock_qty} шт.</span>
                    <b className="mono">{money(p.value_cost)}</b>
                  </div>
                ))
              )}
            </Card>
          </div>
        </>
      )}
    </Loaded>
  );
}
