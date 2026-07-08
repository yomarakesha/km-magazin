"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type AdminShopService, type AdminShopServiceTr } from "@/lib/admin-api";
import { slugify } from "@/lib/slug";
import { useToast } from "../../../../_components/useToast";
import { useConfirm } from "../../../../_components/useConfirm";

const LANGS = ["ru", "tk", "en"] as const;
const LANG_LABEL: Record<string, string> = { ru: "RU", tk: "TK", en: "EN" };
const ICONS = ["wrench", "settings", "refresh", "shield", "truck", "box"];

type NewSvc = { slug: string; price: number; icon: string; enabled: boolean; titles: Record<string, string>; shorts: Record<string, string> };
const emptyNew: NewSvc = { slug: "", price: 0, icon: "wrench", enabled: true, titles: { ru: "", tk: "", en: "" }, shorts: { ru: "", tk: "", en: "" } };

export default function ShopServicesPage() {
  const { id } = useParams<{ id: string }>();
  const catId = Number(id);
  const router = useRouter();
  const { show, node } = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const [list, setList] = useState<AdminShopService[]>([]);
  const [nw, setNw] = useState<NewSvc>(emptyNew);

  const load = () => api.getShopServices(catId).then(setList).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setLocal(sid: number, patch: Partial<AdminShopService>) {
    setList((l) => l.map((s) => (s.id === sid ? { ...s, ...patch } : s)));
  }
  function patchTr(sid: number, lang: string, patch: Partial<AdminShopServiceTr>) {
    setList((l) => l.map((s) => {
      if (s.id !== sid) return s;
      const exists = s.translations.some((t) => t.lang === lang);
      const translations = exists
        ? s.translations.map((t) => (t.lang === lang ? { ...t, ...patch } : t))
        : [...s.translations, { lang, title: "", short: "", ...patch }];
      return { ...s, translations };
    }));
  }
  const tr = (s: AdminShopService, lang: string): AdminShopServiceTr =>
    s.translations.find((t) => t.lang === lang) ?? { lang, title: "", short: "" };

  async function add() {
    if (!nw.titles.ru.trim()) return show("Укажите название (RU)", "err");
    const slug = nw.slug.trim() || slugify(nw.titles.ru);
    if (!slug) return show("Не удалось сформировать slug — задайте вручную", "err");
    try {
      await api.createShopService(catId, {
        slug, price: Number(nw.price) || 0, currency: "TMT", icon: nw.icon, enabled: nw.enabled,
        translations: LANGS.map((lang) => ({ lang, title: nw.titles[lang] || nw.titles.ru, short: nw.shorts[lang] || "" })),
      });
      setNw(emptyNew);
      show("Добавлено");
      load();
    } catch (e) { show(String(e), "err"); }
  }

  async function save(s: AdminShopService) {
    await api.updateShopService(s.id, {
      slug: s.slug, price: Number(s.price) || 0, currency: s.currency || "TMT",
      icon: s.icon, enabled: s.enabled,
      translations: LANGS.map((l) => tr(s, l)),
    }).then(() => show("Сохранено")).catch((e) => show(String(e), "err"));
  }

  async function remove(s: AdminShopService) {
    if (!(await ask(`Удалить услугу «${s.slug}»?`))) return;
    await api.deleteShopService(s.id).catch((e) => show(String(e), "err"));
    load();
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((s) => s.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    await api.reorderShopServices(catId, ids).catch((e) => show(String(e), "err"));
  }

  return (
    <>
      <h1 className="adm-h1">Услуги категории</h1>
      <p className="adm-sub">
        <button className="adm-btn ghost sm" onClick={() => router.push("/admin/shop/categories")}>← К категориям</button>
        {" "}Платные услуги, которые покупатель может добавить в корзину (монтаж, настройка, ремонт…).
      </p>

      {list.map((s, i) => (
        <div className="adm-block" key={s.id}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <div className="ord">
              <button onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
              <button onClick={() => move(i, 1)} disabled={i === list.length - 1}>▼</button>
            </div>
            <h3 style={{ margin: 0 }}>{tr(s, "ru").title || s.slug}</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div className="adm-field"><label>Слаг</label>
              <input className="adm-in" value={s.slug} onChange={(e) => setLocal(s.id, { slug: e.target.value })} /></div>
            <div className="adm-field"><label>Цена (TMT)</label>
              <input className="adm-in" type="number" value={s.price} onChange={(e) => setLocal(s.id, { price: Number(e.target.value) })} /></div>
            <div className="adm-field"><label>Иконка</label>
              <select className="adm-in" value={s.icon} onChange={(e) => setLocal(s.id, { icon: e.target.value })}>
                {ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
              </select></div>
          </div>
          {LANGS.map((l) => (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }} key={l}>
              <div className="adm-field"><label>Название {LANG_LABEL[l]}</label>
                <input className="adm-in" value={tr(s, l).title} onChange={(e) => patchTr(s.id, l, { title: e.target.value })} /></div>
              <div className="adm-field"><label>Описание {LANG_LABEL[l]}</label>
                <input className="adm-in" value={tr(s, l).short} onChange={(e) => patchTr(s.id, l, { short: e.target.value })} /></div>
            </div>
          ))}
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--mono)", fontSize: 13 }}>
            <input type="checkbox" checked={s.enabled} onChange={(e) => setLocal(s.id, { enabled: e.target.checked })} />
            Показывать в магазине
          </label>
          <div className="adm-actions" style={{ marginTop: 10 }}>
            <button className="adm-btn sm" onClick={() => save(s)}>Сохранить</button>
            <button className="adm-btn danger sm" onClick={() => remove(s)}>Удалить</button>
          </div>
        </div>
      ))}

      <div className="adm-block" style={{ borderStyle: "dashed" }}>
        <h3>Новая услуга</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="adm-field"><label>Цена (TMT)</label>
            <input className="adm-in" type="number" value={nw.price} onChange={(e) => setNw({ ...nw, price: Number(e.target.value) })} /></div>
          <div className="adm-field"><label>Иконка</label>
            <select className="adm-in" value={nw.icon} onChange={(e) => setNw({ ...nw, icon: e.target.value })}>
              {ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
            </select></div>
        </div>
        {LANGS.map((l) => (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }} key={l}>
            <div className="adm-field"><label>Название {LANG_LABEL[l]}</label>
              <input className="adm-in" value={nw.titles[l]} onChange={(e) => setNw({ ...nw, titles: { ...nw.titles, [l]: e.target.value } })} placeholder={l === "ru" ? "напр. Монтаж камеры" : ""} /></div>
            <div className="adm-field"><label>Описание {LANG_LABEL[l]}</label>
              <input className="adm-in" value={nw.shorts[l]} onChange={(e) => setNw({ ...nw, shorts: { ...nw.shorts, [l]: e.target.value } })} /></div>
          </div>
        ))}
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--mono)", fontSize: 13 }}>
          <input type="checkbox" checked={nw.enabled} onChange={(e) => setNw({ ...nw, enabled: e.target.checked })} />
          Показывать в магазине
        </label>
        <details style={{ marginTop: 6 }}>
          <summary style={{ cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12, color: "var(--tx3)" }}>Дополнительно</summary>
          <div className="adm-field" style={{ marginTop: 10 }}><label>slug (авто из названия)</label>
            <input className="adm-in" value={nw.slug} placeholder={slugify(nw.titles.ru) || "напр. pc-repair"} onChange={(e) => setNw({ ...nw, slug: e.target.value })} /></div>
        </details>
        <div className="adm-actions" style={{ marginTop: 10 }}>
          <button className="adm-btn" onClick={add}>+ Добавить услугу</button>
        </div>
      </div>
      {node}
      {confirmNode}
    </>
  );
}
