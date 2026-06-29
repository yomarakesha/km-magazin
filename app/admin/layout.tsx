"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/admin-api";
import "./admin.css";

const NAV = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/content", label: "Тексты" },
  { href: "/admin/services", label: "Услуги" },
  { href: "/admin/leads", label: "Заявки" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [ready, setReady] = useState(isLogin);

  useEffect(() => {
    if (isLogin) { setReady(true); return; }
    api.me().then(() => setReady(true)).catch(() => router.replace("/admin/login"));
  }, [isLogin, pathname, router]);

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
          {NAV.map((n) => {
            const active = n.href === "/admin" ? pathname === n.href : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={active ? "act" : ""}>{n.label}</Link>
            );
          })}
        </nav>
        <div className="adm-side-foot">
          <a href="/" target="_blank" rel="noreferrer">Открыть сайт ↗</a>
          <button onClick={logout}>Выйти</button>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
