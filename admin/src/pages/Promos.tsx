import { useState } from "react";
import { api, type Promo, type PromoIn } from "../api";
import { Badge, Button, Card, Check, Empty, ErrorBox, Field, Input, Loaded, Modal, NumInput, PageHead, Select, confirmAction, dateOnly, money, useAction, useLoad } from "../ui";

export default function Promos() {
  const state = useLoad(api.promos);
  const [edit, setEdit] = useState<Promo | "new" | null>(null);
  return (
    <>
      <PageHead title="Промокоды" sub="Скидка применяется при оформлении заявки" actions={<Button onClick={() => setEdit("new")}>+ Новый промокод</Button>} />
      <Card flush>
        <Loaded state={state}>
          {(list) =>
            list.length === 0 ? (
              <Empty title="Промокодов нет" />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Код</th>
                    <th>Скидка</th>
                    <th>От суммы</th>
                    <th>Использован</th>
                    <th>Действует до</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const expired = p.expires_at && new Date(p.expires_at) < new Date();
                    return (
                      <tr key={p.id} className="clickable" onClick={() => setEdit(p)}>
                        <td className="title mono">{p.code}</td>
                        <td className="price">{p.kind === "percent" ? `${p.value}%` : money(p.value)}</td>
                        <td className="dim">{p.min_total ? money(p.min_total) : "—"}</td>
                        <td className="mono">
                          {p.used_count}
                          {p.max_uses ? ` / ${p.max_uses}` : ""}
                        </td>
                        <td className="dim">{p.expires_at ? dateOnly(p.expires_at) : "бессрочно"}</td>
                        <td>
                          {!p.active ? <Badge>Выключен</Badge> : expired ? <Badge tone="soft-red">Истёк</Badge> : <Badge tone="soft-green">Активен</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          }
        </Loaded>
      </Card>
      {edit && (
        <PromoModal
          promo={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onDone={() => {
            setEdit(null);
            state.reload();
          }}
        />
      )}
    </>
  );
}

function PromoModal({ promo, onClose, onDone }: { promo: Promo | null; onClose: () => void; onDone: () => void }) {
  const { busy, error, run } = useAction();
  const [f, setF] = useState<PromoIn>(() => ({
    code: promo?.code ?? "",
    kind: promo?.kind ?? "percent",
    value: promo?.value ?? 10,
    min_total: promo?.min_total ?? 0,
    active: promo?.active ?? true,
    expires_at: promo?.expires_at ? promo.expires_at.slice(0, 10) : null,
    max_uses: promo?.max_uses ?? null,
  }));
  const save = async () => {
    const body = { ...f, code: f.code.trim().toUpperCase(), expires_at: f.expires_at || null };
    if (await run(() => (promo ? api.updatePromo(promo.id, body) : api.createPromo(body)), "Сохранено")) onDone();
  };
  const remove = async () => {
    if (promo && confirmAction(`Удалить промокод ${promo.code}?`) && (await run(() => api.deletePromo(promo.id), "Удалено"))) onDone();
  };
  return (
    <Modal title={promo ? promo.code : "Новый промокод"} onClose={onClose}>
      <div className="grid2">
        <Field label="Код">
          <Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="SALE10" autoFocus />
        </Field>
        <Field label="Тип скидки">
          <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as PromoIn["kind"] })}>
            <option value="percent">Процент</option>
            <option value="fixed">Сумма, TMT</option>
          </Select>
        </Field>
        <Field label={f.kind === "percent" ? "Скидка, %" : "Скидка, TMT"}>
          <NumInput value={f.value} min={1} onChange={(v) => setF({ ...f, value: v ?? 0 })} />
        </Field>
        <Field label="Минимальная сумма заказа">
          <NumInput value={f.min_total} min={0} onChange={(v) => setF({ ...f, min_total: v ?? 0 })} />
        </Field>
        <Field label="Действует до" hint="Пусто — бессрочно">
          <Input type="date" value={f.expires_at ?? ""} onChange={(e) => setF({ ...f, expires_at: e.target.value || null })} />
        </Field>
        <Field label="Лимит использований" hint="Пусто — без лимита">
          <NumInput value={f.max_uses} min={1} onChange={(v) => setF({ ...f, max_uses: v })} />
        </Field>
      </div>
      <Check checked={f.active} onChange={(v) => setF({ ...f, active: v })}>
        Активен
      </Check>
      <ErrorBox error={error} />
      <div className="form-actions">
        {promo && (
          <Button variant="danger" onClick={remove} disabled={busy}>
            Удалить
          </Button>
        )}
        <Button onClick={save} disabled={busy || f.code.trim().length < 2 || f.value < 1}>
          Сохранить
        </Button>
      </div>
    </Modal>
  );
}
