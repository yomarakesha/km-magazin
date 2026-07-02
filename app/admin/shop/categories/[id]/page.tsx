"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, type AdminCategory, type AdminCategoryTr } from "@/lib/admin-api";
import { useToast } from "../../../_components/useToast";

const LANGS = ["ru", "tk", "en"] as const;
const LANG_LABEL: Record<string, string> = { ru: "Русский", tk: "Türkmençe", en: "English" };

export default function CategoryEdit() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { show, node } = useToast();
  const [cat, setCat] = useState<AdminCategory | null>(null);
  const [allCats, setAllCats] = useState<AdminCategory[]>([]);
  const [lang, setLang] = useState<(typeof LANGS)[number]>("ru");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getCategory(Number(id)).then(setCat).catch((e) => show(String(e), "err"));
    api.getCategories().then(setAllCats).catch(() => {});
  }, [id, show]);

  if (!cat) return <div className="adm-loading">Загрузка…</div>;

  const tr = (l: string): AdminCategoryTr =>
    cat.translations.find((t) => t.lang === l) ?? { lang: l, name: "" };

  function patchTr(l: string, value: string) {
    setCat((c) => {
      if (!c) return c;
      const exists = c.translations.some((t) => t.lang === l);
      const translations = exists
        ? c.translations.map((t) => (t.lang === l ? { ...t, name: value } : t))
        : [...c.translations, { lang: l, name: value }];
      return { ...c, translations };
    });
  }

  async function save() {
    if (!cat) return;
    setBusy(true);
    try {
      await api.updateCategory(cat.id, {
        slug: cat.slug, enabled: cat.enabled, parent_id: cat.parent_id,
        translations: LANGS.map((l) => tr(l)),
      });
      show("Сохранено");
    } catch (e) { show(String(e), "err"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <h1 className="adm-h1">Категория: {tr("ru").name || cat.slug}</h1>
      <p className="adm-sub">
        <button className="adm-btn ghost sm" onClick={() => router.push("/admin/shop/categories")}>← К списку</button>
        {" "}
        <Link className="adm-btn ghost sm" href={`/admin/shop/categories/${cat.id}/attributes`}>Фильтры категории</Link>
      </p>

      <div className="adm-block">
        <h3>Общее</h3>
        <div className="adm-field">
          <label>Родительская категория</label>
          <select
            className="adm-in"
            value={cat.parent_id ?? ""}
            onChange={(e) => setCat({ ...cat, parent_id: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">— нет (верхний уровень) —</option>
            {allCats.filter((o) => o.id !== cat.id).map((o) => (
              <option key={o.id} value={o.id}>
                {o.translations.find((t) => t.lang === "ru")?.name || o.slug}
              </option>
            ))}
          </select>
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--mono)", fontSize: 13 }}>
          <input type="checkbox" checked={cat.enabled} onChange={(e) => setCat({ ...cat, enabled: e.target.checked })} />
          Показывать на сайте
        </label>
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12, color: "var(--tx3)" }}>Дополнительно</summary>
          <div className="adm-field" style={{ marginTop: 10 }}>
            <label>slug (адрес)</label>
            <input className="adm-in" value={cat.slug} onChange={(e) => setCat({ ...cat, slug: e.target.value })} />
          </div>
        </details>
      </div>

      <div className="adm-tabs">
        {LANGS.map((l) => (
          <button key={l} className={l === lang ? "on" : ""} onClick={() => setLang(l)}>{LANG_LABEL[l]}</button>
        ))}
      </div>

      <div className="adm-block">
        <h3>Название — {LANG_LABEL[lang]}</h3>
        <div className="adm-field"><label>Название категории</label>
          <input className="adm-in" value={tr(lang).name} onChange={(e) => patchTr(lang, e.target.value)} /></div>
      </div>

      <div className="adm-actions">
        <button className="adm-btn" onClick={save} disabled={busy}>{busy ? "Сохранение…" : "Сохранить"}</button>
      </div>
      {node}
    </>
  );
}
