import { useState } from "react";
import { api, type LeadStatus } from "../api";
import { Badge, Card, Empty, Loaded, PageHead, Select, Tabs, confirmAction, dateTime, useAction, useLoad } from "../ui";

const STATUS: Record<LeadStatus, { label: string; tone: "soft-blue" | "soft-amber" | "soft-green" }> = {
  new: { label: "Новая", tone: "soft-blue" },
  read: { label: "В работе", tone: "soft-amber" },
  done: { label: "Закрыта", tone: "soft-green" },
};

export default function Leads() {
  const state = useLoad(api.leads);
  const [filter, setFilter] = useState<"" | LeadStatus>("");
  const { busy, run } = useAction();
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    if (await run(fn, msg)) state.reload();
  };

  return (
    <>
      <PageHead title="Заявки" sub="Заявки на услуги с сайта: перезвоните и уточните детали" />
      <Tabs
        value={filter}
        onChange={setFilter}
        options={[{ value: "", label: "Все" }, ...(Object.keys(STATUS) as LeadStatus[]).map((s) => ({ value: s, label: STATUS[s].label }))]}
      />
      <Card flush>
        <Loaded state={state}>
          {(all) => {
            const list = filter ? all.filter((l) => l.status === filter) : all;
            return list.length === 0 ? (
              <Empty title="Заявок нет" />
            ) : (
              <div style={{ padding: "4px 24px" }}>
                {list.map((l) => (
                  <div className="list-row" key={l.id} style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }} className="stack">
                      <div className="row" style={{ gap: 8 }}>
                        <b>{l.name}</b>
                        {l.phone && <a href={`tel:${l.phone}`}>{l.phone}</a>}
                        {l.email && <a href={`mailto:${l.email}`}>{l.email}</a>}
                        <Badge tone={STATUS[l.status].tone}>{STATUS[l.status].label}</Badge>
                      </div>
                      {l.message && <p style={{ whiteSpace: "pre-wrap" }}>{l.message}</p>}
                      <p className="muted small">{dateTime(l.created_at)}</p>
                    </div>
                    <Select
                      className="input-sm"
                      style={{ width: 150 }}
                      value={l.status}
                      disabled={busy}
                      onChange={(e) => act(() => api.setLeadStatus(l.id, e.target.value as LeadStatus), "Статус обновлён")}
                    >
                      {(Object.keys(STATUS) as LeadStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS[s].label}
                        </option>
                      ))}
                    </Select>
                    <button className="icon-btn" aria-label="Удалить" onClick={() => confirmAction("Удалить заявку?") && act(() => api.deleteLead(l.id), "Удалено")}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            );
          }}
        </Loaded>
      </Card>
    </>
  );
}
