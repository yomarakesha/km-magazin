import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LANGS, api, type Lang, type SitePage, type SitePageIn, type SitePageTr } from "../api";
import { Badge, Button, Card, Check, Empty, ErrorBox, Field, Input, LangTabs, Loaded, PageHead, Textarea, confirmAction, useAction, useLoad } from "../ui";

const ruTitle = (p: SitePage) => p.translations.find((t) => t.lang === "ru")?.title || p.slug;

/** Info pages: About, FAQ, Delivery, Guarantee, Install… */
export default function SitePages() {
  const nav = useNavigate();
  const state = useLoad(api.pages);
  return (
    <>
      <PageHead
        title="Страницы сайта"
        sub="Текстовые страницы из подвала: о магазине, доставка, гарантия, FAQ, установка"
        actions={<Button onClick={() => nav("/pages/new")}>+ Новая страница</Button>}
      />
      <Card flush>
        <Loaded state={state}>
          {(list) =>
            list.length === 0 ? (
              <Empty title="Страниц нет" />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Страница</th>
                    <th>Адрес</th>
                    <th className="right">Разделов</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id} className="clickable" onClick={() => nav(`/pages/${p.id}`)}>
                      <td className="title">
                        {ruTitle(p)} {!p.enabled && <Badge>Скрыта</Badge>}
                      </td>
                      <td className="dim">/{p.slug}</td>
                      <td className="right mono">{p.translations.find((t) => t.lang === "ru")?.blocks.length ?? 0}</td>
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

const emptyTr = (lang: Lang): SitePageTr => ({ lang, title: "", lead: "", blocks: [] });

export function SitePageEdit() {
  const { id } = useParams();
  const pageId = id ? Number(id) : null;
  const state = useLoad(() => (pageId ? api.page(pageId) : Promise.resolve(null)), [pageId]);
  return <Loaded state={state}>{(page) => <Editor key={page?.id ?? "new"} page={page} onSaved={state.reload} />}</Loaded>;
}

function Editor({ page, onSaved }: { page: SitePage | null; onSaved: () => void }) {
  const nav = useNavigate();
  const { busy, error, run } = useAction();
  const [lang, setLang] = useState<Lang>("ru");
  const [f, setF] = useState<SitePageIn>(() => ({
    slug: page?.slug ?? "",
    enabled: page?.enabled ?? true,
    translations: LANGS.map((l) => page?.translations.find((t) => t.lang === l) ?? emptyTr(l)),
  }));
  const tr = f.translations.find((t) => t.lang === lang)!;
  const setTr = (patch: Partial<SitePageTr>) =>
    setF({ ...f, translations: f.translations.map((t) => (t.lang === lang ? { ...t, ...patch } : t)) });
  const setBlock = (i: number, patch: Partial<{ title: string; body: string }>) =>
    setTr({ blocks: tr.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= tr.blocks.length) return;
    const next = [...tr.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setTr({ blocks: next });
  };

  async function save() {
    if (page) {
      if (await run(() => api.updatePage(page.id, f), "Сохранено")) onSaved();
    } else {
      const created = await run(() => api.createPage(f), "Страница создана");
      if (created) nav(`/pages/${created.id}`, { replace: true });
    }
  }
  async function remove() {
    if (page && confirmAction(`Удалить страницу «${ruTitle(page)}»?`) && (await run(() => api.deletePage(page.id), "Удалено"))) nav("/pages");
  }

  return (
    <>
      <PageHead
        back="/pages"
        title={page ? ruTitle(page) : "Новая страница"}
        actions={
          <>
            {page && (
              <Button variant="danger" onClick={remove} disabled={busy}>
                Удалить
              </Button>
            )}
            <Button onClick={save} disabled={busy || !f.slug}>
              {page ? "Сохранить" : "Создать"}
            </Button>
          </>
        }
      />
      <ErrorBox error={error} />
      <div className="split">
        <div className="stack">
          <Card title="Текст" actions={<LangTabs value={lang} onChange={setLang} />}>
            <Field label={`Заголовок (${lang.toUpperCase()})`}>
              <Input value={tr.title} onChange={(e) => setTr({ title: e.target.value })} />
            </Field>
            <Field label="Вступление" hint="Серый текст под заголовком">
              <Textarea rows={2} value={tr.lead} onChange={(e) => setTr({ lead: e.target.value })} />
            </Field>
          </Card>
          <Card
            title="Разделы"
            actions={
              <Button variant="outline" size="sm" onClick={() => setTr({ blocks: [...tr.blocks, { title: "", body: "" }] })}>
                + Раздел
              </Button>
            }
          >
            {tr.blocks.length === 0 && <p className="muted small">Для FAQ: заголовок — вопрос, текст — ответ. Пустые разделы не сохраняются.</p>}
            {tr.blocks.map((b, i) => (
              <div key={i} className="stack" style={{ paddingBottom: 14, borderBottom: "1px solid var(--line-soft)" }}>
                <div className="row" style={{ flexWrap: "nowrap" }}>
                  <Input value={b.title} placeholder="Заголовок раздела" onChange={(e) => setBlock(i, { title: e.target.value })} />
                  <button className="icon-btn" onClick={() => moveBlock(i, -1)} aria-label="Выше">
                    ↑
                  </button>
                  <button className="icon-btn" onClick={() => moveBlock(i, 1)} aria-label="Ниже">
                    ↓
                  </button>
                  <button className="icon-btn" onClick={() => setTr({ blocks: tr.blocks.filter((_, j) => j !== i) })} aria-label="Удалить раздел">
                    ×
                  </button>
                </div>
                <Textarea rows={3} value={b.body} placeholder="Текст" onChange={(e) => setBlock(i, { body: e.target.value })} />
              </div>
            ))}
          </Card>
        </div>
        <Card title="Публикация">
          <Field label="Адрес" hint="Латиница и дефис: about, faq, delivery…">
            <Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} />
          </Field>
          <Check checked={f.enabled} onChange={(v) => setF({ ...f, enabled: v })}>
            Показывать на сайте
          </Check>
        </Card>
      </div>
    </>
  );
}
