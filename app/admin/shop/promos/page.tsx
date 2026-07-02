"use client";
import { useEffect, useState } from "react";
import { api, type AdminPromo } from "@/lib/admin-api";
import { useToast } from "../../_components/useToast";

const KIND_LABEL: Record<string, string> = { percent: "% от суммы", fixed: "Фикс. сумма (TMT)" };

export default function PromosPage() {
  const { show, node } = useToast();
  const [list, setList] = useState<AdminPromo[]>([]);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [expires, setExpires] = useState("");

  const load = () => api.getPromos().then(setList).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function add() {
    if (!code.trim()) return show("Укажите код", "err");
    const v = Number(value);
    if (!v || v < 1) return show("Укажите размер скидки", "err");
    if (kind === "percent" && v > 100) return show("Процент не может быть больше 100", "err");
    try {
      await api.createPromo({
        code: code.trim().toUpperCase(),
        kind,
        value: v,
        min_total: Number(minTotal) || 0,
        active: true,
        expires_at: expires || null,
      });
      setCode(""); setValue(""); setMinTotal(""); setExpires("");
      load();
    } catch (e) { show(String(e), "err"); }
  }

  async function toggle(p: AdminPromo) {
    await api.updatePromo(p.id, { active: !p.active }).catch((e) => show(String(e), "err"));
    load();
  }
  async function remove(p: AdminPromo) {
    if (!confirm(`Удалить промокод «${p.code}»?`)) return;
    await api.deletePromo(p.id).catch((e) => show(String(e), "err"));
    load();
  }

  const expired = (p: AdminPromo) => p.expires_at != null && p.expires_at < new Date().toISOString().slice(0, 10);

  return (
    <>
      <h1 className="adm-h1">Промокоды</h1>
      <p className="adm-sub">Скидочные коды для оформления заказа. Скидка пересчитывается на сервере.</p>

      <div className="adm-block" style={{ borderStyle: "dashed" }}>
        <h3>Новый промокод</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <div className="adm-field" style={{ marginBottom: 0 }}><label>Код</label>
            <input className="adm-in" value={code} placeholder="напр. SALE10"
              onChange={(e) => setCode(e.target.value.toUpperCase())} /></div>
          <div className="adm-field" style={{ marginBottom: 0 }}><label>Тип</label>
            <select className="adm-in" value={kind} onChange={(e) => setKind(e.target.value as "percent" | "fixed")}>
              <option value="percent">% от суммы</option>
              <option value="fixed">Фикс., TMT</option>
            </select></div>
          <div className="adm-field" style={{ marginBottom: 0 }}><label>Размер</label>
            <input className="adm-in" type="number" value={value} placeholder={kind === "percent" ? "10" : "500"}
              onChange={(e) => setValue(e.target.value)} /></div>
          <div className="adm-field" style={{ marginBottom: 0 }}><label>Мин. сумма, TMT</label>
            <input className="adm-in" type="number" value={minTotal} placeholder="0"
              onChange={(e) => setMinTotal(e.target.value)} /></div>
          <div className="adm-field" style={{ marginBottom: 0 }}><label>Действует до (пусто = бессрочно)</label>
            <input className="adm-in" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></div>
          <button className="adm-btn" onClick={add}>+ Добавить</button>
        </div>
      </div>

      {list.length === 0 ? (
        <p style={{ color: "var(--tx3)" }}>Промокодов пока нет.</p>
      ) : (
        <div className="adm-table-wrap">
        <table className="leads-table">
          <thead>
            <tr><th>Код</th><th>Скидка</th><th>Мин. сумма</th><th>Действует до</th><th>Использован</th><th>Статус</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} style={{ opacity: p.active && !expired(p) ? 1 : 0.5 }}>
                <td style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>{p.code}</td>
                <td>{p.kind === "percent" ? `−${p.value}%` : `−${p.value} TMT`}
                  <span style={{ fontSize: 11, color: "var(--tx3)", display: "block" }}>{KIND_LABEL[p.kind]}</span></td>
                <td>{p.min_total > 0 ? `${p.min_total} TMT` : "—"}</td>
                <td>{p.expires_at ?? "бессрочно"}{expired(p) && <span style={{ color: "#ff9a9a", fontSize: 11, display: "block" }}>истёк</span>}</td>
                <td>{p.used_count} раз</td>
                <td>
                  <button className="adm-btn ghost sm" onClick={() => toggle(p)}>{p.active ? "Выключить" : "Включить"}</button>
                </td>
                <td><button className="adm-btn danger sm" onClick={() => remove(p)}>Удалить</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      {node}
    </>
  );
}
