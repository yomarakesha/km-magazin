import { useState } from "react";
import { api, type Supplier } from "../api";
import { useAuth } from "../auth";
import { Badge, Button, Card, Check, Empty, ErrorBox, Field, Input, Loaded, Modal, PageHead, Textarea, confirmAction, useAction, useLoad } from "../ui";

export default function Suppliers() {
  const { can } = useAuth();
  const state = useLoad(api.suppliers);
  const [edit, setEdit] = useState<Supplier | "new" | null>(null);
  const canWrite = can("warehouse");

  return (
    <>
      <PageHead title="Поставщики" actions={canWrite && <Button onClick={() => setEdit("new")}>+ Поставщик</Button>} />
      <Card flush>
        <Loaded state={state}>
          {(list) =>
            list.length === 0 ? (
              <Empty title="Поставщиков нет" />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Телефон</th>
                    <th>Заметка</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id} className={canWrite ? "clickable" : ""} onClick={() => canWrite && setEdit(s)}>
                      <td className="title">
                        {s.name} {!s.active && <Badge>Неактивен</Badge>}
                      </td>
                      <td className="dim">{s.phone || "—"}</td>
                      <td className="dim small">{s.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </Loaded>
      </Card>
      {edit && (
        <SupplierModal
          s={edit === "new" ? null : edit}
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

function SupplierModal({ s, onClose, onDone }: { s: Supplier | null; onClose: () => void; onDone: () => void }) {
  const { busy, error, run } = useAction();
  const [f, setF] = useState({ name: s?.name ?? "", phone: s?.phone ?? "", note: s?.note ?? "", active: s?.active ?? true });
  const save = async () => {
    if (await run(() => (s ? api.updateSupplier(s.id, f) : api.createSupplier(f)), "Сохранено")) onDone();
  };
  const remove = async () => {
    if (s && confirmAction(`Удалить поставщика «${s.name}»?`) && (await run(() => api.deleteSupplier(s.id), "Удалено"))) onDone();
  };
  return (
    <Modal title={s ? s.name : "Новый поставщик"} onClose={onClose}>
      <Field label="Название">
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
      </Field>
      <Field label="Телефон">
        <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </Field>
      <Field label="Заметка">
        <Textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </Field>
      {s && (
        <Check checked={f.active} onChange={(v) => setF({ ...f, active: v })}>
          Активен
        </Check>
      )}
      <ErrorBox error={error} />
      <div className="form-actions">
        {s && (
          <Button variant="danger" onClick={remove} disabled={busy}>
            Удалить
          </Button>
        )}
        <Button onClick={save} disabled={busy || !f.name.trim()}>
          Сохранить
        </Button>
      </div>
    </Modal>
  );
}
