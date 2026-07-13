"use client";
import { useEffect, useState } from "react";
import { api, type SupplierRow } from "@/lib/admin-api";
import { useToast } from "../../_components/useToast";
import { useConfirm } from "../../_components/useConfirm";

export default function SuppliersPage() {
  const { show, node } = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const [list, setList] = useState<SupplierRow[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const load = () => api.getSuppliers().then(setList).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function add() {
    if (!name.trim()) return show("Укажите название", "err");
    try {
      await api.createSupplier({ name: name.trim(), phone: phone.trim() });
      setName(""); setPhone("");
      load();
    } catch (e) { show(String(e), "err"); }
  }

  function edit(s: SupplierRow, patch: Partial<SupplierRow>) {
    setList((l) => l.map((x) => (x.id === s.id ? { ...x, ...patch } : x)));
  }
  async function save(s: SupplierRow) {
    await api.updateSupplier(s.id, { name: s.name, phone: s.phone, note: s.note })
      .then(() => show("Сохранено")).catch((e) => show(String(e), "err"));
  }
  async function toggle(s: SupplierRow) {
    await api.updateSupplier(s.id, { active: !s.active }).catch((e) => show(String(e), "err"));
    load();
  }
  async function remove(s: SupplierRow) {
    if (!(await ask(`Удалить поставщика «${s.name}»? История закупок сохранится.`))) return;
    await api.deleteSupplier(s.id).catch((e) => show(String(e), "err"));
    load();
  }

  return (
    <>
      <h1 className="adm-h1">Поставщики</h1>
      <p className="adm-sub">Справочник для приходных накладных. Удаление не трогает историю закупок.</p>

      <div className="adm-block" style={{ borderStyle: "dashed" }}>
        <h3>Новый поставщик</h3>
        <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <div className="adm-field" style={{ flex: "1 1 200px", marginBottom: 0 }}><label>Название</label>
            <input className="adm-in" value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }} /></div>
          <div className="adm-field" style={{ flex: "1 1 160px", marginBottom: 0 }}><label>Телефон</label>
            <input className="adm-in" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <button className="adm-btn" onClick={add}>+ Добавить</button>
        </div>
      </div>

      {list.map((s) => (
        <div className="adm-row" key={s.id} style={{ opacity: s.active ? 1 : 0.5 }}>
          <div className="grow" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="adm-in" style={{ flex: "2 1 180px" }} value={s.name}
              onChange={(e) => edit(s, { name: e.target.value })} onBlur={() => save(s)} />
            <input className="adm-in" style={{ flex: "1 1 140px" }} value={s.phone} placeholder="телефон"
              onChange={(e) => edit(s, { phone: e.target.value })} onBlur={() => save(s)} />
            <input className="adm-in" style={{ flex: "2 1 200px" }} value={s.note} placeholder="заметка"
              onChange={(e) => edit(s, { note: e.target.value })} onBlur={() => save(s)} />
          </div>
          <div className="adm-actions" style={{ margin: 0 }}>
            <button className="adm-btn ghost sm" onClick={() => toggle(s)}>{s.active ? "Скрыть" : "Показать"}</button>
            <button className="adm-btn danger sm" onClick={() => remove(s)}>Удалить</button>
          </div>
        </div>
      ))}
      {node}
      {confirmNode}
    </>
  );
}
