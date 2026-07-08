"use client";
import { useEffect, useState } from "react";
import { api, type AdminReview } from "@/lib/admin-api";
import { useToast } from "../../_components/useToast";
import { useConfirm } from "../../_components/useConfirm";

const ST_LABEL: Record<string, string> = { pending: "На модерации", approved: "Одобрен", rejected: "Отклонён" };
const FILTERS = [
  { value: "", label: "Все" },
  { value: "pending", label: "На модерации" },
  { value: "approved", label: "Одобренные" },
  { value: "rejected", label: "Отклонённые" },
];

export default function ReviewsPage() {
  const { show, node } = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const [list, setList] = useState<AdminReview[]>([]);
  const [filter, setFilter] = useState("pending");

  const load = () => api.getReviews(filter || undefined).then(setList).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(r: AdminReview, status: string) {
    await api.setReviewStatus(r.id, status).catch((e) => show(String(e), "err"));
    load();
  }
  async function remove(r: AdminReview) {
    if (!(await ask(`Удалить отзыв от «${r.name}»?`))) return;
    await api.deleteReview(r.id).catch((e) => show(String(e), "err"));
    load();
  }

  return (
    <>
      <h1 className="adm-h1">Отзывы</h1>
      <p className="adm-sub">Отзывы покупателей. На сайте видны только одобренные.</p>

      <div className="adm-tabs">
        {FILTERS.map((f) => (
          <button key={f.value} className={filter === f.value ? "on" : ""} onClick={() => setFilter(f.value)}>{f.label}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <p style={{ color: "var(--tx3)" }}>Пусто.</p>
      ) : (
        list.map((r) => (
          <div className="adm-block" key={r.id}>
            <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <b>{r.name}</b>
              <span style={{ color: "#f5a623", fontFamily: "var(--mono)", fontSize: 13 }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--tx3)" }}>
                {r.product_title} · {new Date(r.created_at).toLocaleString("ru-RU")} · {ST_LABEL[r.status] ?? r.status}
              </span>
            </div>
            {r.text && <p style={{ margin: "8px 0 0", color: "var(--tx2)", fontSize: 14 }}>{r.text}</p>}
            <div className="adm-actions" style={{ marginTop: 12 }}>
              {r.status !== "approved" && <button className="adm-btn sm" onClick={() => setStatus(r, "approved")}>Одобрить</button>}
              {r.status !== "rejected" && <button className="adm-btn ghost sm" onClick={() => setStatus(r, "rejected")}>Отклонить</button>}
              <button className="adm-btn danger sm" onClick={() => remove(r)}>Удалить</button>
            </div>
          </div>
        ))
      )}
      {node}
      {confirmNode}
    </>
  );
}
