"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { api, type AdminRole } from "@/lib/admin-api";
import "./admin.css";

// roles: undefined = everyone; owner always sees everything
const NAV: { href: string; label: string; roles?: AdminRole[] }[] = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/content", label: "Тексты", roles: ["content"] },
  { href: "/admin/services", label: "Услуги", roles: ["content"] },
  { href: "/admin/leads", label: "Заявки", roles: ["sales"] },
  { href: "/admin/shop/categories", label: "Категории", roles: ["content"] },
  { href: "/admin/shop/products", label: "Товары", roles: ["content", "warehouse"] },
  { href: "/admin/shop/brands", label: "Бренды", roles: ["content"] },
  { href: "/admin/shop/reviews", label: "Отзывы", roles: ["content"] },
  { href: "/admin/shop/promos", label: "Промокоды", roles: ["sales"] },
  { href: "/admin/shop/orders", label: "Заказы", roles: ["sales", "warehouse"] },
  { href: "/admin/pos", label: "Касса", roles: ["sales"] },
  { href: "/admin/pos/sales", label: "Продажи · Долги", roles: ["sales"] },
  { href: "/admin/warehouse", label: "Склад", roles: ["warehouse", "sales"] },
  { href: "/admin/warehouse/movements", label: "Журнал склада", roles: ["warehouse", "sales"] },
  { href: "/admin/warehouse/purchases", label: "Закупки", roles: ["warehouse"] },
  { href: "/admin/warehouse/suppliers", label: "Поставщики", roles: ["warehouse"] },
  { href: "/admin/reports", label: "Отчёты", roles: ["sales", "warehouse"] },
  { href: "/admin/shop/settings", label: "Контакты", roles: ["content"] },
  { href: "/admin/users", label: "Пользователи", roles: [] }, // owner only
];

const ROLE_LABEL: Record<AdminRole, string> = {
  owner: "владелец",
  warehouse: "склад",
  sales: "продажи",
  content: "контент",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [ready, setReady] = useState(isLogin);
  const [me, setMe] = useState<{ username: string; role: AdminRole } | null>(null);
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isLogin) { setReady(true); return; }
    api.me()
      .then((m) => { setMe({ username: m.username, role: m.role }); setReady(true); })
      .catch(() => router.replace("/admin/login"));
  }, [isLogin, pathname, router]);

  const role = me?.role ?? "owner";
  const nav = NAV.filter((n) => role === "owner" || !n.roles || n.roles.includes(role));

  // counters in the sidebar; refreshed on navigation so they stay current while working
  useEffect(() => {
    if (isLogin || !ready) return;
    api.getShopStats().then((s) => setBadges((b) => ({
      ...b, "/admin/shop/orders": s.orders_new, "/admin/shop/reviews": s.reviews_pending,
    }))).catch(() => {});
    api.getLeads().then((ls) => setBadges((b) => ({
      ...b, "/admin/leads": ls.filter((l) => l.status === "new").length,
    }))).catch(() => {});
  }, [isLogin, ready, pathname]);

  async function logout() {
    await api.logout().catch(() => {});
    router.replace("/admin/login");
  }

  if (isLogin) return <div className="adm-login-wrap">{children}</div>;
  if (!ready) return <div className="adm-loading">Загрузка…</div>;

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand">KM<span>admin</span></div>
        <nav>
          {nav.map((n) => {
            // exact match for hrefs that are prefixes of other nav items
            const exact = n.href === "/admin" || n.href === "/admin/warehouse" || n.href === "/admin/pos";
            const active = exact ? pathname === n.href : pathname.startsWith(n.href);
            const count = badges[n.href] ?? 0;
            return (
              <Link key={n.href} href={n.href} className={active ? "act" : ""}>
                {n.label}
                {count > 0 && <span className="adm-nav-badge">{count}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="adm-side-foot">
          {me && <span className="adm-side-user">{me.username} · {ROLE_LABEL[me.role]}</span>}
          <a href="/" target="_blank" rel="noreferrer">Открыть сайт ↗</a>
          <button onClick={logout}>Выйти</button>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
