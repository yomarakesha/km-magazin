"use client";
import { useEffect, useState } from "react";
import { api, type Lead } from "@/lib/admin-api";
import { useToast } from "../_components/useToast";

const NEXT: Record<string, string> = { new: "read", read: "done", done: "new" };
const ST_LABEL: Record<string, string> = { new: "Новая", read: "Прочитана", done: "Готово" };

export default function LeadsPage() {
  const { show, node } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);

  const load = () => api.getLeads().then(setLeads).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function cycle(l: Lead) {
    await api.setLeadStatus(l.id, NEXT[l.status] ?? "new").catch((e) => show(String(e), "err"));
    load();
  }
  async function del(l: Lead) {
    if (!confirm("Удалить заявку?")) return;
    await api.deleteLead(l.id).catch((e) => show(String(e), "err"));
    load();
  }

  return (
    <>
      <h1 className="adm-h1">Заявки</h1>
      <p className="adm-sub">Обращения с формы на сайте.</p>

      {leads.length === 0 ? (
        <p style={{ color: "var(--tx3)" }}>Заявок пока нет.</p>
      ) : (
        <div className="adm-table-wrap">
        <table className="leads-table">
          <thead>
            <tr><th>Дата</th><th>Имя</th><th>Контакт</th><th>Сообщение</th><th>Статус</th><th></th></tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className={l.status === "new" ? "new" : ""}>
                <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--tx3)" }}>
                  {new Date(l.created_at).toLocaleString("ru-RU")}
                </td>
                <td><b>{l.name}</b></td>
                <td style={{ fontSize: 13 }}>{l.phone}{l.phone && l.email ? <br /> : null}{l.email}</td>
                <td style={{ maxWidth: 320 }}>{l.message}</td>
                <td>
                  <button className={`badge-st ${l.status}`} style={{ cursor: "pointer", background: "none" }} onClick={() => cycle(l)}>
                    {ST_LABEL[l.status] ?? l.status}
                  </button>
                </td>
                <td><button className="adm-btn danger sm" onClick={() => del(l)}>✕</button></td>
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
