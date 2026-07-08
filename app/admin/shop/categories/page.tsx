"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type AdminCategory } from "@/lib/admin-api";
import { useToast } from "../../_components/useToast";
import { useConfirm } from "../../_components/useConfirm";

export default function CategoriesPage() {
  const { show, node } = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const [list, setList] = useState<AdminCategory[]>([]);

  const load = () => api.getCategories().then(setList).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((c) => c.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    await api.reorderCategories(ids).catch((e) => show(String(e), "err"));
  }

  async function toggle(c: AdminCategory) {
    await api.updateCategory(c.id, { enabled: !c.enabled }).catch((e) => show(String(e), "err"));
    load();
  }

  async function remove(c: AdminCategory) {
    if (!(await ask(`Удалить категорию «${name(c)}»? Все её товары будут удалены.`))) return;
    await api.deleteCategory(c.id).catch((e) => show(String(e), "err"));
    load();
    show("Удалено");
  }

  return (
    <>
      <h1 className="adm-h1">Категории</h1>
      <p className="adm-sub">Разделы магазина техники. Порядок отражается на сайте.</p>

      <div className="adm-actions" style={{ marginBottom: 18 }}>
        <Link className="adm-btn" href="/admin/shop/categories/new">+ Добавить категорию</Link>
      </div>

      {list.map((c, i) => (
        <div className="adm-row" key={c.id} style={{ opacity: c.enabled ? 1 : 0.5 }}>
          <div className="ord">
            <button onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
            <button onClick={() => move(i, 1)} disabled={i === list.length - 1}>▼</button>
          </div>
          <div className="grow">
            <div className="t">{name(c)}</div>
            <div className="m">{c.slug} · {c.product_count} тов. · {c.attributes.length} фильтров</div>
          </div>
          <div className="adm-actions" style={{ margin: 0 }}>
            <button className="adm-btn ghost sm" onClick={() => toggle(c)}>{c.enabled ? "Скрыть" : "Показать"}</button>
            <Link className="adm-btn ghost sm" href={`/admin/shop/categories/${c.id}/attributes`}>Фильтры</Link>
            <Link className="adm-btn ghost sm" href={`/admin/shop/categories/${c.id}/services`}>Услуги</Link>
            <Link className="adm-btn sm" href={`/admin/shop/categories/${c.id}`}>Изменить</Link>
            <button className="adm-btn danger sm" onClick={() => remove(c)}>Удалить</button>
          </div>
        </div>
      ))}

      {node}
      {confirmNode}
    </>
  );
}

function name(c: AdminCategory): string {
  return c.translations.find((t) => t.lang === "ru")?.name || c.slug;
}
