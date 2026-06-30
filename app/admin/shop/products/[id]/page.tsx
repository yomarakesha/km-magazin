"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  api,
  type AdminAttribute,
  type AdminCategory,
  type AdminProduct,
  type AdminProductTr,
  type ProductSpec,
} from "@/lib/admin-api";
import { useToast } from "../../../_components/useToast";

const LANGS = ["ru", "tk", "en"] as const;
const LANG_LABEL: Record<string, string> = { ru: "Русский", tk: "Türkmençe", en: "English" };

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

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { show, node } = useToast();
  const [p, setP] = useState<AdminProduct | null>(null);
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [attrs, setAttrs] = useState<AdminAttribute[]>([]);
  const [attrVals, setAttrVals] = useState<Record<number, string>>({});
  const [lang, setLang] = useState<(typeof LANGS)[number]>("ru");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getProduct(Number(id)).then((prod) => {
      setP(prod);
      const m: Record<number, string> = {};
      for (const a of prod.attributes) m[a.attribute_id] = a.value;
      setAttrVals(m);
    }).catch((e) => show(String(e), "err"));
    api.getCategories().then(setCats).catch((e) => show(String(e), "err"));
  }, [id, show]);

  // load attributes whenever the product's category changes
  useEffect(() => {
    if (!p) return;
    api.getAttributes(p.category_id).then(setAttrs).catch(() => setAttrs([]));
  }, [p?.category_id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return <div className="adm-loading">Загрузка…</div>;

  const tr = (l: string): AdminProductTr =>
    p.translations.find((t) => t.lang === l) ?? { lang: l, title: "", short: "", body: "", specs: [] };

  function patchTr(l: string, field: keyof AdminProductTr, value: unknown) {
    setP((prod) => {
      if (!prod) return prod;
      const exists = prod.translations.some((t) => t.lang === l);
      const translations = exists
        ? prod.translations.map((t) => (t.lang === l ? { ...t, [field]: value } : t))
        : [...prod.translations, { ...tr(l), [field]: value }];
      return { ...prod, translations };
    });
  }

  async function save() {
    if (!p) return;
    setBusy(true);
    try {
      const attributes = attrs
        .filter((a) => (attrVals[a.id] ?? "").trim() !== "")
        .map((a) => {
          const value = attrVals[a.id].trim();
          const num = a.type === "number" ? Number.parseFloat(value) : NaN;
          return { attribute_id: a.id, value, num_value: Number.isNaN(num) ? null : num };
        });
      await api.updateProduct(p.id, {
        slug: p.slug, category_id: p.category_id, price: p.price, currency: p.currency,
        in_stock: p.in_stock, sku: p.sku, enabled: p.enabled,
        translations: LANGS.map((l) => tr(l)),
        attributes,
      });
      show("Сохранено");
    } catch (e) { show(String(e), "err"); }
    finally { setBusy(false); }
  }

  const t = tr(lang);

  return (
    <>
      <h1 className="adm-h1">Товар: {tr("ru").title || p.slug}</h1>
      <p className="adm-sub">
        <button className="adm-btn ghost sm" onClick={() => router.push("/admin/shop/products")}>← К списку</button>
        {" "}
        <Link className="adm-btn ghost sm" href={`/admin/shop/products/${p.id}/images`}>Фото товара</Link>
      </p>

      <div className="adm-block">
        <h3>Общее</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="adm-field"><label>slug</label>
            <input className="adm-in" value={p.slug} onChange={(e) => setP({ ...p, slug: e.target.value })} /></div>
          <div className="adm-field"><label>Категория</label>
            <select className="adm-in" value={p.category_id} onChange={(e) => setP({ ...p, category_id: Number(e.target.value) })}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.translations.find((x) => x.lang === "ru")?.name || c.slug}</option>)}
            </select></div>
          <div className="adm-field"><label>Цена</label>
            <input className="adm-in" type="number" value={p.price} onChange={(e) => setP({ ...p, price: Number(e.target.value) })} /></div>
          <div className="adm-field"><label>Валюта</label>
            <input className="adm-in" value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value })} /></div>
          <div className="adm-field"><label>Артикул (SKU)</label>
            <input className="adm-in" value={p.sku} onChange={(e) => setP({ ...p, sku: e.target.value })} /></div>
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--mono)", fontSize: 13 }}>
          <input type="checkbox" checked={p.in_stock} onChange={(e) => setP({ ...p, in_stock: e.target.checked })} />
          В наличии (иначе «под заказ»)
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--mono)", fontSize: 13 }}>
          <input type="checkbox" checked={p.enabled} onChange={(e) => setP({ ...p, enabled: e.target.checked })} />
          Показывать на сайте
        </label>
      </div>

      {attrs.length > 0 && (
        <div className="adm-block">
          <h3>Характеристики (для фильтра)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {attrs.map((a) => (
              <div className="adm-field" key={a.id}>
                <label>{a.translations.find((x) => x.lang === "ru")?.label || a.key}{a.unit ? `, ${a.unit}` : ""}{a.type === "number" ? " (число)" : ""}</label>
                <input className="adm-in" value={attrVals[a.id] ?? ""}
                  onChange={(e) => setAttrVals({ ...attrVals, [a.id]: e.target.value })} />
              </div>
            ))}
          </div>
        </div>
      )}

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
          <textarea className="adm-in" rows={5} value={specsToText(t.specs)}
            onChange={(e) => patchTr(lang, "specs", textToSpecs(e.target.value))} /></div>
      </div>

      <div className="adm-actions">
        <button className="adm-btn" onClick={save} disabled={busy}>{busy ? "Сохранение…" : "Сохранить"}</button>
      </div>
      {node}
    </>
  );
}
