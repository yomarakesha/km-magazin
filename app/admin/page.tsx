"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type AdminService, type AdminShopStats, type Lead } from "@/lib/admin-api";

export default function Dashboard() {
  const [services, setServices] = useState<AdminService[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<AdminShopStats | null>(null);

  useEffect(() => {
    api.getServices().then(setServices).catch(() => {});
    api.getLeads().then(setLeads).catch(() => {});
    api.getShopStats().then(setStats).catch(() => {});
  }, []);

  const mediaCount = services.reduce((n, s) => n + (s.media_count ?? 0), 0);
  const newLeads = leads.filter((l) => l.status === "new").length;

  return (
    <>
      <h1 className="adm-h1">Дашборд</h1>
      <p className="adm-sub">Управление контентом сайта KM.</p>

      <h3 style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Магазин</h3>
      <div className="adm-cards adm-section">
        <Link className="adm-card" href="/admin/shop/orders">
          <div className="n">{stats?.orders_new ?? "—"}</div>
          <div className="l">Новых заказов</div>
        </Link>
        <div className="adm-card">
          <div className="n">{stats?.orders_today ?? "—"}</div>
          <div className="l">Заказов сегодня</div>
        </div>
        <div className="adm-card">
          <div className="n">{stats?.orders_week ?? "—"}</div>
          <div className="l">Заказов за неделю</div>
        </div>
        <div className="adm-card">
          <div className="n">{stats ? stats.revenue_week : "—"}</div>
          <div className="l">Выручка за неделю, TMT</div>
        </div>
        <Link className="adm-card" href="/admin/shop/reviews">
          <div className="n">{stats?.reviews_pending ?? "—"}</div>
          <div className="l">Отзывов на модерации</div>
        </Link>
      </div>

      {stats && (stats.top_products.length > 0 || stats.low_stock.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="adm-section">
          {stats.top_products.length > 0 && (
            <div className="adm-block">
              <h3>Топ товаров (30 дней)</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 14 }}>
                {stats.top_products.map((p) => (
                  <li key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                    <Link href={`/admin/shop/products/${p.id}`}>{p.title}</Link>
                    <b>{p.sold} шт</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {stats.low_stock.length > 0 && (
            <div className="adm-block">
              <h3>Заканчиваются на складе</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 14 }}>
                {stats.low_stock.map((p) => (
                  <li key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                    <Link href={`/admin/shop/products/${p.id}`}>{p.title}</Link>
                    <b style={{ color: p.stock_qty === 0 ? "#ff9a9a" : "#f5a623" }}>{p.stock_qty} шт</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <h3 style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Лендинг</h3>
      <div className="adm-cards adm-section">
        <Link className="adm-card" href="/admin/services">
          <div className="n">{services.length}</div>
          <div className="l">Услуги</div>
        </Link>
        <div className="adm-card">
          <div className="n">{mediaCount}</div>
          <div className="l">Медиа файлов</div>
        </div>
        <Link className="adm-card" href="/admin/leads">
          <div className="n">{newLeads}</div>
          <div className="l">Новых заявок</div>
        </Link>
        <Link className="adm-card" href="/admin/content">
          <div className="n">3</div>
          <div className="l">Языка</div>
        </Link>
      </div>
    </>
  );
}
