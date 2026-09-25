import { useState } from "react";
import { api, type ReviewStatus } from "../api";
import { Badge, Button, Card, Empty, Loaded, PageHead, Tabs, confirmAction, dateTime, useAction, useLoad } from "../ui";

const STATUS: Record<ReviewStatus, { label: string; tone: "soft-amber" | "soft-green" | "soft-red" }> = {
  pending: { label: "На модерации", tone: "soft-amber" },
  approved: { label: "Опубликован", tone: "soft-green" },
  rejected: { label: "Отклонён", tone: "soft-red" },
};

export default function Reviews() {
  const [status, setStatus] = useState<"" | ReviewStatus>("pending");
  const state = useLoad(() => api.reviews(status || undefined), [status]);
  const { busy, run } = useAction();

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    if (await run(fn, msg)) state.reload();
  };

  return (
    <>
      <PageHead title="Отзывы" sub="На сайте видны только опубликованные" />
      <Tabs
        value={status}
        onChange={setStatus}
        options={[{ value: "", label: "Все" }, ...(Object.keys(STATUS) as ReviewStatus[]).map((s) => ({ value: s, label: STATUS[s].label }))]}
      />
      <Card flush>
        <Loaded state={state}>
          {(list) =>
            list.length === 0 ? (
              <Empty title="Отзывов нет" />
            ) : (
              <div style={{ padding: "4px 24px" }}>
                {list.map((r) => (
                  <div className="list-row" key={r.id} style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }} className="stack">
                      <div className="row" style={{ gap: 8 }}>
                        <b>{r.name}</b>
                        <span style={{ color: "#f5a623", letterSpacing: 1 }}>{"★".repeat(r.rating) + "☆".repeat(5 - r.rating)}</span>
                        <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                      </div>
                      <p>{r.text || <span className="muted">без текста</span>}</p>
                      <p className="muted small">
                        {r.product_title} · {dateTime(r.created_at)}
                      </p>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      {r.status !== "approved" && (
                        <Button size="sm" disabled={busy} onClick={() => act(() => api.setReviewStatus(r.id, "approved"), "Опубликован")}>
                          Опубликовать
                        </Button>
                      )}
                      {r.status !== "rejected" && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => api.setReviewStatus(r.id, "rejected"), "Отклонён")}>
                          Отклонить
                        </Button>
                      )}
                      <button
                        className="icon-btn"
                        aria-label="Удалить"
                        onClick={() => confirmAction("Удалить отзыв?") && act(() => api.deleteReview(r.id), "Удалён")}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </Loaded>
      </Card>
    </>
  );
}
