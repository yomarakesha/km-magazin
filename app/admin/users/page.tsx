"use client";
import { useEffect, useState } from "react";
import { api, type AdminRole, type AdminUserRow } from "@/lib/admin-api";
import { useToast } from "../_components/useToast";
import { useConfirm } from "../_components/useConfirm";

const ROLES: { value: AdminRole; label: string; hint: string }[] = [
  { value: "owner", label: "Владелец", hint: "полный доступ, управление пользователями" },
  { value: "warehouse", label: "Складчик", hint: "склад: приход/списание, заказы на сборку" },
  { value: "sales", label: "Продажи", hint: "заказы, промокоды, заявки" },
  { value: "content", label: "Контент", hint: "товары, тексты, фото — без цен и заказов" },
];

export default function UsersPage() {
  const { show, node } = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const [list, setList] = useState<AdminUserRow[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("content");

  const load = () => api.getUsers().then(setList).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function add() {
    if (username.trim().length < 3) return show("Логин: минимум 3 символа (латиница/цифры)", "err");
    if (password.length < 8) return show("Пароль: минимум 8 символов", "err");
    try {
      await api.createUser({ username: username.trim(), password, role });
      setUsername(""); setPassword("");
      show("Пользователь создан");
      load();
    } catch (e) { show(String(e), "err"); }
  }

  async function setUserRole(u: AdminUserRow, r: AdminRole) {
    try {
      await api.updateUser(u.id, { role: r });
      load();
    } catch (e) { show(String(e), "err"); }
  }

  async function toggle(u: AdminUserRow) {
    try {
      await api.updateUser(u.id, { active: !u.active });
      load();
    } catch (e) { show(String(e), "err"); }
  }

  const [pwFor, setPwFor] = useState<number | null>(null);
  const [pwVal, setPwVal] = useState("");

  async function savePassword(u: AdminUserRow) {
    if (pwVal.length < 8) return show("Пароль: минимум 8 символов", "err");
    try {
      await api.updateUser(u.id, { password: pwVal });
      show("Пароль обновлён");
      setPwFor(null); setPwVal("");
    } catch (e) { show(String(e), "err"); }
  }

  async function remove(u: AdminUserRow) {
    if (!(await ask(`Удалить пользователя «${u.username}»?`))) return;
    try {
      await api.deleteUser(u.id);
      load();
    } catch (e) { show(String(e), "err"); }
  }

  return (
    <>
      <h1 className="adm-h1">Пользователи</h1>
      <p className="adm-sub">Аккаунты админки и их роли. Владелец видит всё; остальные — только свои разделы.</p>

      <div className="adm-block" style={{ borderStyle: "dashed" }}>
        <h3>Новый пользователь</h3>
        <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <div className="adm-field" style={{ flex: "1 1 160px", marginBottom: 0 }}><label>Логин</label>
            <input className="adm-in" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="напр. sklad" autoComplete="off" /></div>
          <div className="adm-field" style={{ flex: "1 1 160px", marginBottom: 0 }}><label>Пароль</label>
            <input className="adm-in" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="мин. 8 символов" autoComplete="new-password" /></div>
          <div className="adm-field" style={{ flex: "0 1 180px", marginBottom: 0 }}><label>Роль</label>
            <select className="adm-in" value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select></div>
          <button className="adm-btn" onClick={add}>+ Создать</button>
        </div>
        <p className="adm-sub" style={{ margin: "10px 0 0" }}>{ROLES.find((r) => r.value === role)?.hint}</p>
      </div>

      {list.map((u) => (
        <div className="adm-row" key={u.id} style={{ opacity: u.active ? 1 : 0.5 }}>
          <div className="grow">
            <b>{u.username}</b>
            {!u.active && <span style={{ marginLeft: 8, fontSize: 12, color: "var(--tx3)" }}>заблокирован</span>}
          </div>
          <select className="adm-in" style={{ width: 150 }} value={u.role}
            onChange={(e) => setUserRole(u, e.target.value as AdminRole)}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <div className="adm-actions" style={{ margin: 0 }}>
            {pwFor === u.id ? (
              <>
                <input className="adm-in" type="password" style={{ width: 160 }} value={pwVal} autoFocus
                  placeholder="новый пароль" autoComplete="new-password"
                  onChange={(e) => setPwVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") savePassword(u); if (e.key === "Escape") setPwFor(null); }} />
                <button className="adm-btn sm" onClick={() => savePassword(u)}>OK</button>
                <button className="adm-btn ghost sm" onClick={() => { setPwFor(null); setPwVal(""); }}>✕</button>
              </>
            ) : (
              <button className="adm-btn ghost sm" onClick={() => { setPwFor(u.id); setPwVal(""); }}>Пароль</button>
            )}
            <button className="adm-btn ghost sm" onClick={() => toggle(u)}>{u.active ? "Блок" : "Разблок"}</button>
            <button className="adm-btn danger sm" onClick={() => remove(u)}>Удалить</button>
          </div>
        </div>
      ))}
      {node}
      {confirmNode}
    </>
  );
}
