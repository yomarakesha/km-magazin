import { Fragment, useEffect, useState } from "react";
import { api, type StockRow } from "../api";
import { useAuth } from "../auth";
import { Button, Card, Empty, ErrorBox, Field, Input, Loaded, Modal, NumInput, PageHead, Select, dateTime, money, useAction, useLoad } from "../ui";

export default function Purchases() {
  const { can } = useAuth();
  const state = useLoad(() => api.purchases(100));
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <PageHead
        title="Закупки"
        sub="Приход товара от поставщика одним документом"
        actions={can("warehouse") && <Button onClick={() => setCreating(true)}>+ Новая закупка</Button>}
      />
      <Card flush>
        <Loaded state={state}>
          {({ items }) =>
            items.length === 0 ? (
              <Empty title="Закупок нет" />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Поставщик</th>
                    <th>Позиции</th>
                    <th className="right">Сумма</th>
                    <th>Кто</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <Fragment key={p.id}>
                      <tr className="clickable" onClick={() => setOpen(open === p.id ? null : p.id)}>
                        <td className="mono">#{p.id}</td>
                        <td className="title">{p.supplier_name || "—"}</td>
                        <td className="dim">
                          {p.items.length} поз. · {p.items.reduce((n, it) => n + it.qty, 0)} шт.
                        </td>
                        <td className="right price">{money(p.total_cost)}</td>
                        <td className="dim">{p.username}</td>
                        <td className="dim small nowrap">{dateTime(p.created_at)}</td>
                      </tr>
                      {open === p.id && (
                        <tr>
                          <td colSpan={6} style={{ background: "var(--bg)" }}>
                            {p.items.map((it, i) => (
                              <div key={i} className="row between small" style={{ padding: "4px 0" }}>
                                <span>{it.title}</span>
                                <span className="mono">
                                  {it.qty} × {money(it.unit_cost)} = {money(it.qty * it.unit_cost)}
                                </span>
                              </div>
                            ))}
                            {p.note && <p className="muted small">{p.note}</p>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )
          }
        </Loaded>
      </Card>
      {creating && (
        <PurchaseModal
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            state.reload();
          }}
        />
      )}
    </>
  );
}

interface Line {
  product_id: number;
  title: string;
  qty: number | null;
  unit_cost: number | null;
}

function PurchaseModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const suppliers = useLoad(api.suppliers);
  const { busy, error, run } = useAction();
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<StockRow[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) return setHits([]);
    const t = window.setTimeout(() => api.stock(q.trim()).then((r) => setHits(r.slice(0, 6))).catch(() => setHits([])), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const add = (r: StockRow) => {
    if (!lines.some((l) => l.product_id === r.id)) setLines([...lines, { product_id: r.id, title: r.title, qty: 1, unit_cost: r.cost_price }]);
    setQ("");
    setHits([]);
  };
  const upd = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = lines.reduce((n, l) => n + (l.qty ?? 0) * (l.unit_cost ?? 0), 0);
  const valid = lines.length > 0 && lines.every((l) => (l.qty ?? 0) > 0 && l.unit_cost !== null && l.unit_cost >= 0);

  const save = async () => {
    const body = {
      supplier_id: supplier ? Number(supplier) : null,
      note,
      items: lines.map((l) => ({ product_id: l.product_id, qty: l.qty ?? 0, unit_cost: l.unit_cost ?? 0 })),
    };
    if (await run(() => api.createPurchase(body), "Закупка проведена")) onDone();
  };

  return (
    <Modal title="Новая закупка" onClose={onClose} wide>
      <div className="grid2">
        <Field label="Поставщик">
          <Select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
            <option value="">—</option>
            {(suppliers.data ?? [])
              .filter((s) => s.active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Комментарий">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Накладная №…" />
        </Field>
      </div>
      <div style={{ position: "relative" }}>
        <input className="search" style={{ width: "100%" }} placeholder="Добавить товар: название или артикул" value={q} onChange={(e) => setQ(e.target.value)} />
        {hits.length > 0 && (
          <div className="card" style={{ position: "absolute", left: 0, right: 0, top: 50, zIndex: 5, padding: 8, gap: 0 }}>
            {hits.map((h) => (
              <button
                key={h.id}
                type="button"
                className="list-row"
                style={{ border: "none", background: "none", textAlign: "left", cursor: "pointer", font: "inherit", padding: "8px 12px" }}
                onClick={() => add(h)}
              >
                <span style={{ flex: 1 }}>{h.title}</span>
                <span className="muted small">{h.stock_qty ?? "—"} шт.</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {lines.length > 0 && (
        <div>
          {lines.map((l, i) => (
            <div className="list-row" key={l.product_id}>
              <span style={{ flex: 1 }}>{l.title}</span>
              <div style={{ width: 90 }}>
                <NumInput className="input-sm" value={l.qty} min={1} onChange={(v) => upd(i, { qty: v })} placeholder="шт." />
              </div>
              <div style={{ width: 120 }}>
                <NumInput className="input-sm" value={l.unit_cost} min={0} onChange={(v) => upd(i, { unit_cost: v })} placeholder="цена/шт." />
              </div>
              <b className="mono" style={{ width: 110, textAlign: "right" }}>
                {money((l.qty ?? 0) * (l.unit_cost ?? 0))}
              </b>
              <button className="icon-btn" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Убрать">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="total-line">
        <span style={{ fontWeight: 800 }}>Итого</span>
        <b>{money(total)}</b>
      </div>
      <ErrorBox error={error} />
      <div className="form-actions">
        <Button onClick={save} disabled={busy || !valid}>
          Провести закупку
        </Button>
      </div>
    </Modal>
  );
}
