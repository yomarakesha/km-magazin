import { useState } from "react";
import { api, type MovementIn, type StockRow } from "../api";
import { useAuth } from "../auth";
import { Badge, Button, Card, Check, Empty, ErrorBox, Field, Input, Loaded, Modal, NumInput, PageHead, Select, Tabs, money, useAction, useLoad } from "../ui";

export default function Stock() {
  const { can } = useAuth();
  const [q, setQ] = useState("");
  const [low, setLow] = useState(false);
  const state = useLoad(() => api.stock(q, low), [q, low]);
  const [move, setMove] = useState<StockRow | null>(null);
  const canWrite = can("warehouse");

  return (
    <>
      <PageHead title="Остатки" sub="Приход, списание и инвентаризация — каждая операция пишется в журнал движений" />
      <div className="row between">
        <input className="search" placeholder="Название или артикул" value={q} onChange={(e) => setQ(e.target.value)} />
        <Check checked={low} onChange={setLow}>
          Только заканчивающиеся
        </Check>
      </div>
      <Card flush>
        <Loaded state={state}>
          {(rows) =>
            rows.length === 0 ? (
              <Empty title="Ничего не найдено" />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th className="right">Остаток</th>
                    <th className="right">Себестоимость</th>
                    <th className="right">Цена</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="title">
                          {r.title} {!r.enabled && <Badge>Скрыт</Badge>}
                        </div>
                        {r.sku && <div className="sub">{r.sku}</div>}
                      </td>
                      <td className="right">
                        {r.stock_qty === null ? (
                          <span className="muted">не учитывается</span>
                        ) : (
                          <span className={`badge ${r.stock_qty === 0 ? "soft-red" : r.low ? "soft-amber" : "soft-green"}`}>{r.stock_qty} шт.</span>
                        )}
                      </td>
                      <td className="right mono dim">{money(r.cost_price)}</td>
                      <td className="right price">{money(r.price)}</td>
                      <td className="right">
                        {canWrite && (
                          <Button size="sm" variant="outline" onClick={() => setMove(r)}>
                            Операция
                          </Button>
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
      {move && (
        <MovementModal
          row={move}
          onClose={() => setMove(null)}
          onDone={() => {
            setMove(null);
            state.reload();
          }}
        />
      )}
    </>
  );
}

function MovementModal({ row, onClose, onDone }: { row: StockRow; onClose: () => void; onDone: () => void }) {
  const suppliers = useLoad(api.suppliers);
  const { busy, error, run } = useAction();
  const [kind, setKind] = useState<MovementIn["kind"]>("receipt");
  const [qty, setQty] = useState<number | null>(1);
  const [newQty, setNewQty] = useState<number | null>(row.stock_qty ?? 0);
  const [cost, setCost] = useState<number | null>(row.cost_price);
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");

  const valid = kind === "adjust" ? newQty !== null && newQty >= 0 : !!qty && qty > 0;
  const save = async () => {
    const body: MovementIn =
      kind === "adjust"
        ? { product_id: row.id, kind, new_qty: newQty ?? 0, note }
        : {
            product_id: row.id,
            kind,
            qty: qty ?? 0,
            note,
            ...(kind === "receipt" && cost !== null ? { unit_cost: cost } : {}),
            ...(kind === "receipt" && supplier ? { supplier_id: Number(supplier) } : {}),
          };
    if (await run(() => api.createMovement(body), "Операция проведена")) onDone();
  };

  return (
    <Modal title={row.title} onClose={onClose}>
      <p className="muted small">Сейчас на складе: {row.stock_qty === null ? "не учитывается" : `${row.stock_qty} шт.`}</p>
      <Tabs
        value={kind}
        onChange={setKind}
        options={[
          { value: "receipt", label: "Приход" },
          { value: "writeoff", label: "Списание" },
          { value: "adjust", label: "Инвентаризация" },
        ]}
      />
      {kind === "adjust" ? (
        <Field label="Фактический остаток, шт.">
          <NumInput value={newQty} min={0} onChange={setNewQty} />
        </Field>
      ) : (
        <div className="grid2">
          <Field label="Количество, шт.">
            <NumInput value={qty} min={1} onChange={setQty} />
          </Field>
          {kind === "receipt" && (
            <Field label="Цена закупки за шт., TMT">
              <NumInput value={cost} min={0} onChange={setCost} />
            </Field>
          )}
        </div>
      )}
      {kind === "receipt" && (
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
      )}
      <Field label="Комментарий">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === "writeoff" ? "Брак, повреждение…" : ""} />
      </Field>
      <ErrorBox error={error} />
      <div className="form-actions">
        <Button onClick={save} disabled={busy || !valid}>
          Провести
        </Button>
      </div>
    </Modal>
  );
}
