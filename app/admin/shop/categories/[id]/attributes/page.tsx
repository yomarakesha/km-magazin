"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type AdminAttribute, type AdminAttributeTr } from "@/lib/admin-api";
import { slugify } from "@/lib/slug";
import { useToast } from "../../../../_components/useToast";

const LANGS = ["ru", "tk", "en"] as const;
const LANG_LABEL: Record<string, string> = { ru: "RU", tk: "TK", en: "EN" };

type NewAttr = { key: string; type: "select" | "number"; unit: string; filterable: boolean; labels: Record<string, string> };
const emptyNew: NewAttr = { key: "", type: "select", unit: "", filterable: true, labels: { ru: "", tk: "", en: "" } };

export default function AttributesPage() {
  const { id } = useParams<{ id: string }>();
  const catId = Number(id);
  const router = useRouter();
  const { show, node } = useToast();
  const [list, setList] = useState<AdminAttribute[]>([]);
  const [nw, setNw] = useState<NewAttr>(emptyNew);

  const load = () => api.getAttributes(catId).then(setList).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setLocal(aid: number, patch: Partial<AdminAttribute>) {
    setList((l) => l.map((a) => (a.id === aid ? { ...a, ...patch } : a)));
  }
  function patchLabel(aid: number, lang: string, label: string) {
    setList((l) => l.map((a) => {
      if (a.id !== aid) return a;
      const exists = a.translations.some((t) => t.lang === lang);
      const translations = exists
        ? a.translations.map((t) => (t.lang === lang ? { ...t, label } : t))
        : [...a.translations, { lang, label }];
      return { ...a, translations };
    }));
  }
  const lbl = (a: AdminAttribute, lang: string): AdminAttributeTr =>
    a.translations.find((t) => t.lang === lang) ?? { lang, label: "" };

  async function add() {
    if (!nw.labels.ru.trim()) return show("Укажите название (RU)", "err");
    const key = (nw.key.trim() || slugify(nw.labels.ru)).replace(/-/g, "_");
    if (!key) return show("Не удалось сформировать ключ — задайте вручную", "err");
    try {
      await api.createAttribute(catId, {
        key, type: nw.type, unit: nw.unit.trim(), filterable: nw.filterable,
        translations: LANGS.map((lang) => ({ lang, label: nw.labels[lang] || nw.labels.ru })),
      });
      setNw(emptyNew);
      show("Добавлено");
      load();
    } catch (e) { show(String(e), "err"); }
  }

  async function save(a: AdminAttribute) {
    await api.updateAttribute(a.id, {
      key: a.key, type: a.type, unit: a.unit, filterable: a.filterable,
      translations: LANGS.map((l) => lbl(a, l)),
    }).then(() => show("Сохранено")).catch((e) => show(String(e), "err"));
  }

  async function remove(a: AdminAttribute) {
    if (!confirm(`Удалить характеристику «${a.key}»?`)) return;
    await api.deleteAttribute(a.id).catch((e) => show(String(e), "err"));
    load();
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((a) => a.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    await api.reorderAttributes(catId, ids).catch((e) => show(String(e), "err"));
  }

  return (
    <>
      <h1 className="adm-h1">Фильтры категории</h1>
      <p className="adm-sub">
        <button className="adm-btn ghost sm" onClick={() => router.push("/admin/shop/categories")}>← К категориям</button>
        {" "}Характеристики, по которым покупатель сможет фильтровать товары (RAM, видеокарта…).
      </p>

      {list.map((a, i) => (
        <div className="adm-block" key={a.id}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <div className="ord">
              <button onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
              <button onClick={() => move(i, 1)} disabled={i === list.length - 1}>▼</button>
            </div>
            <h3 style={{ margin: 0 }}>{a.key}</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div className="adm-field"><label>Ключ</label>
              <input className="adm-in" value={a.key} onChange={(e) => setLocal(a.id, { key: e.target.value })} /></div>
            <div className="adm-field"><label>Тип</label>
              <select className="adm-in" value={a.type} onChange={(e) => setLocal(a.id, { type: e.target.value as "select" | "number" })}>
                <option value="select">Выбор значений</option>
                <option value="number">Число (диапазон)</option>
              </select></div>
            <div className="adm-field"><label>Ед. изм. (GB, GHz…)</label>
              <input className="adm-in" value={a.unit} onChange={(e) => setLocal(a.id, { unit: e.target.value })} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {LANGS.map((l) => (
              <div className="adm-field" key={l}><label>Название {LANG_LABEL[l]}</label>
                <input className="adm-in" value={lbl(a, l).label} onChange={(e) => patchLabel(a.id, l, e.target.value)} /></div>
            ))}
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--mono)", fontSize: 13 }}>
            <input type="checkbox" checked={a.filterable} onChange={(e) => setLocal(a.id, { filterable: e.target.checked })} />
            Показывать в фильтре
          </label>
          <div className="adm-actions" style={{ marginTop: 10 }}>
            <button className="adm-btn sm" onClick={() => save(a)}>Сохранить</button>
            <button className="adm-btn danger sm" onClick={() => remove(a)}>Удалить</button>
          </div>
        </div>
      ))}

      <div className="adm-block" style={{ borderStyle: "dashed" }}>
        <h3>Новая характеристика</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div className="adm-field"><label>Название RU</label>
            <input className="adm-in" value={nw.labels.ru} onChange={(e) => setNw({ ...nw, labels: { ...nw.labels, ru: e.target.value } })} placeholder="напр. Оперативная память" /></div>
          <div className="adm-field"><label>Тип</label>
            <select className="adm-in" value={nw.type} onChange={(e) => setNw({ ...nw, type: e.target.value as "select" | "number" })}>
              <option value="select">Выбор значений</option>
              <option value="number">Число (диапазон)</option>
            </select></div>
          <div className="adm-field"><label>Ед. изм. (GB, GHz…)</label>
            <input className="adm-in" value={nw.unit} onChange={(e) => setNw({ ...nw, unit: e.target.value })} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="adm-field"><label>Название TK</label>
            <input className="adm-in" value={nw.labels.tk} onChange={(e) => setNw({ ...nw, labels: { ...nw.labels, tk: e.target.value } })} /></div>
          <div className="adm-field"><label>Название EN</label>
            <input className="adm-in" value={nw.labels.en} onChange={(e) => setNw({ ...nw, labels: { ...nw.labels, en: e.target.value } })} /></div>
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--mono)", fontSize: 13 }}>
          <input type="checkbox" checked={nw.filterable} onChange={(e) => setNw({ ...nw, filterable: e.target.checked })} />
          Показывать в фильтре
        </label>
        <details style={{ marginTop: 6 }}>
          <summary style={{ cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12, color: "var(--tx3)" }}>Дополнительно</summary>
          <div className="adm-field" style={{ marginTop: 10 }}><label>Ключ (авто из названия)</label>
            <input className="adm-in" value={nw.key} placeholder={slugify(nw.labels.ru).replace(/-/g, "_") || "напр. ram"} onChange={(e) => setNw({ ...nw, key: e.target.value })} /></div>
        </details>
        <div className="adm-actions" style={{ marginTop: 10 }}>
          <button className="adm-btn" onClick={add}>+ Добавить характеристику</button>
        </div>
      </div>
      {node}
    </>
  );
}
