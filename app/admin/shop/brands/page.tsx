"use client";
import { useEffect, useState } from "react";
import { api, type AdminBrand } from "@/lib/admin-api";
import { useToast } from "../../_components/useToast";

export default function BrandsPage() {
  const { show, node } = useToast();
  const [list, setList] = useState<AdminBrand[]>([]);
  const [name, setName] = useState("");

  const load = () => api.getBrands().then(setList).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function add() {
    if (!name.trim()) return show("Укажите название бренда", "err");
    try {
      await api.createBrand({ name: name.trim(), enabled: true });
      setName("");
      load();
    } catch (e) { show(String(e), "err"); }
  }

  async function rename(b: AdminBrand, value: string) {
    setList((l) => l.map((x) => (x.id === b.id ? { ...x, name: value } : x)));
  }
  async function save(b: AdminBrand) {
    await api.updateBrand(b.id, { name: b.name }).then(() => show("Сохранено")).catch((e) => show(String(e), "err"));
  }
  async function toggle(b: AdminBrand) {
    await api.updateBrand(b.id, { enabled: !b.enabled }).catch((e) => show(String(e), "err"));
    load();
  }
  async function remove(b: AdminBrand) {
    if (!confirm(`Удалить бренд «${b.name}»?`)) return;
    await api.deleteBrand(b.id).catch((e) => show(String(e), "err"));
    load();
  }
  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((b) => b.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    await api.reorderBrands(ids).catch((e) => show(String(e), "err"));
  }

  return (
    <>
      <h1 className="adm-h1">Бренды</h1>
      <p className="adm-sub">Лента брендов/партнёров внизу каталога. Порядок отражается на сайте.</p>

      <div className="adm-block" style={{ borderStyle: "dashed" }}>
        <h3>Новый бренд</h3>
        <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <div className="adm-field" style={{ flex: "1 1 240px", marginBottom: 0 }}><label>Название</label>
            <input className="adm-in" value={name} onChange={(e) => setName(e.target.value)} placeholder="напр. Hikvision"
              onKeyDown={(e) => { if (e.key === "Enter") add(); }} /></div>
          <button className="adm-btn" onClick={add}>+ Добавить</button>
        </div>
      </div>

      {list.map((b, i) => (
        <div className="adm-row" key={b.id} style={{ opacity: b.enabled ? 1 : 0.5 }}>
          <div className="ord">
            <button onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
            <button onClick={() => move(i, 1)} disabled={i === list.length - 1}>▼</button>
          </div>
          <div className="grow">
            <input className="adm-in" value={b.name} onChange={(e) => rename(b, e.target.value)} onBlur={() => save(b)} />
          </div>
          <div className="adm-actions" style={{ margin: 0 }}>
            <button className="adm-btn ghost sm" onClick={() => toggle(b)}>{b.enabled ? "Скрыть" : "Показать"}</button>
            <button className="adm-btn danger sm" onClick={() => remove(b)}>Удалить</button>
          </div>
        </div>
      ))}
      {node}
    </>
  );
}
