import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LANGS,
  api,
  mediaUrl,
  type Brand,
  type Category,
  type Lang,
  type Product,
  type ComponentIn,
  type ProductAttr,
  type ProductImage,
  type ProductIn,
  type ProductTr,
} from "../api";
import { useAuth } from "../auth";
import {
  Badge,
  Button,
  Card,
  Check,
  ErrorBox,
  Field,
  Input,
  LangTabs,
  Loaded,
  NumInput,
  PageHead,
  Qty,
  Select,
  Textarea,
  confirmAction,
  discountPct,
  money,
  useAction,
  useLoad,
} from "../ui";
import { catName, categoryTree } from "./Products";

const emptyTr = (lang: Lang): ProductTr => ({ lang, title: "", short: "", body: "", specs: [] });

function toForm(p: Product | null, cats: Category[]): ProductIn {
  if (!p) {
    return {
      slug: "",
      category_id: cats[0]?.id ?? 0,
      brand_id: null,
      is_new: false,
      price: 0,
      old_price: null,
      in_stock: true,
      stock_qty: null,
      sku: "",
      barcode: null,
      enabled: true,
      translations: LANGS.map(emptyTr),
      attributes: [],
      components: [],
    };
  }
  return {
    slug: p.slug,
    category_id: p.category_id,
    brand_id: p.brand_id,
    is_new: p.is_new,
    price: p.price,
    old_price: p.old_price,
    in_stock: p.in_stock,
    stock_qty: p.stock_qty,
    sku: p.sku,
    barcode: p.barcode,
    enabled: p.enabled,
    translations: LANGS.map((l) => p.translations.find((t) => t.lang === l) ?? emptyTr(l)),
    attributes: p.attributes,
    components: p.components.map(({ product_id, service_id, qty }) => ({ product_id, service_id, qty })),
  };
}

export default function ProductEdit() {
  const { id } = useParams();
  const productId = id ? Number(id) : null;
  const state = useLoad(
    () => Promise.all([productId ? api.product(productId) : Promise.resolve(null), api.categories(), api.brands()]),
    [productId],
  );
  return (
    <Loaded state={state}>
      {([product, cats, brands]) => (
        <Editor key={product?.id ?? "new"} product={product} cats={cats} brands={brands} onSaved={state.reload} />
      )}
    </Loaded>
  );
}

function Editor({ product, cats, brands, onSaved }: { product: Product | null; cats: Category[]; brands: Brand[]; onSaved: () => void }) {
  const nav = useNavigate();
  const { can, me } = useAuth();
  const initial = useMemo(() => toForm(product, cats), [product, cats]);
  const [f, setF] = useState<ProductIn>(initial);
  const [lang, setLang] = useState<Lang>("ru");
  const { busy, error, run } = useAction();

  const isOwner = me?.role === "owner";
  const canContent = can("content");
  const canStock = can("warehouse");
  const isNew = !product;
  // create is open to content+warehouse; on edit each field belongs to one role
  const canText = isNew ? can("content", "warehouse") : canContent;
  const canPrice = isNew ? can("content", "warehouse") : isOwner;

  const set = <K extends keyof ProductIn>(k: K, v: ProductIn[K]) => setF((s) => ({ ...s, [k]: v }));
  const tr = f.translations.find((t) => t.lang === lang)!;
  const setTr = (patch: Partial<ProductTr>) =>
    setF((s) => ({ ...s, translations: s.translations.map((t) => (t.lang === lang ? { ...t, ...patch } : t)) }));

  const category = cats.find((c) => c.id === f.category_id);
  const attrValue = (attrId: number) => f.attributes.find((a) => a.attribute_id === attrId);
  const setAttr = (attrId: number, value: string, numeric: boolean) =>
    setF((s) => {
      const rest = s.attributes.filter((a) => a.attribute_id !== attrId);
      if (value.trim() === "") return { ...s, attributes: rest };
      const n = numeric ? Number(value.replace(",", ".")) : NaN;
      const next: ProductAttr = { attribute_id: attrId, value, num_value: Number.isFinite(n) ? n : null };
      return { ...s, attributes: [...rest, next] };
    });

  async function save() {
    // only attributes of the current category are meaningful
    const allowed = new Set(category?.attributes.map((a) => a.id) ?? []);
    const payload: ProductIn = {
      ...f,
      sku: f.sku.trim(),
      barcode: f.barcode?.trim() || null,
      attributes: f.attributes.filter((a) => allowed.has(a.attribute_id)),
      translations: f.translations.map((t) => ({ ...t, specs: t.specs.filter((s) => s.label.trim() || s.value.trim()) })),
    };
    if (isNew) {
      const created = await run(() => api.createProduct(payload), "Товар создан");
      if (created) nav(`/products/${created.id}`, { replace: true });
      return;
    }
    // Send only changed fields: the backend checks each touched field against
    // the role that owns it (price → owner, stock → warehouse, texts → content).
    const diff: Partial<ProductIn> = {};
    for (const k of Object.keys(payload) as (keyof ProductIn)[]) {
      if (JSON.stringify(payload[k]) !== JSON.stringify(initial[k])) (diff as Record<string, unknown>)[k] = payload[k];
    }
    if (Object.keys(diff).length === 0) return;
    // reload refreshes `initial`, so the next diff is taken against saved values
    if (await run(() => api.updateProduct(product!.id, diff), "Сохранено")) onSaved();
  }

  async function remove() {
    if (!product || !confirmAction(`Удалить товар «${tr.title || product.slug}»?`)) return;
    const r = await run(() => api.deleteProduct(product.id), "Товар удалён");
    if (r) nav("/products");
  }

  const pct = discountPct(f.price, f.old_price);

  return (
    <>
      <PageHead
        back="/products"
        title={isNew ? "Новый товар" : f.translations.find((t) => t.lang === "ru")?.title || product!.slug}
        sub={
          !isNew && (
            <span className="row" style={{ gap: 6 }}>
              {pct > 0 && <Badge tone="red">-{pct}%</Badge>}
              {f.is_new && <Badge tone="blue">Новое</Badge>}
              {!f.enabled && <Badge>Скрыт на сайте</Badge>}
            </span>
          )
        }
        actions={
          <>
            {!isNew && can("content") && (
              <Button variant="danger" onClick={remove} disabled={busy}>
                Удалить
              </Button>
            )}
            <Button onClick={save} disabled={busy || !f.slug.trim() || !f.category_id}>
              {busy ? "Сохраняем…" : isNew ? "Создать" : "Сохранить"}
            </Button>
          </>
        }
      />
      <ErrorBox error={error} />
      <div className="split">
        <div className="stack">
          <Card title="Описание" actions={<LangTabs value={lang} onChange={setLang} />}>
            <Field label={`Название (${lang.toUpperCase()})`}>
              <Input value={tr.title} disabled={!canText} onChange={(e) => setTr({ title: e.target.value })} placeholder="HIKVISION Face Control HK-043" />
            </Field>
            <Field label="Кратко" hint="Строка под названием в карточке">
              <Input value={tr.short} disabled={!canText} onChange={(e) => setTr({ short: e.target.value })} />
            </Field>
            <Field label="Описание">
              <Textarea rows={5} value={tr.body} disabled={!canText} onChange={(e) => setTr({ body: e.target.value })} />
            </Field>
            <SpecsEditor specs={tr.specs} disabled={!canText} onChange={(specs) => setTr({ specs })} />
          </Card>

          {category && category.attributes.length > 0 && (
            <Card title="Характеристики для фильтров" actions={<span className="muted small">{catName(category)}</span>}>
              <div className="grid2">
                {category.attributes.map((a) => {
                  const label = a.translations.find((t) => t.lang === "ru")?.label || a.key;
                  return (
                    <Field key={a.id} label={`${label}${a.unit ? `, ${a.unit}` : ""}`}>
                      <Input
                        value={attrValue(a.id)?.value ?? ""}
                        disabled={!canText}
                        inputMode={a.type === "number" ? "decimal" : undefined}
                        onChange={(e) => setAttr(a.id, e.target.value, a.type === "number")}
                      />
                    </Field>
                  );
                })}
              </div>
            </Card>
          )}

          <BuildEditor
            value={f.components}
            selfId={product?.id ?? null}
            disabled={!canText}
            price={f.price}
            onSetPrice={canPrice ? (v) => set("price", v) : undefined}
            onChange={(components) => set("components", components)}
          />

          {product ? <Images productId={product.id} canEdit={canContent} /> : <p className="muted small">Фото можно добавить после создания товара.</p>}
        </div>

        <div className="stack">
          <Card title="Цена">
            <div className="grid2">
              <Field label="Цена, TMT">
                <NumInput value={f.price} min={0} disabled={!canPrice} onChange={(v) => set("price", v ?? 0)} />
              </Field>
              <Field label="Старая цена" hint="Для скидки">
                <NumInput value={f.old_price} min={0} disabled={!canPrice} onChange={(v) => set("old_price", v)} />
              </Field>
            </div>
            {pct > 0 && (
              <p className="small">
                Скидка <b>{pct}%</b> · было {money(f.old_price)}
              </p>
            )}
            {!canPrice && <p className="muted small">Цену меняет только владелец.</p>}
          </Card>

          <Card title="Размещение">
            <Field label="Категория">
              <Select value={f.category_id} disabled={!canText} onChange={(e) => set("category_id", Number(e.target.value))}>
                {categoryTree(cats).map(({ cat: c, depth }) => (
                  <option key={c.id} value={c.id}>
                    {"— ".repeat(depth)}
                    {catName(c)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Бренд">
              <Select value={f.brand_id ?? ""} disabled={!canText} onChange={(e) => set("brand_id", e.target.value ? Number(e.target.value) : null)}>
                <option value="">Без бренда</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Адрес на сайте (slug)" hint="Латиница, цифры и дефис">
              <Input value={f.slug} disabled={!canText} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
            </Field>
            <Check checked={f.enabled} onChange={(v) => canText && set("enabled", v)}>
              Показывать на сайте
            </Check>
            <Check checked={f.is_new} onChange={(v) => canText && set("is_new", v)}>
              Метка «Новое»
            </Check>
          </Card>

          <Card title="Склад">
            <Field label="Остаток, шт." hint="Пусто — остаток не учитывается">
              <NumInput value={f.stock_qty} min={0} disabled={!(isNew ? can("content", "warehouse") : canStock)} onChange={(v) => set("stock_qty", v)} />
            </Field>
            <div className="grid2">
              <Field label="Артикул">
                <Input value={f.sku} disabled={!canText} onChange={(e) => set("sku", e.target.value)} />
              </Field>
              <Field label="Штрихкод">
                <Input value={f.barcode ?? ""} disabled={!canStock} onChange={(e) => set("barcode", e.target.value || null)} />
              </Field>
            </div>
            <Check checked={f.in_stock} onChange={(v) => canText && set("in_stock", v)}>
              В наличии (иначе «под заказ»)
            </Check>
          </Card>
        </div>
      </div>
    </>
  );
}

function SpecsEditor({ specs, onChange, disabled }: { specs: { label: string; value: string }[]; onChange: (s: { label: string; value: string }[]) => void; disabled: boolean }) {
  const upd = (i: number, patch: Partial<{ label: string; value: string }>) => onChange(specs.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="stack">
      <div className="row between">
        <span className="lbl small">Характеристики на странице товара</span>
        {!disabled && (
          <Button variant="ghost" size="sm" onClick={() => onChange([...specs, { label: "", value: "" }])}>
            + Строка
          </Button>
        )}
      </div>
      {specs.length === 0 && <p className="muted small">Например: «Гарантия — 24 мес.», «Экран — 4.3"».</p>}
      {specs.map((s, i) => (
        <div className="row" key={i} style={{ flexWrap: "nowrap" }}>
          <Input className="input-sm" placeholder="Название" value={s.label} disabled={disabled} onChange={(e) => upd(i, { label: e.target.value })} />
          <Input className="input-sm" placeholder="Значение" value={s.value} disabled={disabled} onChange={(e) => upd(i, { value: e.target.value })} />
          {!disabled && (
            <button className="icon-btn" onClick={() => onChange(specs.filter((_, j) => j !== i))} aria-label="Удалить строку">
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function Images({ productId, canEdit }: { productId: number; canEdit: boolean }) {
  const state = useLoad(() => api.images(productId), [productId]);
  const { busy, error, run } = useAction();
  const input = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  useEffect(() => setImages(state.data ?? []), [state.data]);

  async function upload(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) await run(() => api.uploadImage(productId, file));
    state.reload();
  }
  async function move(i: number, dir: -1 | 1) {
    const next = [...images];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setImages(next);
    await run(() => api.reorderImages(productId, next.map((x) => x.id)));
  }

  return (
    <Card
      title="Фото"
      actions={
        canEdit && (
          <>
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
            <Button variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? "Загрузка…" : "+ Загрузить"}
            </Button>
          </>
        )
      }
    >
      <ErrorBox error={error} />
      {images.length === 0 ? (
        <p className="muted small">Фото нет — на сайте будет заглушка. Первое фото — главное.</p>
      ) : (
        <div className="images">
          {images.map((im, i) => (
            <div className="image-tile" key={im.id}>
              <img src={mediaUrl(`products/${im.filename}`)} alt="" />
              {canEdit && (
                <div className="ops">
                  <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Левее">
                    ‹
                  </button>
                  <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Правее">
                    ›
                  </button>
                  <button
                    className="icon-btn"
                    aria-label="Удалить фото"
                    onClick={() => confirmAction("Удалить фото?") && run(() => api.deleteImage(im.id)).then(state.reload)}
                  >
                    ×
                  </button>
                </div>
              )}
              {i === 0 && (
                <span className="badge blue" style={{ position: "absolute", left: 6, bottom: 6 }}>
                  Главное
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Parts list of a ready-made build (Figma "Build" screen). Lines show live
 * catalog titles/prices; the build's own price is set separately. */
function BuildEditor({
  value,
  selfId,
  disabled,
  price,
  onSetPrice,
  onChange,
}: {
  value: ComponentIn[];
  selfId: number | null;
  disabled: boolean;
  price: number;
  onSetPrice?: (v: number) => void;
  onChange: (v: ComponentIn[]) => void;
}) {
  const state = useLoad(() => Promise.all([api.products(), api.allServices(), api.categories()]));
  const [pick, setPick] = useState("");
  if (!state.data) return null;
  const [products, services, cats] = state.data;
  const prodById = new Map(products.map((p) => [p.id, p]));
  const svcById = new Map(services.map((s) => [s.id, s]));
  const catById = new Map(cats.map((c) => [c.id, c]));

  const info = (c: ComponentIn) => {
    if (c.service_id !== null) {
      const s = svcById.get(c.service_id);
      return { title: s ? s.translations.find((t) => t.lang === "ru")?.title || s.slug : "(удалено)", label: "Сервис", price: s?.price ?? 0 };
    }
    const p = c.product_id !== null ? prodById.get(c.product_id) : undefined;
    const cat = p ? catById.get(p.category_id) : undefined;
    return {
      title: p ? p.translations.find((t) => t.lang === "ru")?.title || p.slug : "(удалено)",
      label: cat ? catName(cat) : "",
      price: p?.price ?? 0,
    };
  };
  const sum = value.reduce((n, c) => n + info(c).price * c.qty, 0);
  const upd = (i: number, patch: Partial<ComponentIn>) => onChange(value.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = (v: string) => {
    if (!v) return;
    const [kind, id] = v.split(":");
    onChange([...value, kind === "s" ? { product_id: null, service_id: Number(id), qty: 1 } : { product_id: Number(id), service_id: null, qty: 1 }]);
    setPick("");
  };

  return (
    <Card title="Состав сборки" actions={<span className="muted small">для готовых ПК</span>}>
      {value.length === 0 ? (
        <p className="muted small">Пусто — обычный товар. Добавьте комплектующие и услугу сборки, чтобы товар стал «готовой сборкой».</p>
      ) : (
        <div>
          {value.map((c, i) => {
            const it = info(c);
            return (
              <div className="list-row" key={i}>
                <div style={{ flex: 1 }}>
                  <div className="muted small">{it.label}</div>
                  <div style={{ fontWeight: 500 }}>{it.title}</div>
                </div>
                {!disabled && <Qty value={c.qty} onChange={(qty) => upd(i, { qty })} />}
                <b className="mono" style={{ minWidth: 100, textAlign: "right" }}>
                  {money(it.price * c.qty)}
                </b>
                {!disabled && (
                  <span className="nowrap">
                    <button className="icon-btn" onClick={() => move(i, -1)} aria-label="Выше">
                      ↑
                    </button>
                    <button className="icon-btn" onClick={() => move(i, 1)} aria-label="Ниже">
                      ↓
                    </button>
                    <button className="icon-btn" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Убрать">
                      ×
                    </button>
                  </span>
                )}
              </div>
            );
          })}
          <div className="total-line">
            <span>
              Сумма частей
              {sum !== price && <span className="muted small"> · цена сборки {money(price)}</span>}
            </span>
            <b>{money(sum)}</b>
          </div>
          {onSetPrice && sum !== price && (
            <Button variant="ghost" size="sm" onClick={() => onSetPrice(sum)}>
              Поставить цену = {money(sum)}
            </Button>
          )}
        </div>
      )}
      {!disabled && (
        <Select value={pick} onChange={(e) => add(e.target.value)}>
          <option value="">+ Добавить комплектующую или услугу…</option>
          {categoryTree(cats).map(({ cat }) => {
            const items = products.filter((p) => p.category_id === cat.id && p.id !== selfId);
            return items.length ? (
              <optgroup key={cat.id} label={catName(cat)}>
                {items.map((p) => (
                  <option key={p.id} value={`p:${p.id}`}>
                    {p.translations.find((t) => t.lang === "ru")?.title || p.slug} — {money(p.price)}
                  </option>
                ))}
              </optgroup>
            ) : null;
          })}
          <optgroup label="Услуги">
            {services.map((sv) => (
              <option key={sv.id} value={`s:${sv.id}`}>
                {sv.translations.find((t) => t.lang === "ru")?.title || sv.slug} — {money(sv.price)}
              </option>
            ))}
          </optgroup>
        </Select>
      )}
    </Card>
  );
}
