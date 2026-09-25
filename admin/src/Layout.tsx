import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, type Role } from "./api";
import { ROLE_LABEL, useAuth } from "./auth";

interface NavItem {
  to: string;
  label: string;
  roles: Role[]; // [] = everyone signed in
  badge?: "orders" | "reviews";
}
export const NAV: { label: string; items: NavItem[] }[] = [
  { label: "", items: [{ to: "/", label: "Обзор", roles: [] }] },
  {
    label: "Продажи",
    items: [
      { to: "/orders", label: "Заказы", roles: ["sales", "warehouse"], badge: "orders" },
      { to: "/pos", label: "Касса", roles: ["sales"] },
      { to: "/sales", label: "Продажи кассы", roles: ["sales"] },
      { to: "/leads", label: "Заявки", roles: ["sales"] },
      { to: "/promos", label: "Промокоды", roles: ["sales"] },
    ],
  },
  {
    label: "Каталог",
    items: [
      { to: "/products", label: "Товары", roles: ["content", "warehouse"] },
      { to: "/categories", label: "Категории", roles: ["content"] },
      { to: "/brands", label: "Бренды", roles: ["content"] },
      { to: "/reviews", label: "Отзывы", roles: ["content"], badge: "reviews" },
    ],
  },
  {
    label: "Сайт",
    items: [
      { to: "/services", label: "Услуги", roles: ["content"] },
      { to: "/banners", label: "Баннеры", roles: ["content"] },
      { to: "/pages", label: "Страницы", roles: ["content"] },
    ],
  },
  {
    label: "Склад",
    items: [
      { to: "/stock", label: "Остатки", roles: ["warehouse", "sales"] },
      { to: "/movements", label: "Движения", roles: ["warehouse", "sales"] },
      { to: "/purchases", label: "Закупки", roles: ["warehouse", "sales"] },
      { to: "/suppliers", label: "Поставщики", roles: ["warehouse", "sales"] },
    ],
  },
  {
    label: "Управление",
    items: [
      { to: "/reports", label: "Отчёты", roles: ["sales", "warehouse"] },
      { to: "/settings", label: "Контакты магазина", roles: ["content"] },
      { to: "/users", label: "Сотрудники", roles: [] as Role[] /* owner-only, see can() below */ },
    ],
  },
];

export default function Layout() {
  const { me, logout, can } = useAuth();
  const [counts, setCounts] = useState<{ orders: number; reviews: number }>({ orders: 0, reviews: 0 });

  useEffect(() => {
    api
      .stats()
      .then((s) => setCounts({ orders: s.orders_new, reviews: s.reviews_pending }))
      .catch(() => {});
  }, []);

  const visible = (it: NavItem) => (it.to === "/users" ? me?.role === "owner" : it.roles.length === 0 || can(...it.roles));

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}logo-font.png`} alt="Kanagatly Mahabat" />
          <span>Админ</span>
        </div>
        {NAV.map((g) => {
          const items = g.items.filter(visible);
          if (!items.length) return null;
          return (
            <nav className="nav-group" key={g.label || "root"}>
              {g.label && <div className="label">{g.label}</div>}
              {items.map((it) => {
                const n = it.badge ? counts[it.badge] : 0;
                return (
                  <NavLink key={it.to} to={it.to} end={it.to === "/"} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                    {it.label}
                    {n > 0 && <span className="count">{n}</span>}
                  </NavLink>
                );
              })}
            </nav>
          );
        })}
        {me && (
          <div className="me">
            <div>
              <div style={{ fontWeight: 600 }}>{me.username}</div>
              <div className="muted small">{ROLE_LABEL[me.role]}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              Выйти
            </button>
          </div>
        )}
      </aside>
      <main className="main">
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
