"use client";
import { useEffect, useState } from "react";
import { api, type AdminAttribute, type AdminCategory, type AdminProductTr, type ProductSpec } from "@/lib/admin-api";
import { slugify } from "@/lib/slug";

const LANGS = ["ru", "tk", "en"] as const;
const LANG_LABEL: Record<string, string> = { ru: "Русский", tk: "Türkmençe", en: "English" };

export interface ProductFormValue {
  slug: string;
  category_id: number;
  price: number;
  old_price: number | null;
  currency: string;
  in_stock: boolean;
  stock_qty: number | null;
  sku: string;
  enabled: boolean;
  translations: AdminProductTr[];
  attributes: { attribute_id: number; value: string; num_value: number | null }[];
}

export function blankProduct(category_id = 0): ProductFormValue {
  return {
    slug: "", category_id, price: 0, old_price: null, currency: "TMT", in_stock: true, stock_qty: null, sku: "", enabled: true,
    translations: LANGS.map((lang) => ({ lang, title: "", short: "", body: "", specs: [] })),
    attributes: [],
  };
}

function specsToText(specs: ProductSpec[]): string {
  return specs.map((s) => `${s.label}: ${s.value}`).join("\n");
}
function textToSpecs(text: string): ProductSpec[] {
  return text.split("\n").map((line) => {
    const i = line.indexOf(":");
    if (i < 0) return null;
    const label = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    return label ? { label, value } : null;
  }).filter(Boolean) as ProductSpec[];
}

/** Shared product create/edit form. The slug is auto-derived from the RU title
 *  when left blank, and tucked into an "Дополнительно" expander. */
export default function ProductForm({
  initial, categories, submitLabel, onSubmit,
}: {
  initial: ProductFormValue;
  categories: AdminCategory[];
  submitLabel: string;
  onSubmit: (payload: ProductFormValue) => Promise<void>;
}) {
  const [v, setV] = useState<ProductFormValue>(initial);
  const [attrs, setAttrs] = useState<AdminAttribute[]>([]);
  const [attrVals, setAttrVals] = useState<Record<number, string>>(
    () => Object.fromEntries(initial.attributes.map((a) => [a.attribute_id, a.value]))
  );
  const [lang, setLang] = useState<(typeof LANGS)[number]>("ru");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // inline "new characteristic" mini-form (creates a category attribute on the fly)
  const [naLabel, setNaLabel] = useState("");
  const [naType, setNaType] = useState<"select" | "number">("select");
  const [naUnit, setNaUnit] = useState("");
  const [naBusy, setNaBusy] = useState(false);

  const loadAttrs = (catId: number) =>
    catId ? api.getAttributes(catId).then(setAttrs).catch(() => setAttrs([])) : setAttrs([]);

  useEffect(() => {
    loadAttrs(v.category_id);
  }, [v.category_id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addAttribute() {
    if (!v.category_id) { setErr("Сначала выберите категорию"); return; }
    if (!naLabel.trim()) { setErr("Укажите название характеристики"); return; }
    setErr("");
    setNaBusy(true);
    try {
      const key = slugify(naLabel).replace(/-/g, "_");
      await api.createAttribute(v.category_id, {
        key: key || `attr_${Date.now()}`, type: naType, unit: naUnit.trim(), filterable: true,
        translations: LANGS.map((l) => ({ lang: l, label: naLabel.trim() })),
      });
      setNaLabel(""); setNaUnit(""); setNaType("select");
      await loadAttrs(v.category_id);
    } catch (e) { setErr(String(e)); }
    finally { setNaBusy(false); }
  }

  const tr = (l: string): AdminProductTr =>
    v.translations.find((t) => t.lang === l) ?? { lang: l, title: "", short: "", body: "", specs: [] };

  function patchTr(l: string, field: keyof AdminProductTr, value: unknown) {
    setV((cur) => {
      const exists = cur.translations.some((t) => t.lang === l);
      const translations = exists
        ? cur.translations.map((t) => (t.lang === l ? { ...t, [field]: value } : t))
        : [...cur.translations, { ...tr(l), [field]: value }];
      return { ...cur, translations };
    });
  }

  async function submit() {
    setErr("");
    const ruTitle = tr("ru").title.trim();
    if (!ruTitle) { setErr("Укажите название (Русский)"); return; }
    if (!v.category_id) { setErr("Выберите категорию"); return; }
    const slug = v.slug.trim() || slugify(ruTitle);
    if (!slug) { setErr("Не удалось сформировать slug — задайте его вручную в «Дополнительно»"); return; }
    const attributes = attrs
      .filter((a) => (attrVals[a.id] ?? "").trim() !== "")
      .map((a) => {
        const value = attrVals[a.id].trim();
        const num = a.type === "number" ? Number.parseFloat(value) : NaN;
        return { attribute_id: a.id, value, num_value: Number.isNaN(num) ? null : num };
      });
    setBusy(true);
    try {
      await onSubmit({ ...v, slug, translations: LANGS.map((l) => tr(l)), attributes });
    } catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  }

  const t = tr(lang);

  return (
    <>
      <div className="adm-block">
        <h3>Общее</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="adm-field"><label>Категория</label>
            <select className="adm-in" value={v.category_id} onChange={(e) => setV({ ...v, category_id: Number(e.target.value) })}>
              <option value={0}>— выберите —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.translations.find((x) => x.lang === "ru")?.name || c.slug}</option>)}
            </select></div>
          <div className="adm-field"><label>Цена</label>
            <input className="adm-in" type="number" value={v.price} onChange={(e) => setV({ ...v, price: Number(e.target.value) })} /></div>
          <div className="adm-field"><label>Старая цена (для скидки, пусто = нет)</label>
            <input className="adm-in" type="number" value={v.old_price ?? ""} placeholder="—"
              onChange={(e) => setV({ ...v, old_price: e.target.value === "" ? null : Number(e.target.value) })} /></div>
          <div className="adm-field"><label>Валюта</label>
            <input className="adm-in" value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })} /></div>
          <div className="adm-field"><label>Артикул (SKU)</label>
            <input className="adm-in" value={v.sku} onChange={(e) => setV({ ...v, sku: e.target.value })} /></div>
          <div className="adm-field"><label>Остаток, шт (пусто = не отслеживать)</label>
            <input className="adm-in" type="number" value={v.stock_qty ?? ""} placeholder="—"
              onChange={(e) => setV({ ...v, stock_qty: e.target.value === "" ? null : Number(e.target.value) })} /></div>
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--mono)", fontSize: 13 }}>
          <input type="checkbox" checked={v.in_stock} onChange={(e) => setV({ ...v, in_stock: e.target.checked })} />
          В наличии (иначе «под заказ»)
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--mono)", fontSize: 13 }}>
          <input type="checkbox" checked={v.enabled} onChange={(e) => setV({ ...v, enabled: e.target.checked })} />
          Показывать на сайте
        </label>
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12, color: "var(--tx3)" }}>Дополнительно</summary>
          <div className="adm-field" style={{ marginTop: 10 }}><label>slug (адрес, авто из названия)</label>
            <input className="adm-in" value={v.slug} placeholder={slugify(tr("ru").title) || "напр. lenovo-v15"} onChange={(e) => setV({ ...v, slug: e.target.value })} /></div>
        </details>
      </div>

      <div className="adm-block">
        <h3>Характеристики (для фильтра)</h3>
        {!v.category_id ? (
          <p style={{ color: "var(--tx3)", fontSize: 13, margin: 0 }}>Сначала выберите категорию — характеристики привязаны к ней.</p>
        ) : (
          <>
            {attrs.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {attrs.map((a) => (
                  <div className="adm-field" key={a.id}>
                    <label>{a.translations.find((x) => x.lang === "ru")?.label || a.key}{a.unit ? `, ${a.unit}` : ""}{a.type === "number" ? " (число)" : ""}</label>
                    <input className="adm-in" value={attrVals[a.id] ?? ""} onChange={(e) => setAttrVals({ ...attrVals, [a.id]: e.target.value })} />
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: attrs.length > 0 ? 14 : 0, padding: 12, border: "1px dashed var(--line)", borderRadius: 8 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--tx3)", marginBottom: 8 }}>
                {attrs.length === 0 ? "У категории пока нет характеристик — добавьте первую:" : "Добавить новую характеристику категории:"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
                <div className="adm-field"><label>Название (RU)</label>
                  <input className="adm-in" value={naLabel} placeholder="напр. Диагональ" onChange={(e) => setNaLabel(e.target.value)} /></div>
                <div className="adm-field"><label>Тип</label>
                  <select className="adm-in" value={naType} onChange={(e) => setNaType(e.target.value as "select" | "number")}>
                    <option value="select">Выбор значений</option>
                    <option value="number">Число (диапазон)</option>
                  </select></div>
                <div className="adm-field"><label>Ед. изм.</label>
                  <input className="adm-in" value={naUnit} placeholder="дюйм, ГБ…" onChange={(e) => setNaUnit(e.target.value)} /></div>
                <button className="adm-btn sm" onClick={addAttribute} disabled={naBusy} style={{ marginBottom: 6 }}>
                  {naBusy ? "…" : "+ Добавить"}
                </button>
              </div>
              <p style={{ fontSize: 11, color: "var(--tx3)", margin: "6px 0 0" }}>
                Характеристика появится у всех товаров этой категории и в фильтрах магазина. Названия для других языков можно уточнить в разделе категории.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="adm-tabs">
        {LANGS.map((l) => (
          <button key={l} className={l === lang ? "on" : ""} onClick={() => setLang(l)}>{LANG_LABEL[l]}</button>
        ))}
      </div>

      <div className="adm-block">
        <h3>Перевод — {LANG_LABEL[lang]}</h3>
        <div className="adm-field"><label>Название</label>
          <input className="adm-in" value={t.title} onChange={(e) => patchTr(lang, "title", e.target.value)} /></div>
        <div className="adm-field"><label>Краткое описание</label>
          <input className="adm-in" value={t.short} onChange={(e) => patchTr(lang, "short", e.target.value)} /></div>
        <div className="adm-field"><label>Описание</label>
          <textarea className="adm-in" rows={4} value={t.body} onChange={(e) => patchTr(lang, "body", e.target.value)} /></div>
        <div className="adm-field"><label>Спецификации (по строке «название: значение»)</label>
          <textarea className="adm-in" rows={5} value={specsToText(t.specs)} onChange={(e) => patchTr(lang, "specs", textToSpecs(e.target.value))} /></div>
      </div>

      {err && <p style={{ color: "#ff9a9a", fontSize: 13 }}>{err}</p>}
      <div className="adm-actions">
        <button className="adm-btn" onClick={submit} disabled={busy}>{busy ? "Сохранение…" : submitLabel}</button>
      </div>
    </>
  );
}
