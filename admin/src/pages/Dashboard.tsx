import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Card, Empty, Loaded, PageHead, money, num, useLoad } from "../ui";

export default function Dashboard() {
  const { me, can } = useAuth();
  const state = useLoad(api.stats);

  return (
    <>
      <PageHead title={`Здравствуйте, ${me?.username}`} sub="Сводка по магазину" />
      <Loaded state={state}>
        {(s) => (
          <>
            <div className="grid4">
              <Stat k="Новые заказы" v={num(s.orders_new)} to={can("sales", "warehouse") ? "/orders" : undefined} />
              <Stat k="Заказов сегодня" v={num(s.orders_today)} />
              <Stat k="Заказов за 7 дней" v={num(s.orders_week)} />
              {s.revenue_week !== null ? (
                <Stat k="Выручка за 7 дней" v={money(s.revenue_week)} />
              ) : (
                <Stat k="Отзывы на модерации" v={num(s.reviews_pending)} to={can("content") ? "/reviews" : undefined} />
              )}
            </div>
            <div className="grid2">
              <Card title="Популярные товары">
                {s.top_products.length === 0 ? (
                  <Empty title="Продаж пока нет" />
                ) : (
                  <div>
                    {s.top_products.map((p, i) => (
                      <div className="list-row" key={p.id}>
                        <span className="muted mono" style={{ width: 20 }}>
                          {i + 1}
                        </span>
                        <span style={{ flex: 1 }}>{p.title}</span>
                        <b className="mono">{num(p.sold)} шт.</b>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card title="Заканчиваются на складе" actions={can("warehouse", "sales") && <Link to="/stock">Все остатки</Link>}>
                {s.low_stock.length === 0 ? (
                  <Empty title="Всё в наличии" />
                ) : (
                  <div>
                    {s.low_stock.map((p) => (
                      <div className="list-row" key={p.id}>
                        <span style={{ flex: 1 }}>{p.title}</span>
                        <span className={`badge ${p.stock_qty === 0 ? "soft-red" : "soft-amber"}`}>{p.stock_qty} шт.</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </Loaded>
    </>
  );
}

function Stat({ k, v, to }: { k: string; v: string; to?: string }) {
  const body = (
    <div className="card stat">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
  return to ? (
    <Link to={to} style={{ color: "inherit", textDecoration: "none" }}>
      {body}
    </Link>
  ) : (
    body
  );
}
