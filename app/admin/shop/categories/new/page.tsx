"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type AdminCategory } from "@/lib/admin-api";
import { slugify } from "@/lib/slug";
import { useToast } from "../../../_components/useToast";

const LANGS = ["ru", "tk", "en"] as const;
const LANG_LABEL: Record<string, string> = { ru: "Русский", tk: "Türkmençe", en: "English" };

export default function CategoryCreate() {
  const router = useRouter();
  const { show, node } = useToast();
  const [names, setNames] = useState<Record<string, string>>({ ru: "", tk: "", en: "" });
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<number | "">("");
  const [enabled, setEnabled] = useState(true);
  const [allCats, setAllCats] = useState<AdminCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { api.getCategories().then(setAllCats).catch(() => {}); }, []);

  async function create() {
    setErr("");
    if (!names.ru.trim()) { setErr("Укажите название (Русский)"); return; }
    const finalSlug = slug.trim() || slugify(names.ru);
    if (!finalSlug) { setErr("Не удалось сформировать slug — задайте вручную"); return; }
    setBusy(true);
    try {
      const cat = await api.createCategory({
        slug: finalSlug, enabled, parent_id: parentId === "" ? null : Number(parentId),
        translations: LANGS.map((lang) => ({ lang, name: names[lang] || names.ru })),
      });
      show("Категория создана");
      router.push(`/admin/shop/categories/${(cat as AdminCategory).id}`);
    } catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  }

  return (
    <>
      <h1 className="adm-h1">Новая категория</h1>
      <p className="adm-sub">
        <button className="adm-btn ghost sm" onClick={() => router.push("/admin/shop/categories")}>← К списку</button>
        {" "}Заполните названия по языкам. Slug сформируется автоматически.
      </p>

      <div className="adm-block">
        <h3>Общее</h3>
        <div className="adm-field"><label>Родительская категория</label>
          <select className="adm-in" value={parentId} onChange={(e) => setParentId(e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">— нет (верхний уровень) —</option>
            {allCats.map((o) => <option key={o.id} value={o.id}>{o.translations.find((t) => t.lang === "ru")?.name || o.slug}</option>)}
          </select></div>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--mono)", fontSize: 13 }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Показывать на сайте
        </label>
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12, color: "var(--tx3)" }}>Дополнительно</summary>
          <div className="adm-field" style={{ marginTop: 10 }}><label>slug (адрес, авто из названия)</label>
            <input className="adm-in" value={slug} placeholder={slugify(names.ru) || "напр. computers"} onChange={(e) => setSlug(e.target.value)} /></div>
        </details>
      </div>

      <div className="adm-block">
        <h3>Названия</h3>
        {LANGS.map((l) => (
          <div className="adm-field" key={l}><label>Название — {LANG_LABEL[l]}</label>
            <input className="adm-in" value={names[l]} onChange={(e) => setNames({ ...names, [l]: e.target.value })} /></div>
        ))}
      </div>

      {err && <p style={{ color: "#ff9a9a", fontSize: 13 }}>{err}</p>}
      <div className="adm-actions">
        <button className="adm-btn" onClick={create} disabled={busy}>{busy ? "Создание…" : "Создать категорию"}</button>
      </div>
      {node}
    </>
  );
}
