import { useState } from "react";
import { LANGS, api, type Zone, type ZoneIn, type ZoneTr } from "../api";
import { useAuth } from "../auth";
import { Badge, Button, Card, Check, Empty, ErrorBox, Field, Input, Loaded, Modal, NumInput, PageHead, confirmAction, money, useAction, useLoad } from "../ui";

const ruName = (z: Zone) => z.translations.find((t) => t.lang === "ru")?.name || `Зона #${z.id}`;

/** Checkout delivery options: price per zone, free-delivery threshold, pickup. */
export default function Delivery() {
  const { me } = useAuth();
  const state = useLoad(api.zones);
  const [edit, setEdit] = useState<Zone | "new" | null>(null);
  const { busy, run } = useAction();
  if (me?.role !== "owner") return <ErrorBox error="Раздел доступен только владельцу" />;

  async function move(list: Zone[], i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    if (await run(() => api.reorderZones(next.map((z) => z.id)))) state.reload();
  }

  return (
    <>
      <PageHead
        title="Доставка"
        sub="Варианты доставки в корзине. Стоимость прибавляется к итогу заказа; зона «по умолчанию» — если покупатель не выбрал"
        actions={<Button onClick={() => setEdit("new")}>+ Новая зона</Button>}
      />
      <Card flush>
        <Loaded state={state}>
          {(list) =>
            list.length === 0 ? (
              <Empty title="Зон нет — доставка бесплатная">Добавьте хотя бы одну зону, чтобы брать плату за доставку.</Empty>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Зона</th>
                    <th className="right">Стоимость</th>
                    <th className="right">Бесплатно от</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((z, i) => (
                    <tr key={z.id} className="clickable" onClick={() => setEdit(z)}>
                      <td>
                        <div className="title row" style={{ gap: 8 }}>
                          {ruName(z)}
                          {z.is_default && <Badge tone="soft-blue">По умолчанию</Badge>}
                          {z.is_pickup && <Badge tone="soft-green">Самовывоз</Badge>}
                          {!z.enabled && <Badge>Выключена</Badge>}
                        </div>
                        <div className="sub">{z.translations.find((t) => t.lang === "ru")?.note}</div>
                      </td>
                      <td className="right price">{z.price ? money(z.price) : "бесплатно"}</td>
                      <td className="right dim">{z.free_from ? money(z.free_from) : "—"}</td>
                      <td className="right nowrap" onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" disabled={busy} onClick={() => move(list, i, -1)} aria-label="Выше">
                          ↑
                        </button>
                        <button className="icon-btn" disabled={busy} onClick={() => move(list, i, 1)} aria-label="Ниже">
                          ↓
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </Loaded>
      </Card>
      {edit && (
        <ZoneModal
          zone={edit === "new" ? null : edit}
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

function ZoneModal({ zone, onClose, onDone }: { zone: Zone | null; onClose: () => void; onDone: () => void }) {
  const { busy, error, run } = useAction();
  const [f, setF] = useState<ZoneIn>(() => ({
    price: zone?.price ?? 0,
    free_from: zone?.free_from ?? null,
    is_pickup: zone?.is_pickup ?? false,
    is_default: zone?.is_default ?? false,
    enabled: zone?.enabled ?? true,
    translations: LANGS.map((l): ZoneTr => zone?.translations.find((t) => t.lang === l) ?? { lang: l, name: "", note: "" }),
  }));
  const setTr = (lang: string, patch: Partial<ZoneTr>) =>
    setF({ ...f, translations: f.translations.map((t) => (t.lang === lang ? { ...t, ...patch } : t)) });

  const save = async () => {
    if (await run(() => (zone ? api.updateZone(zone.id, f) : api.createZone(f)), "Сохранено")) onDone();
  };
  const remove = async () => {
    if (zone && confirmAction(`Удалить зону «${ruName(zone)}»? В старых заказах её название и стоимость сохранятся.`) && (await run(() => api.deleteZone(zone.id), "Удалено")))
      onDone();
  };

  return (
    <Modal title={zone ? ruName(zone) : "Новая зона доставки"} onClose={onClose} wide>
      {f.translations.map((t) => (
        <div className="grid2" key={t.lang}>
          <Field label={`Название ${t.lang.toUpperCase()}`}>
            <Input value={t.name} onChange={(e) => setTr(t.lang, { name: e.target.value })} placeholder={t.lang === "ru" ? "По Ашхабаду" : ""} />
          </Field>
          <Field label={`Пояснение ${t.lang.toUpperCase()}`}>
            <Input value={t.note} onChange={(e) => setTr(t.lang, { note: e.target.value })} placeholder={t.lang === "ru" ? "В день заявки или на следующий день" : ""} />
          </Field>
        </div>
      ))}
      <div className="grid2">
        <Field label="Стоимость, TMT" hint="0 — бесплатно">
          <NumInput value={f.price} min={0} onChange={(v) => setF({ ...f, price: v ?? 0 })} />
        </Field>
        <Field label="Бесплатно от суммы, TMT" hint="Пусто — всегда платно. Считается по товарам после промокода">
          <NumInput value={f.free_from} min={1} onChange={(v) => setF({ ...f, free_from: v })} />
        </Field>
      </div>
      <div className="row">
        <Check checked={f.is_default} onChange={(v) => setF({ ...f, is_default: v })}>
          По умолчанию
        </Check>
        <Check checked={f.is_pickup} onChange={(v) => setF({ ...f, is_pickup: v })}>
          Самовывоз (адрес не нужен)
        </Check>
        <Check checked={f.enabled} onChange={(v) => setF({ ...f, enabled: v })}>
          Показывать в корзине
        </Check>
      </div>
      <ErrorBox error={error} />
      <div className="form-actions">
        {zone && (
          <Button variant="danger" onClick={remove} disabled={busy}>
            Удалить
          </Button>
        )}
        <Button onClick={save} disabled={busy || !f.translations.find((t) => t.lang === "ru")?.name.trim()}>
          Сохранить
        </Button>
      </div>
    </Modal>
  );
}
