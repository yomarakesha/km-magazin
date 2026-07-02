"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, type AdminCategory, type AdminProduct } from "@/lib/admin-api";
import { useToast } from "../../_components/useToast";

export default function ProductsPage() {
  const { show, node } = useToast();
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [list, setList] = useState<AdminProduct[]>([]);
  const [filterCat, setFilterCat] = useState<number | 0>(0);

  const load = () => api.getProducts(filterCat || undefined).then(setList).catch((e) => show(String(e), "err"));
  useEffect(() => { api.getCategories().then(setCats).catch((e) => show(String(e), "err")); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filterCat]); // eslint-disable-line react-hooks/exhaustive-deps

  const catName = useMemo(() => {
    const m: Record<number, string> = {};
    for (const c of cats) m[c.id] = c.translations.find((t) => t.lang === "ru")?.name || c.slug;
    return m;
  }, [cats]);

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((p) => p.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    await api.reorderProducts(ids).catch((e) => show(String(e), "err"));
  }

  async function toggle(p: AdminProduct) {
    await api.updateProduct(p.id, { enabled: !p.enabled }).catch((e) => show(String(e), "err"));
    load();
  }

  async function remove(p: AdminProduct) {
    if (!confirm(`Удалить товар «${title(p)}»? Фото также будут удалены.`)) return;
    await api.deleteProduct(p.id).catch((e) => show(String(e), "err"));
    load();
    show("Удалено");
  }

  return (
    <>
      <h1 className="adm-h1">Товары</h1>
      <p className="adm-sub">Техника в магазине. Порядок отражается на сайте.</p>

      <div className="adm-actions" style={{ marginBottom: 18 }}>
        <Link className="adm-btn" href="/admin/shop/products/new">+ Добавить товар</Link>
      </div>

      <div className="adm-field" style={{ maxWidth: 280 }}>
        <label>Фильтр по категории</label>
        <select className="adm-in" value={filterCat} onChange={(e) => setFilterCat(Number(e.target.value))}>
          <option value={0}>Все категории</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{catName[c.id]}</option>)}
        </select>
      </div>

      {list.map((p, i) => (
        <div className="adm-row" key={p.id} style={{ opacity: p.enabled ? 1 : 0.5 }}>
          <div className="ord">
            <button onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
            <button onClick={() => move(i, 1)} disabled={i === list.length - 1}>▼</button>
          </div>
          <div className="grow">
            <div className="t">{title(p)}</div>
            <div className="m">
              {catName[p.category_id] ?? "?"} · {p.price} {p.currency} · {p.in_stock ? "в наличии" : "под заказ"} · {p.image_count} фото
            </div>
          </div>
          <div className="adm-actions" style={{ margin: 0 }}>
            <button className="adm-btn ghost sm" onClick={() => toggle(p)}>{p.enabled ? "Скрыть" : "Показать"}</button>
            <Link className="adm-btn ghost sm" href={`/admin/shop/products/${p.id}/images`}>Фото</Link>
            <Link className="adm-btn sm" href={`/admin/shop/products/${p.id}`}>Изменить</Link>
            <button className="adm-btn danger sm" onClick={() => remove(p)}>Удалить</button>
          </div>
        </div>
      ))}

      {node}
    </>
  );
}

function title(p: AdminProduct): string {
  return p.translations.find((t) => t.lang === "ru")?.title || p.slug;
}
