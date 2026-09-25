import { useState } from "react";
import { api, type Brand } from "../api";
import { Badge, Button, Card, Check, Empty, ErrorBox, Field, Input, Loaded, Modal, PageHead, confirmAction, useAction, useLoad } from "../ui";

export default function Brands() {
  const state = useLoad(() => Promise.all([api.brands(), api.products()]));
  const [edit, setEdit] = useState<Brand | "new" | null>(null);
  const { busy, run } = useAction();

  async function move(list: Brand[], i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    if (await run(() => api.reorderBrands(next.map((b) => b.id)))) state.reload();
  }

  return (
    <>
      <PageHead
        title="Бренды"
        sub="Порядок — как в полосе брендов на главной и на странице «Бренды»"
        actions={<Button onClick={() => setEdit("new")}>+ Новый бренд</Button>}
      />
      <Card flush>
        <Loaded state={state}>
          {([brands, products]) => {
            const count = new Map<number, number>();
            products.forEach((p) => p.brand_id && count.set(p.brand_id, (count.get(p.brand_id) ?? 0) + 1));
            return brands.length === 0 ? (
              <Empty title="Брендов нет" />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Бренд</th>
                    <th>Slug</th>
                    <th className="right">Товаров</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {brands.map((b, i) => (
                    <tr key={b.id} className="clickable" onClick={() => setEdit(b)}>
                      <td className="title">
                        {b.name} {!b.enabled && <Badge>Скрыт</Badge>}
                      </td>
                      <td className="dim">{b.slug ?? <span className="muted">—</span>}</td>
                      <td className="right mono">{count.get(b.id) ?? 0}</td>
                      <td className="right nowrap" onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" disabled={busy} onClick={() => move(brands, i, -1)} aria-label="Выше">
                          ↑
                        </button>
                        <button className="icon-btn" disabled={busy} onClick={() => move(brands, i, 1)} aria-label="Ниже">
                          ↓
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }}
        </Loaded>
      </Card>
      {edit && (
        <BrandModal
          brand={edit === "new" ? null : edit}
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

function BrandModal({ brand, onClose, onDone }: { brand: Brand | null; onClose: () => void; onDone: () => void }) {
  const { busy, error, run } = useAction();
  const [name, setName] = useState(brand?.name ?? "");
  const [slug, setSlug] = useState(brand?.slug ?? "");
  const [enabled, setEnabled] = useState(brand?.enabled ?? true);

  const save = async () => {
    const body = { name: name.trim(), enabled, ...(slug ? { slug } : {}) };
    if (await run(() => (brand ? api.updateBrand(brand.id, body) : api.createBrand(body)), "Сохранено")) onDone();
  };
  const remove = async () => {
    if (brand && confirmAction(`Удалить бренд «${brand.name}»? У товаров бренд станет пустым.`) && (await run(() => api.deleteBrand(brand.id), "Удалено")))
      onDone();
  };

  return (
    <Modal title={brand ? brand.name : "Новый бренд"} onClose={onClose}>
      <Field label="Название">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Hikvision" />
      </Field>
      <Field label="Slug" hint="Для адреса /brands/…; пусто — из названия. Для кириллицы задайте вручную (bolid).">
        <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
      </Field>
      <Check checked={enabled} onChange={setEnabled}>
        Показывать на сайте
      </Check>
      <ErrorBox error={error} />
      <div className="form-actions">
        {brand && (
          <Button variant="danger" onClick={remove} disabled={busy}>
            Удалить
          </Button>
        )}
        <Button onClick={save} disabled={busy || !name.trim()}>
          Сохранить
        </Button>
      </div>
    </Modal>
  );
}
