import { useState } from "react";
import { api, type MovementKind } from "../api";
import { Badge, Button, Card, Empty, Loaded, PageHead, Tabs, dateTime, money, useLoad } from "../ui";

const KIND: Record<MovementKind, { label: string; tone: "soft-green" | "soft-blue" | "soft-amber" | "soft-red" }> = {
  receipt: { label: "Приход", tone: "soft-green" },
  sale: { label: "Продажа", tone: "soft-blue" },
  return: { label: "Возврат", tone: "soft-amber" },
  writeoff: { label: "Списание", tone: "soft-red" },
  adjust: { label: "Корректировка", tone: "soft-amber" },
};
const PAGE = 50;

export default function Movements() {
  const [kind, setKind] = useState<"" | MovementKind>("");
  const [page, setPage] = useState(0);
  const state = useLoad(() => api.movements({ kind: kind || undefined, limit: PAGE, offset: page * PAGE }), [kind, page]);

  return (
    <>
      <PageHead title="Движения товара" sub="Журнал всех изменений остатков" />
      <Tabs
        value={kind}
        onChange={(k) => (setKind(k), setPage(0))}
        options={[{ value: "", label: "Все" }, ...(Object.keys(KIND) as MovementKind[]).map((k) => ({ value: k, label: KIND[k].label }))]}
      />
      <Card flush>
        <Loaded state={state}>
          {({ total, items }) =>
            items.length === 0 ? (
              <Empty title="Движений нет" />
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Товар</th>
                      <th>Операция</th>
                      <th className="right">Изменение</th>
                      <th className="right">Остаток</th>
                      <th>Кто</th>
                      <th>Комментарий</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((m) => (
                      <tr key={m.id}>
                        <td className="dim small nowrap">{dateTime(m.created_at)}</td>
                        <td className="title">{m.product_title}</td>
                        <td>
                          <Badge tone={KIND[m.kind].tone}>{KIND[m.kind].label}</Badge>
                        </td>
                        <td className="right mono" style={{ color: m.qty_delta > 0 ? "var(--green)" : m.qty_delta < 0 ? "var(--red)" : undefined }}>
                          {m.qty_delta > 0 ? "+" : ""}
                          {m.qty_delta}
                        </td>
                        <td className="right mono">{m.stock_after ?? "—"}</td>
                        <td className="dim">{m.username || "—"}</td>
                        <td className="dim small">
                          {m.note}
                          {m.unit_cost !== null && ` · ${money(m.unit_cost)}/шт.`}
                          {m.order_id && ` · заказ #${m.order_id}`}
                          {m.purchase_id && ` · закупка #${m.purchase_id}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="row between" style={{ padding: "14px 24px" }}>
                  <span className="muted small">
                    {page * PAGE + 1}–{Math.min(total, (page + 1) * PAGE)} из {total}
                  </span>
                  <div className="row">
                    <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                      Назад
                    </Button>
                    <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}>
                      Дальше
                    </Button>
                  </div>
                </div>
              </>
            )
          }
        </Loaded>
      </Card>
    </>
  );
}
