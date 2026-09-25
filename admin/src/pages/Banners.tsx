import { useRef, useState } from "react";
import { LANGS, api, mediaUrl, type Banner, type BannerIn, type BannerTr } from "../api";
import { Badge, Button, Card, Check, Empty, ErrorBox, Field, Input, Loaded, Modal, PageHead, confirmAction, useAction, useLoad } from "../ui";

const ruTitle = (b: Banner) => b.translations.find((t) => t.lang === "ru")?.title || `Баннер #${b.id}`;

export default function Banners() {
  const state = useLoad(api.banners);
  const [edit, setEdit] = useState<Banner | "new" | null>(null);
  const { busy, run } = useAction();

  async function move(list: Banner[], i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    if (await run(() => api.reorderBanners(next.map((b) => b.id)))) state.reload();
  }

  return (
    <>
      <PageHead title="Баннеры главной" sub="Слайдер вверху главной страницы" actions={<Button onClick={() => setEdit("new")}>+ Новый баннер</Button>} />
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Card>
              <Empty title="Баннеров нет" />
            </Card>
          ) : (
            <div className="grid2">
              {list.map((b, i) => {
                const ru = b.translations.find((t) => t.lang === "ru");
                return (
                  <div key={b.id} className="card flush" style={{ cursor: "pointer" }} onClick={() => setEdit(b)}>
                    <div style={{ aspectRatio: "1226 / 608", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {b.image ? (
                        <img src={mediaUrl(b.image)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span className="muted small">Нет изображения</span>
                      )}
                    </div>
                    <div className="row between" style={{ padding: "16px 20px" }}>
                      <div>
                        <b>{ruTitle(b)}</b> {!b.enabled && <Badge>Скрыт</Badge>}
                        <div className="muted small">{ru?.subtitle}</div>
                        {b.link && <div className="small dim">→ {b.link}</div>}
                      </div>
                      <span className="nowrap" onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" disabled={busy} onClick={() => move(list, i, -1)} aria-label="Раньше">
                          ←
                        </button>
                        <button className="icon-btn" disabled={busy} onClick={() => move(list, i, 1)} aria-label="Позже">
                          →
                        </button>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </Loaded>
      {edit && (
        <BannerModal
          banner={edit === "new" ? null : edit}
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

function BannerModal({ banner, onClose, onDone }: { banner: Banner | null; onClose: () => void; onDone: () => void }) {
  const { busy, error, run } = useAction();
  const file = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<File | null>(null);
  const [f, setF] = useState<BannerIn>(() => ({
    link: banner?.link ?? "",
    enabled: banner?.enabled ?? true,
    translations: LANGS.map((l): BannerTr => banner?.translations.find((t) => t.lang === l) ?? { lang: l, title: "", subtitle: "" }),
  }));
  const setTr = (lang: string, patch: Partial<BannerTr>) =>
    setF({ ...f, translations: f.translations.map((t) => (t.lang === lang ? { ...t, ...patch } : t)) });

  const save = async () => {
    const saved = await run(() => (banner ? api.updateBanner(banner.id, f) : api.createBanner(f)));
    if (!saved) return;
    if (upload && !(await run(() => api.uploadBannerImage(saved.id, upload)))) return;
    onDone();
  };
  const remove = async () => {
    if (banner && confirmAction("Удалить баннер?") && (await run(() => api.deleteBanner(banner.id), "Удалено"))) onDone();
  };
  const preview = upload ? URL.createObjectURL(upload) : banner?.image ? mediaUrl(banner.image) : null;

  return (
    <Modal title={banner ? ruTitle(banner) : "Новый баннер"} onClose={onClose} wide>
      <div
        style={{ aspectRatio: "1226 / 608", borderRadius: 12, border: "1px solid var(--line)", overflow: "hidden", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        onClick={() => file.current?.click()}
      >
        {preview ? <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="muted">Нажмите, чтобы выбрать изображение (1226×608)</span>}
      </div>
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => setUpload(e.target.files?.[0] ?? null)} />
      {f.translations.map((t) => (
        <div className="grid2" key={t.lang}>
          <Field label={`Заголовок ${t.lang.toUpperCase()}`}>
            <Input value={t.title} onChange={(e) => setTr(t.lang, { title: e.target.value })} />
          </Field>
          <Field label={`Подзаголовок ${t.lang.toUpperCase()}`}>
            <Input value={t.subtitle} onChange={(e) => setTr(t.lang, { subtitle: e.target.value })} />
          </Field>
        </div>
      ))}
      <Field label="Ссылка" hint="Куда ведёт баннер, например /catalog/builds">
        <Input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} />
      </Field>
      <Check checked={f.enabled} onChange={(v) => setF({ ...f, enabled: v })}>
        Показывать на сайте
      </Check>
      <ErrorBox error={error} />
      <div className="form-actions">
        {banner && (
          <Button variant="danger" onClick={remove} disabled={busy}>
            Удалить
          </Button>
        )}
        <Button onClick={save} disabled={busy}>
          {busy ? "Сохраняем…" : "Сохранить"}
        </Button>
      </div>
    </Modal>
  );
}
