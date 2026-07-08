"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api, type AdminCategory, type AdminProduct } from "@/lib/admin-api";
import { useToast } from "../../_components/useToast";
import { useConfirm } from "../../_components/useConfirm";

const PAGE_SIZE = 20;
const LANGS_EXTRA = ["tk", "en"] as const;

export default function ProductsPage() {
  const { show, node } = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [list, setList] = useState<AdminProduct[]>([]);
  const [filterCat, setFilterCat] = useState<number | 0>(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  // inline edit: which cell is open and its draft value
  const [edit, setEdit] = useState<{ id: number; field: "price" | "stock_qty"; value: string } | null>(null);
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const load = () => api.getProducts(filterCat || undefined).then(setList).catch((e) => show(String(e), "err"));
  useEffect(() => { api.getCategories().then(setCats).catch((e) => show(String(e), "err")); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); setPage(1); }, [filterCat]); // eslint-disable-line react-hooks/exhaustive-deps

  const catName = useMemo(() => {
    const m: Record<number, string> = {};
    for (const c of cats) m[c.id] = c.translations.find((t) => t.lang === "ru")?.name || c.slug;
    return m;
  }, [cats]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return list;
    return list.filter((p) =>
      p.slug.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.translations.some((t) => t.title.toLowerCase().includes(q)),
    );
  }, [list, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const canDrag = !q; // поиск ломает соответствие индексов — сортировка только без него

  async function reorder(fromId: number, toId: number) {
    if (fromId === toId) return;
    const from = list.findIndex((p) => p.id === fromId);
    const to = list.findIndex((p) => p.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setList(next);
    await api.reorderProducts(next.map((p) => p.id)).catch((e) => { show(String(e), "err"); load(); });
  }

  async function toggle(p: AdminProduct) {
    await api.updateProduct(p.id, { enabled: !p.enabled }).catch((e) => show(String(e), "err"));
    load();
  }

  async function remove(p: AdminProduct) {
    if (!(await ask(`Удалить товар «${title(p)}»? Фото также будут удалены.`))) return;
    await api.deleteProduct(p.id).catch((e) => show(String(e), "err"));
    load();
    show("Удалено");
  }

  async function duplicate(p: AdminProduct) {
    try {
      const full = await api.getProduct(p.id);
      const base = {
        category_id: full.category_id, price: full.price, old_price: full.old_price,
        currency: full.currency, in_stock: full.in_stock, stock_qty: full.stock_qty,
        sku: full.sku, enabled: false,
        translations: full.translations, attributes: full.attributes,
      };
      let created: AdminProduct | null = null;
      for (const slug of [`${full.slug}-copy`, `${full.slug}-copy-2`, `${full.slug}-copy-${Date.now().toString(36)}`]) {
        try { created = await api.createProduct({ ...base, slug }); break; } catch { /* slug занят — следующий вариант */ }
      }
      if (!created) throw new Error("Не удалось создать копию");
      show("Копия создана (скрыта)");
      load();
    } catch (e) { show(String(e), "err"); }
  }

  function startEdit(p: AdminProduct, field: "price" | "stock_qty") {
    setEdit({ id: p.id, field, value: String(p[field] ?? "") });
  }
  async function saveEdit() {
    if (!edit) return;
    const raw = edit.value.trim();
    const num = raw === "" ? null : Number(raw);
    if (num != null && (!Number.isFinite(num) || num < 0)) { show("Некорректное число", "err"); return; }
    if (edit.field === "price" && num == null) { show("Цена обязательна", "err"); return; }
    setEdit(null);
    await api.updateProduct(edit.id, { [edit.field]: num }).then(() => show("Сохранено")).catch((e) => show(String(e), "err"));
    load();
  }

  return (
    <>
      <h1 className="adm-h1">Товары</h1>
      <p className="adm-sub">Техника в магазине. Порядок отражается на сайте — перетаскивайте строки за ⠿.</p>

      <div className="adm-actions" style={{ marginBottom: 18 }}>
        <Link className="adm-btn" href="/admin/shop/products/new">+ Добавить товар</Link>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div className="adm-field" style={{ maxWidth: 280, marginBottom: 0, flex: "1 1 220px" }}>
          <label>Поиск</label>
          <input className="adm-in" value={query} placeholder="Название, SKU или slug"
            onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
        </div>
        <div className="adm-field" style={{ maxWidth: 280, marginBottom: 0, flex: "1 1 220px" }}>
          <label>Фильтр по категории</label>
          <select className="adm-in" value={filterCat} onChange={(e) => setFilterCat(Number(e.target.value))}>
            <option value={0}>Все категории</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{catName[c.id]}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 && <p style={{ color: "var(--tx3)" }}>{q ? "Ничего не найдено." : "Товаров пока нет."}</p>}

      {visible.map((p) => (
        <div
          className={`adm-row${dragOver === p.id ? " drag-over" : ""}`}
          key={p.id}
          style={{ opacity: p.enabled ? 1 : 0.5 }}
          draggable={canDrag}
          onDragStart={() => { dragFrom.current = p.id; }}
          onDragOver={(e) => { if (canDrag) { e.preventDefault(); setDragOver(p.id); } }}
          onDragLeave={() => setDragOver((v) => (v === p.id ? null : v))}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(null);
            if (canDrag && dragFrom.current != null) reorder(dragFrom.current, p.id);
            dragFrom.current = null;
          }}
          onDragEnd={() => { setDragOver(null); dragFrom.current = null; }}
        >
          {canDrag && <span className="adm-drag-handle" title="Перетащить">⠿</span>}
          <div className="grow">
            <div className="t">
              {title(p)}
              {LANGS_EXTRA.map((lang) =>
                !p.translations.find((t) => t.lang === lang)?.title?.trim() && (
                  <span key={lang} className="adm-tr-badge" title={`Нет перевода: ${lang.toUpperCase()}`}>{lang} ✗</span>
                ),
              )}
            </div>
            <div className="m">
              {catName[p.category_id] ?? "?"}
              {" · "}
              {edit?.id === p.id && edit.field === "price" ? (
                <input className="adm-inline-in" autoFocus value={edit.value} type="number" min={0}
                  onChange={(e) => setEdit({ ...edit, value: e.target.value })}
                  onBlur={saveEdit}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEdit(null); }} />
              ) : (
                <span className="adm-inline" title="Изменить цену" onClick={() => startEdit(p, "price")}>
                  {p.price} {p.currency}
                </span>
              )}
              {" · "}
              {edit?.id === p.id && edit.field === "stock_qty" ? (
                <input className="adm-inline-in" autoFocus value={edit.value} type="number" min={0}
                  onChange={(e) => setEdit({ ...edit, value: e.target.value })}
                  onBlur={saveEdit}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEdit(null); }} />
              ) : (
                <span className="adm-inline" title="Изменить остаток (пусто = не отслеживается)" onClick={() => startEdit(p, "stock_qty")}>
                  {p.stock_qty == null ? "остаток: —" : `остаток: ${p.stock_qty}`}
                </span>
              )}
              {" · "}{p.in_stock ? "в наличии" : "под заказ"} · {p.image_count} фото
            </div>
          </div>
          <div className="adm-actions" style={{ margin: 0 }}>
            <button className="adm-btn ghost sm" onClick={() => toggle(p)}>{p.enabled ? "Скрыть" : "Показать"}</button>
            <button className="adm-btn ghost sm" onClick={() => duplicate(p)} title="Создать копию товара">Копия</button>
            <Link className="adm-btn ghost sm" href={`/admin/shop/products/${p.id}/images`}>Фото</Link>
            <Link className="adm-btn sm" href={`/admin/shop/products/${p.id}`}>Изменить</Link>
            <button className="adm-btn danger sm" onClick={() => remove(p)}>Удалить</button>
          </div>
        </div>
      ))}

      {pages > 1 && (
        <div className="adm-pager">
          <button onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}>‹</button>
          <span>{safePage} / {pages} · {filtered.length} тов.</span>
          <button onClick={() => setPage(safePage + 1)} disabled={safePage >= pages}>›</button>
        </div>
      )}

      {node}
      {confirmNode}
    </>
  );
}

function title(p: AdminProduct): string {
  return p.translations.find((t) => t.lang === "ru")?.title || p.slug;
}
