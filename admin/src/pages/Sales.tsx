import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Badge, Button, Card, Empty, Field, Input, Loaded, PageHead, Tabs, confirmAction, dateTime, money, useAction, useLoad } from "../ui";

const METHOD = { cash: "Наличные", terminal: "Карта", debt: "В долг" } as const;

export default function Sales() {
  const nav = useNavigate();
  const { me } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [view, setView] = useState<"all" | "debt">("all");
  const state = useLoad(() => api.sales({ date_from: from, date_to: to, debt: view === "debt" }), [from, to, view]);
  const { busy, run } = useAction();

  return (
    <>
      <PageHead title="Продажи кассы" actions={<Button onClick={() => nav("/pos")}>Открыть кассу</Button>} />
      <div className="row between">
        <Tabs
          value={view}
          onChange={setView}
          options={[
            { value: "all", label: "Все" },
            { value: "debt", label: "Долги" },
          ]}
        />
        <div className="row">
          <Field>
            <Input className="input-sm" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <span className="muted">—</span>
          <Field>
            <Input className="input-sm" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
      </div>
      <Card flush>
        <Loaded state={state}>
          {(list) =>
            list.length === 0 ? (
              <Empty title="Продаж нет за период" />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Чек</th>
                    <th>Состав</th>
                    <th className="right">Сумма</th>
                    <th>Оплата</th>
                    <th>Продавец</th>
                    <th>Дата</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id} className="clickable" onClick={() => nav(`/pos/receipt/${s.id}`)}>
                      <td className="mono">#{s.id}</td>
                      <td className="dim">{s.items.map((it) => `${it.title} × ${it.qty}`).join(", ")}</td>
                      <td className="right">
                        <div className="price">{money(s.sold_total)}</div>
                        {s.discount > 0 && <div className="old-price">{money(s.subtotal)}</div>}
                      </td>
                      <td>
                        {s.status === "debt" ? (
                          <Badge tone="soft-red">Долг · {s.debtor_name}</Badge>
                        ) : (
                          <span className="dim">{METHOD[s.payment_method]}</span>
                        )}
                      </td>
                      <td className="dim">{s.seller}</td>
                      <td className="dim small nowrap">{dateTime(s.created_at)}</td>
                      <td className="right nowrap" onClick={(e) => e.stopPropagation()}>
                        {s.status === "debt" && (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => api.settleSale(s.id), "Долг погашен").then((r) => r && state.reload())}>
                            Погашен
                          </Button>
                        )}
                        {me?.role === "owner" && (
                          <button
                            className="icon-btn"
                            aria-label="Аннулировать"
                            title="Аннулировать (вернуть на склад)"
                            onClick={() => confirmAction(`Аннулировать чек #${s.id}? Товар вернётся на склад.`) && run(() => api.voidSale(s.id), "Чек аннулирован").then((r) => r && state.reload())}
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </Loaded>
      </Card>
    </>
  );
}
