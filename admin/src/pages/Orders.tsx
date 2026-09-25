import { useState, type ReactNode } from "react";
import { api, type Order, type OrderStatus, type PaymentStatus } from "../api";
import { useAuth } from "../auth";
import { Badge, Button, Card, Empty, ErrorBox, Loaded, Modal, PageHead, Select, Tabs, confirmAction, dateTime, money, useAction, useLoad } from "../ui";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "soft-blue" | "soft-amber" | "soft-green" | "soft-red" }> = {
  new: { label: "Новый", tone: "soft-blue" },
  confirmed: { label: "Подтверждён", tone: "soft-amber" },
  delivered: { label: "Выдан", tone: "soft-green" },
  cancelled: { label: "Отменён", tone: "soft-red" },
};
const PAYMENT: Record<PaymentStatus, string> = { unpaid: "Не оплачен", pending: "Ожидает", paid: "Оплачен", refunded: "Возврат" };
const METHOD: Record<string, string> = { cash: "Наличные", terminal: "Карта" };

export default function Orders() {
  const [status, setStatus] = useState<"" | OrderStatus>("");
  const [q, setQ] = useState("");
  const state = useLoad(() => api.orders({ status, q }), [status, q]);
  const [open, setOpen] = useState<Order | null>(null);

  return (
    <>
      <PageHead title="Заказы" sub="Заявки из корзины сайта. Оплата — при получении." />
      <div className="row between">
        <Tabs
          value={status}
          onChange={setStatus}
          options={[{ value: "", label: "Все" }, ...Object.entries(ORDER_STATUS).map(([v, s]) => ({ value: v as OrderStatus, label: s.label }))]}
        />
        <input className="search" placeholder="Имя или телефон" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card flush>
        <Loaded state={state}>
          {(orders) =>
            orders.length === 0 ? (
              <Empty title="Заказов нет" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Покупатель</th>
                      <th>Состав</th>
                      <th className="right">Сумма</th>
                      <th>Статус</th>
                      <th>Оплата</th>
                      <th>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="clickable" onClick={() => setOpen(o)}>
                        <td className="mono">#{o.id}</td>
                        <td>
                          <div className="title">{o.customer_name}</div>
                          <div className="sub">{o.phone}</div>
                        </td>
                        <td className="dim">
                          {o.items.length} поз. · {o.items.reduce((n, it) => n + it.qty, 0)} шт.
                        </td>
                        <td className="right price">{money(o.total)}</td>
                        <td>
                          <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>
                        </td>
                        <td className="dim small">{PAYMENT[o.payment_status]}</td>
                        <td className="dim small nowrap">{dateTime(o.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </Loaded>
      </Card>
      {open && (
        <OrderModal
          order={open}
          onClose={() => setOpen(null)}
          onChanged={(o) => {
            setOpen(o);
            state.reload();
          }}
          onDeleted={() => {
            setOpen(null);
            state.reload();
          }}
        />
      )}
    </>
  );
}

function OrderModal({ order, onClose, onChanged, onDeleted }: { order: Order; onClose: () => void; onChanged: (o: Order) => void; onDeleted: () => void }) {
  const { can, me } = useAuth();
  const { busy, error, run } = useAction();
  const canEdit = can("sales");
  const subtotal = order.items.reduce((n, it) => n + it.price * it.qty, 0);

  return (
    <Modal title={`Заказ #${order.id}`} onClose={onClose} wide>
      <div className="grid2">
        <div className="stack">
          <Info k="Покупатель" v={order.customer_name} />
          <Info k="Телефон" v={<a href={`tel:${order.phone}`}>{order.phone}</a>} />
          {order.address && <Info k="Адрес" v={order.address} />}
          {order.comment && <Info k="Комментарий" v={order.comment} />}
          <Info k="Способ оплаты" v={METHOD[order.payment_method] ?? order.payment_method} />
          <Info k="Создан" v={dateTime(order.created_at)} />
        </div>
        <div className="stack">
          <label className="field">
            <span className="lbl">Статус заказа</span>
            <Select
              value={order.status}
              disabled={!canEdit || busy}
              onChange={(e) => run(() => api.setOrderStatus(order.id, e.target.value as OrderStatus), "Статус обновлён").then((o) => o && onChanged(o))}
            >
              {Object.entries(ORDER_STATUS).map(([v, s]) => (
                <option key={v} value={v}>
                  {s.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            <span className="lbl">Оплата</span>
            <Select
              value={order.payment_status}
              disabled={!canEdit || busy}
              onChange={(e) => run(() => api.setOrderPayment(order.id, e.target.value as PaymentStatus), "Оплата обновлена").then((o) => o && onChanged(o))}
            >
              {Object.entries(PAYMENT).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </label>
          <ErrorBox error={error} />
        </div>
      </div>
      <hr className="divider" />
      <div>
        {order.items.map((it, i) => (
          <div className="list-row" key={i}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{it.title}</div>
              <div className="muted small">
                {it.kind === "service" ? "Услуга" : "Товар"} · {money(it.price)}
              </div>
            </div>
            <span className="dim">× {it.qty}</span>
            <b className="mono" style={{ minWidth: 110, textAlign: "right" }}>
              {money(it.price * it.qty)}
            </b>
          </div>
        ))}
      </div>
      {order.discount > 0 && (
        <div className="row between dim">
          <span>
            Подытог · промокод <b>{order.promo_code}</b>
          </span>
          <span>
            {money(subtotal)} − {money(order.discount)}
          </span>
        </div>
      )}
      {order.delivery > 0 && (
        <div className="row between">
          <span>Доставка</span>
          <b className="mono">{money(order.delivery)}</b>
        </div>
      )}
      <div className="total-line">
        <span style={{ fontWeight: 800 }}>Итого</span>
        <b>{money(order.total)}</b>
      </div>
      {me?.role === "owner" && (
        <div className="form-actions">
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => confirmAction(`Удалить заказ #${order.id}? Остатки и промокод будут возвращены.`) && run(() => api.deleteOrder(order.id), "Заказ удалён").then((r) => r && onDeleted())}
          >
            Удалить заказ
          </Button>
        </div>
      )}
    </Modal>
  );
}

function Info({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div>
      <div className="muted small">{k}</div>
      <div style={{ marginTop: 2 }}>{v}</div>
    </div>
  );
}
