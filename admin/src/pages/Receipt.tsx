import { useParams } from "react-router-dom";
import { api } from "../api";
import { BackButton, Button, Loaded, dateTime, money, useLoad } from "../ui";

/** Printable A4 receipt; rendered outside the admin shell. */
export default function Receipt() {
  const { id } = useParams();
  const sale = useLoad(() => api.sale(Number(id)), [id]);
  const settings = useLoad(() => api.settings().catch(() => null));

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
      <div className="row between no-print" style={{ marginBottom: 24 }}>
        <BackButton to="/pos" />
        <Button onClick={() => window.print()}>Печать</Button>
      </div>
      <Loaded state={sale}>
        {(s) => (
          <div className="card" style={{ gap: 20 }}>
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Kanagatly Mahabat" style={{ height: 72 }} />
              <div className="right small dim">
                {settings.data?.address_ru && <div>{settings.data.address_ru}</div>}
                {settings.data?.phone && <div>{settings.data.phone}</div>}
                {settings.data?.email && <div>{settings.data.email}</div>}
              </div>
            </div>
            <div>
              <h2>Товарный чек № {s.id}</h2>
              <p className="muted small" style={{ marginTop: 4 }}>
                {dateTime(s.created_at)} · продавец {s.seller}
              </p>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Наименование</th>
                  <th className="right">Цена</th>
                  <th className="right">Кол-во</th>
                  <th className="right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {s.items.map((it, i) => (
                  <tr key={i}>
                    <td className="mono">{i + 1}</td>
                    <td>{it.title}</td>
                    <td className="right mono">{money(it.price)}</td>
                    <td className="right mono">{it.qty}</td>
                    <td className="right mono">{money(it.price * it.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {s.discount > 0 && (
              <div className="row between dim">
                <span>Скидка</span>
                <span>− {money(s.discount)}</span>
              </div>
            )}
            <div className="total-line">
              <span style={{ fontWeight: 800 }}>Итого к оплате</span>
              <b>{money(s.sold_total)}</b>
            </div>
            <p className="small dim">
              Оплата: {s.payment_method === "cash" ? "наличные" : s.payment_method === "terminal" ? "карта" : `в долг — ${s.debtor_name ?? ""} ${s.debtor_phone ?? ""}`}
              {s.status === "paid" && s.payment_method === "debt" && s.settled_at && ` · погашен ${dateTime(s.settled_at)}`}
            </p>
            <div className="row between small" style={{ marginTop: 32 }}>
              <span>Продавец ____________________</span>
              <span>Покупатель ____________________</span>
            </div>
          </div>
        )}
      </Loaded>
    </div>
  );
}
