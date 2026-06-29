"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ICONS, type Lang } from "@/lib/content";
import Icon from "@/components/Icon";
import { api, type AdminService, type AdminTranslation } from "@/lib/admin-api";
import { useToast } from "../../_components/useToast";

const LANGS: Lang[] = ["ru", "tk", "en"];
const LANG_LABEL: Record<string, string> = { ru: "Русский", tk: "Türkmençe", en: "English" };
const ICON_KEYS = Object.keys(ICONS);

export default function ServiceEdit() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { show, node } = useToast();
  const [svc, setSvc] = useState<AdminService | null>(null);
  const [lang, setLang] = useState<Lang>("ru");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getService(Number(id)).then(setSvc).catch((e) => show(String(e), "err"));
  }, [id, show]);

  if (!svc) return <div className="adm-loading">Загрузка…</div>;

  const tr = (l: Lang): AdminTranslation =>
    svc.translations.find((t) => t.lang === l) ?? { lang: l, code: "", short: "", title: "", body: "", feats: [] };

  function patchTr(l: Lang, field: keyof AdminTranslation, value: unknown) {
    setSvc((s) => {
      if (!s) return s;
      const exists = s.translations.some((t) => t.lang === l);
      const translations = exists
        ? s.translations.map((t) => (t.lang === l ? { ...t, [field]: value } : t))
        : [...s.translations, { ...tr(l), [field]: value }];
      return { ...s, translations };
    });
  }

  async function save() {
    if (!svc) return;
    setBusy(true);
    try {
      await api.updateService(svc.id, {
        slug: svc.slug, icon: svc.icon, enabled: svc.enabled,
        translations: LANGS.map((l) => tr(l)),
      });
      show("Сохранено");
    } catch (e) { show(String(e), "err"); }
    finally { setBusy(false); }
  }

  const t = tr(lang);

  return (
    <>
      <h1 className="adm-h1">Услуга: {tr("ru").title || svc.slug}</h1>
      <p className="adm-sub">
        <button className="adm-btn ghost sm" onClick={() => router.push("/admin/services")}>← К списку</button>
      </p>

      <div className="adm-block">
        <h3>Общее</h3>
        <div className="adm-field">
          <label>slug</label>
          <input className="adm-in" value={svc.slug} onChange={(e) => setSvc({ ...svc, slug: e.target.value })} />
        </div>
        <div className="adm-field">
          <label>Иконка</label>
          <div className="icon-pick">
            {ICON_KEYS.map((k) => (
              <button key={k} className={svc.icon === k ? "on" : ""} title={k}
                onClick={() => setSvc({ ...svc, icon: k })}>
                <Icon name={k} />
              </button>
            ))}
          </div>
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--mono)", fontSize: 13 }}>
          <input type="checkbox" checked={svc.enabled} onChange={(e) => setSvc({ ...svc, enabled: e.target.checked })} />
          Показывать на сайте
        </label>
      </div>

      <div className="adm-tabs">
        {LANGS.map((l) => (
          <button key={l} className={l === lang ? "on" : ""} onClick={() => setLang(l)}>{LANG_LABEL[l]}</button>
        ))}
      </div>

      <div className="adm-block">
        <h3>Перевод — {LANG_LABEL[lang]}</h3>
        <div className="adm-field"><label>Код (бейдж)</label>
          <input className="adm-in" value={t.code} onChange={(e) => patchTr(lang, "code", e.target.value)} /></div>
        <div className="adm-field"><label>Короткое название</label>
          <input className="adm-in" value={t.short} onChange={(e) => patchTr(lang, "short", e.target.value)} /></div>
        <div className="adm-field"><label>Заголовок</label>
          <input className="adm-in" value={t.title} onChange={(e) => patchTr(lang, "title", e.target.value)} /></div>
        <div className="adm-field"><label>Описание</label>
          <textarea className="adm-in" rows={4} value={t.body} onChange={(e) => patchTr(lang, "body", e.target.value)} /></div>
        <div className="adm-field"><label>Особенности (по одной на строку)</label>
          <textarea className="adm-in" rows={5} value={t.feats.join("\n")}
            onChange={(e) => patchTr(lang, "feats", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))} /></div>
      </div>

      <div className="adm-actions">
        <button className="adm-btn" onClick={save} disabled={busy}>{busy ? "Сохранение…" : "Сохранить"}</button>
      </div>
      {node}
    </>
  );
}
