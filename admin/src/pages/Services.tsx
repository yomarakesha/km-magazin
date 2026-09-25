import { useState } from "react";
import { LANGS, api, type Category, type Lang, type ShopService, type ShopServiceIn, type ShopServiceTr } from "../api";
import {
  Badge,
  Button,
  Card,
  Check,
  Empty,
  ErrorBox,
  Field,
  Input,
  LangTabs,
  Loaded,
  Modal,
  NumInput,
  PageHead,
  Select,
  Textarea,
  confirmAction,
  money,
  useAction,
  useLoad,
} from "../ui";
import { catName, categoryTree } from "./Products";

export const serviceTitle = (s: ShopService) => s.translations.find((t) => t.lang === "ru")?.title || s.slug;
export const servicePrice = (s: { price: number; price_from: boolean; currency?: string }) =>
  `${s.price_from ? "от " : ""}${money(s.price, s.currency)}`;

/** "Услуги" page of the storefront: every service, grouped by category. */
export default function Services() {
  const state = useLoad(() => Promise.all([api.allServices(), api.categories()]));
  const [edit, setEdit] = useState<ShopService | "new" | null>(null);

  return (
    <>
      <PageHead
        title="Услуги"
        sub="Страница «Услуги» на сайте: карточки с ценой «от», страница услуги с формой заявки"
        actions={<Button onClick={() => setEdit("new")}>+ Новая услуга</Button>}
      />
      <Loaded state={state}>
        {([services, cats]) => (
          <>
            {services.length === 0 ? (
              <Card>
                <Empty title="Услуг нет" />
              </Card>
            ) : (
              categoryTree(cats)
                .map(({ cat }) => ({ cat, list: services.filter((s) => s.category_id === cat.id) }))
                .filter((g) => g.list.length > 0)
                .map(({ cat, list }) => (
                  <Card key={cat.id} title={catName(cat)} flush>
                    <table className="table">
                      <tbody>
                        {list.map((s) => {
                          const ru = s.translations.find((t) => t.lang === "ru");
                          return (
                            <tr key={s.id} className="clickable" onClick={() => setEdit(s)}>
                              <td>
                                <div className="title">
                                  {serviceTitle(s)} {!s.enabled && <Badge>Скрыта</Badge>}
                                </div>
                                <div className="sub">{ru?.short}</div>
                              </td>
                              <td className="dim small">{ru?.feats.length ? `${ru.feats.length} пунктов «Что входит»` : "без описания"}</td>
                              <td className="right price">{servicePrice(s)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Card>
                ))
            )}
            {edit && (
              <ServiceModal
                svc={edit === "new" ? null : edit}
                cats={cats}
                onClose={() => setEdit(null)}
                onDone={() => {
                  setEdit(null);
                  state.reload();
                }}
              />
            )}
          </>
        )}
      </Loaded>
    </>
  );
}

const emptyTr = (lang: Lang): ShopServiceTr => ({ lang, title: "", short: "", body: "", feats: [] });

/** Create/edit a service. `categoryId` fixes the category (category page). */
export function ServiceModal({
  svc,
  cats,
  categoryId,
  onClose,
  onDone,
}: {
  svc: ShopService | null;
  cats?: Category[];
  categoryId?: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const { busy, error, run } = useAction();
  const [lang, setLang] = useState<Lang>("ru");
  const [catId, setCatId] = useState<number>(svc?.category_id ?? categoryId ?? cats?.[0]?.id ?? 0);
  const [f, setF] = useState<ShopServiceIn>(() => ({
    slug: svc?.slug ?? "",
    price: svc?.price ?? 0,
    price_from: svc?.price_from ?? true,
    icon: svc?.icon ?? "wrench",
    enabled: svc?.enabled ?? true,
    translations: LANGS.map((l) => svc?.translations.find((t) => t.lang === l) ?? emptyTr(l)),
  }));
  const tr = f.translations.find((t) => t.lang === lang)!;
  const setTr = (patch: Partial<ShopServiceTr>) =>
    setF({ ...f, translations: f.translations.map((t) => (t.lang === lang ? { ...t, ...patch } : t)) });

  const save = async () => {
    const body = { ...f, translations: f.translations.map((t) => ({ ...t, feats: t.feats.map((x) => x.trim()).filter(Boolean) })) };
    const r = svc
      ? await run(() => api.updateService(svc.id, { ...body, ...(catId !== svc.category_id ? { category_id: catId } : {}) }), "Сохранено")
      : await run(() => api.createService(catId, body), "Услуга создана");
    if (r) onDone();
  };
  const remove = async () => {
    if (svc && confirmAction(`Удалить услугу «${serviceTitle(svc)}»?`) && (await run(() => api.deleteService(svc.id), "Удалено"))) onDone();
  };

  return (
    <Modal title={svc ? serviceTitle(svc) : "Новая услуга"} onClose={onClose} wide>
      <div className="row between">
        <span className="muted small">Тексты для языка</span>
        <LangTabs value={lang} onChange={setLang} />
      </div>
      <div className="grid2">
        <Field label={`Название (${lang.toUpperCase()})`}>
          <Input value={tr.title} onChange={(e) => setTr({ title: e.target.value })} placeholder="Сборка ПК" />
        </Field>
        <Field label="Кратко" hint="Текст в карточке на странице «Услуги»">
          <Input value={tr.short} onChange={(e) => setTr({ short: e.target.value })} />
        </Field>
      </div>
      <Field label="Описание" hint="Абзац вверху страницы услуги">
        <Textarea rows={3} value={tr.body} onChange={(e) => setTr({ body: e.target.value })} />
      </Field>
      <Field label="Что входит" hint="Каждый пункт с новой строки">
        <Textarea rows={4} value={tr.feats.join("\n")} onChange={(e) => setTr({ feats: e.target.value.split("\n") })} />
      </Field>
      <hr className="divider" />
      <div className="grid3">
        <Field label="Цена, TMT">
          <NumInput value={f.price} min={0} onChange={(v) => setF({ ...f, price: v ?? 0 })} />
        </Field>
        <Field label="Slug" hint="Адрес страницы /services/…">
          <Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} />
        </Field>
        {cats && !categoryId ? (
          <Field label="Категория">
            <Select value={catId} onChange={(e) => setCatId(Number(e.target.value))}>
              {categoryTree(cats).map(({ cat, depth }) => (
                <option key={cat.id} value={cat.id}>
                  {"— ".repeat(depth)}
                  {catName(cat)}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Иконка">
            <Select value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })}>
              <option value="wrench">Ключ</option>
              <option value="settings">Настройка</option>
              <option value="refresh">Обновление</option>
            </Select>
          </Field>
        )}
      </div>
      <div className="row">
        <Check checked={f.price_from} onChange={(v) => setF({ ...f, price_from: v })}>
          Цена «от» — {servicePrice(f)}
        </Check>
        <Check checked={f.enabled} onChange={(v) => setF({ ...f, enabled: v })}>
          Показывать на сайте
        </Check>
      </div>
      <ErrorBox error={error} />
      <div className="form-actions">
        {svc && (
          <Button variant="danger" onClick={remove} disabled={busy}>
            Удалить
          </Button>
        )}
        <Button onClick={save} disabled={busy || !f.slug || !catId}>
          Сохранить
        </Button>
      </div>
    </Modal>
  );
}
