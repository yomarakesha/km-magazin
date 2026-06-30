"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { CatalogCategory } from "@/lib/shop-types";
import { useShop } from "./shop-context";
import Icon from "./ui/Icon";

interface Node extends CatalogCategory {
  children: CatalogCategory[];
}

/** Persistent left category rail — a 2-level tree (parent → children). */
export default function ShopSidebar() {
  const { categories, pick, t } = useShop();
  const pathname = usePathname();

  // build roots + their children from the flat list
  const roots = useMemo<Node[]>(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const childrenOf = new Map<number, CatalogCategory[]>();
    for (const c of categories) {
      if (c.parent_id != null && byId.has(c.parent_id)) {
        const arr = childrenOf.get(c.parent_id) ?? [];
        arr.push(c);
        childrenOf.set(c.parent_id, arr);
      }
    }
    return categories
      .filter((c) => c.parent_id == null || !byId.has(c.parent_id))
      .map((c) => ({ ...c, children: childrenOf.get(c.id) ?? [] }));
  }, [categories]);

  // expand the group whose child (or self) is the active page
  const activeSlug = pathname.startsWith("/shop/category/") ? pathname.split("/shop/category/")[1] : "";
  const initialOpen = useMemo(() => {
    const open: Record<number, boolean> = {};
    for (const r of roots) {
      if (r.slug === activeSlug || r.children.some((ch) => ch.slug === activeSlug)) open[r.id] = true;
    }
    return open;
  }, [roots, activeSlug]);
  const [open, setOpen] = useState<Record<number, boolean>>(initialOpen);
  const isOpen = (id: number) => open[id] ?? initialOpen[id] ?? false;
  const toggle = (id: number) => setOpen((o) => ({ ...o, [id]: !isOpen(id) }));

  const linkCls = (slug: string) => `shop-side-link ${pathname === `/shop/category/${slug}` ? "on" : ""}`;

  return (
    <aside className="shop-sidebar">
      <div className="shop-sidebar-title">{t("categories")}</div>
      <nav className="shop-sidebar-nav">
        <Link href="/shop" className={`shop-side-link ${pathname === "/shop" ? "on" : ""}`}>
          <Icon name="grid" size={16} className="shop-side-ic" />
          <span>{t("allProducts")}</span>
        </Link>

        {roots.map((r) => {
          const hasKids = r.children.length > 0;
          return (
            <div key={r.id} className="shop-side-group">
              <div className="shop-side-row">
                <Link href={`/shop/category/${r.slug}`} className={linkCls(r.slug)}>
                  <Icon name="box" size={16} className="shop-side-ic" />
                  <span>{pick(r.name)}</span>
                  <span className="shop-side-count">{r.product_count}</span>
                </Link>
                {hasKids && (
                  <button
                    className={`shop-side-toggle ${isOpen(r.id) ? "open" : ""}`}
                    onClick={() => toggle(r.id)}
                    aria-label={pick(r.name)}
                    aria-expanded={isOpen(r.id)}
                  >
                    <Icon name="chevron" size={15} />
                  </button>
                )}
              </div>

              {hasKids && isOpen(r.id) && (
                <div className="shop-side-children">
                  {r.children.map((ch) => (
                    <Link key={ch.id} href={`/shop/category/${ch.slug}`} className={`${linkCls(ch.slug)} shop-side-child`}>
                      <span>{pick(ch.name)}</span>
                      <span className="shop-side-count">{ch.product_count}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
