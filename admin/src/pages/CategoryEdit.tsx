import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LANGS, api, type Attribute, type AttributeIn, type Category, type CategoryIn, type Lang, type ShopService } from "../api";
import {
  Badge,
  Button,
  Card,
  Check,
  Empty,
  ErrorBox,
  Field,
  Input,
  Loaded,
  Modal,
  PageHead,
  Select,
  confirmAction,
  useAction,
  useLoad,
} from "../ui";
import { catName, categoryTree } from "./Products";
import { ServiceModal, servicePrice } from "./Services";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]+/g, "-");

export default function CategoryEdit() {
  const { id } = useParams();
  const catId = id ? Number(id) : null;
  const state = useLoad(() => api.categories(), [catId]);
  return (
    <Loaded state={state}>
      {(cats) => {
        const cat = catId ? cats.find((c) => c.id === catId) ?? null : null;
        if (catId && !cat) return <ErrorBox error="Категория не найдена" />;
        return <Editor key={catId ?? "new"} cat={cat} cats={cats} onSaved={state.reload} />;
      }}
    </Loaded>
  );
}

function Editor({ cat, cats, onSaved }: { cat: Category | null; cats: Category[]; onSaved: () => void }) {
  const nav = useNavigate();
  const { busy, error, run } = useAction();
  const [f, setF] = useState<CategoryIn>(() => ({
    slug: cat?.slug ?? "",
    enabled: cat?.enabled ?? true,
    parent_id: cat?.parent_id ?? null,
    translations: LANGS.map((l) => ({ lang: l, name: cat?.translations.find((t) => t.lang === l)?.name ?? "" })),
  }));
  const setName = (lang: Lang, name: string) =>
    setF((s) => ({ ...s, translations: s.translations.map((t) => (t.lang === lang ? { ...t, name } : t)) }));

  // a category can't become its own descendant's child
  const descendants = new Set<number>();
  if (cat) {
    const walk = (pid: number) =>
      cats.filter((c) => c.parent_id === pid).forEach((c) => {
        descendants.add(c.id);
        walk(c.id);
      });
    walk(cat.id);
  }
  const parents = categoryTree(cats).filter(({ cat: c }) => c.id !== cat?.id && !descendants.has(c.id));

  async function save() {
    if (cat) {
      if (await run(() => api.updateCategory(cat.id, f), "Сохранено")) onSaved();
    } else {
      const created = await run(() => api.createCategory(f), "Категория создана");
      if (created) nav(`/categories/${created.id}`, { replace: true });
    }
  }
  async function remove() {
    if (!cat) return;
    const warn = cat.product_count ? ` Вместе с ней удалятся ${cat.product_count} товаров!` : "";
    if (!confirmAction(`Удалить категорию «${catName(cat)}»?${warn}`)) return;
    if (await run(() => api.deleteCategory(cat.id), "Категория удалена")) nav("/categories");
  }

  return (
    <>
      <PageHead
        back="/categories"
        title={cat ? catName(cat) : "Новая категория"}
        sub={cat && `${cat.product_count} товаров`}
        actions={
          <>
            {cat && (
              <Button variant="danger" onClick={remove} disabled={busy}>
                Удалить
              </Button>
            )}
            <Button onClick={save} disabled={busy || !f.slug.trim()}>
              {cat ? "Сохранить" : "Создать"}
            </Button>
          </>
        }
      />
      <ErrorBox error={error} />
      <div className="split">
        <div className="stack">
          <Card title="Название">
            <div className="grid3">
              {f.translations.map((t) => (
                <Field key={t.lang} label={t.lang.toUpperCase()}>
                  <Input value={t.name} onChange={(e) => setName(t.lang, e.target.value)} />
                </Field>
              ))}
            </div>
          </Card>
          {cat ? (
            <>
              <Attributes cat={cat} onChanged={onSaved} />
              <Services cat={cat} />
            </>
          ) : (
            <p className="muted small">Фильтры и услуги можно добавить после создания категории.</p>
          )}
        </div>
        <Card title="Размещение">
          <Field label="Родительская категория">
            <Select value={f.parent_id ?? ""} onChange={(e) => setF({ ...f, parent_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">— верхний уровень —</option>
              {parents.map(({ cat: c, depth }) => (
                <option key={c.id} value={c.id}>
                  {"— ".repeat(depth)}
                  {catName(c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Slug" hint="Адрес в каталоге: /catalog/…">
            <Input value={f.slug} onChange={(e) => setF({ ...f, slug: slugify(e.target.value) })} />
          </Field>
          <Check checked={f.enabled} onChange={(v) => setF({ ...f, enabled: v })}>
            Показывать на сайте
          </Check>
        </Card>
      </div>
    </>
  );
}

// ------------------------------------------------------------- attributes
function Attributes({ cat, onChanged }: { cat: Category; onChanged: () => void }) {
  const [edit, setEdit] = useState<Attribute | "new" | null>(null);
  const { busy, run } = useAction();
  const attrs = [...cat.attributes].sort((a, b) => a.sort_order - b.sort_order);

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= attrs.length) return;
    const next = [...attrs];
    [next[i], next[j]] = [next[j], next[i]];
    if (await run(() => api.reorderAttributes(cat.id, next.map((a) => a.id)))) onChanged();
  }

  return (
    <Card
      title="Характеристики для фильтров"
      actions={
        <Button variant="outline" size="sm" onClick={() => setEdit("new")}>
          + Характеристика
        </Button>
      }
    >
      {attrs.length === 0 ? (
        <p className="muted small">Например: «Сокет», «Объём, GB». Значения заполняются в карточке товара.</p>
      ) : (
        <div>
          {attrs.map((a, i) => (
            <div className="list-row" key={a.id}>
              <div style={{ flex: 1 }}>
                <b>{a.translations.find((t) => t.lang === "ru")?.label || a.key}</b>
                <span className="muted small">
                  {" "}
                  · {a.key} · {a.type === "number" ? "число (диапазон)" : "список значений"}
                  {a.unit && ` · ${a.unit}`}
                </span>
              </div>
              {!a.filterable && <Badge>не в фильтре</Badge>}
              <button className="icon-btn" disabled={busy} onClick={() => move(i, -1)} aria-label="Выше">
                ↑
              </button>
              <button className="icon-btn" disabled={busy} onClick={() => move(i, 1)} aria-label="Ниже">
                ↓
              </button>
              <Button variant="ghost" size="sm" onClick={() => setEdit(a)}>
                Изменить
              </Button>
            </div>
          ))}
        </div>
      )}
      {edit && (
        <AttributeModal
          catId={cat.id}
          attr={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onDone={() => {
            setEdit(null);
            onChanged();
          }}
        />
      )}
    </Card>
  );
}

function AttributeModal({ catId, attr, onClose, onDone }: { catId: number; attr: Attribute | null; onClose: () => void; onDone: () => void }) {
  const { busy, error, run } = useAction();
  const [f, setF] = useState<AttributeIn>(() => ({
    key: attr?.key ?? "",
    type: attr?.type ?? "select",
    unit: attr?.unit ?? "",
    filterable: attr?.filterable ?? true,
    translations: LANGS.map((l) => ({ lang: l, label: attr?.translations.find((t) => t.lang === l)?.label ?? "" })),
  }));
  const save = async () => {
    const r = await run(() => (attr ? api.updateAttribute(attr.id, f) : api.createAttribute(catId, f)), "Сохранено");
    if (r) onDone();
  };
  const remove = async () => {
    if (attr && confirmAction("Удалить характеристику? Значения у товаров тоже удалятся.") && (await run(() => api.deleteAttribute(attr.id), "Удалено"))) onDone();
  };
  return (
    <Modal title={attr ? "Характеристика" : "Новая характеристика"} onClose={onClose}>
      <div className="grid3">
        {f.translations.map((t) => (
          <Field key={t.lang} label={`Название ${t.lang.toUpperCase()}`}>
            <Input
              value={t.label}
              onChange={(e) => setF({ ...f, translations: f.translations.map((x) => (x.lang === t.lang ? { ...x, label: e.target.value } : x)) })}
            />
          </Field>
        ))}
      </div>
      <div className="grid3">
        <Field label="Ключ" hint="В адресе фильтра">
          <Input value={f.key} onChange={(e) => setF({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} />
        </Field>
        <Field label="Тип">
          <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as AttributeIn["type"] })}>
            <option value="select">Список значений</option>
            <option value="number">Число (диапазон)</option>
          </Select>
        </Field>
        <Field label="Единица">
          <Input value={f.unit} placeholder="GB, W, MP" onChange={(e) => setF({ ...f, unit: e.target.value })} />
        </Field>
      </div>
      <Check checked={f.filterable} onChange={(v) => setF({ ...f, filterable: v })}>
        Показывать в фильтрах каталога
      </Check>
      <ErrorBox error={error} />
      <div className="form-actions">
        {attr && (
          <Button variant="danger" onClick={remove} disabled={busy}>
            Удалить
          </Button>
        )}
        <Button onClick={save} disabled={busy || !f.key}>
          Сохранить
        </Button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------- services
function Services({ cat }: { cat: Category }) {
  const state = useLoad(() => api.services(cat.id), [cat.id]);
  const [edit, setEdit] = useState<ShopService | "new" | null>(null);
  return (
    <Card
      title="Услуги категории"
      actions={
        <Button variant="outline" size="sm" onClick={() => setEdit("new")}>
          + Услуга
        </Button>
      }
    >
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty title="Услуг нет">Например, «Сборка ПК» или «Монтаж видеонаблюдения».</Empty>
          ) : (
            <div>
              {list.map((s) => (
                <div className="list-row" key={s.id}>
                  <div style={{ flex: 1 }}>
                    <b>{s.translations.find((t) => t.lang === "ru")?.title || s.slug}</b>
                    <div className="muted small">{s.translations.find((t) => t.lang === "ru")?.short}</div>
                  </div>
                  {!s.enabled && <Badge>Скрыта</Badge>}
                  <span className="price">{servicePrice(s)}</span>
                  <Button variant="ghost" size="sm" onClick={() => setEdit(s)}>
                    Изменить
                  </Button>
                </div>
              ))}
            </div>
          )
        }
      </Loaded>
      {edit && (
        <ServiceModal
          categoryId={cat.id}
          svc={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onDone={() => {
            setEdit(null);
            state.reload();
          }}
        />
      )}
    </Card>
  );
}
