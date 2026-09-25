import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Brand, type Category, type Product } from "../api";
import { useAuth } from "../auth";
import { Badge, Button, Card, Empty, Loaded, PageHead, Select, discountPct, money, useLoad } from "../ui";

export const trTitle = (p: Product) => p.translations.find((t) => t.lang === "ru")?.title || p.slug;
export const catName = (c: Category) => c.translations.find((t) => t.lang === "ru")?.name || c.slug;

/** Categories ordered as a tree (parent, then its children) with depth. */
export function categoryTree(cats: Category[]): { cat: Category; depth: number }[] {
  const kids = new Map<number | null, Category[]>();
  for (const c of cats) {
    const k = cats.some((p) => p.id === c.parent_id) ? c.parent_id : null;
    kids.set(k, [...(kids.get(k) ?? []), c]);
  }
  const out: { cat: Category; depth: number }[] = [];
  const walk = (pid: number | null, depth: number, seen: Set<number>) => {
    for (const c of (kids.get(pid) ?? []).sort((a, b) => a.sort_order - b.sort_order)) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ cat: c, depth });
      walk(c.id, depth + 1, seen);
    }
  };
  walk(null, 0, new Set());
  return out;
}

export default function Products() {
  const { can } = useAuth();
  const nav = useNavigate();
  const state = useLoad(() => Promise.all([api.products(), api.categories(), api.brands()]));
  const [cat, setCat] = useState("");
  const [brand, setBrand] = useState("");
  const [flag, setFlag] = useState("");
  const [q, setQ] = useState("");

  return (
    <>
      <PageHead
        title="Товары"
        sub="Карточки витрины: тексты, цены, характеристики и фото"
        actions={
          can("content", "warehouse") && (
            <Button onClick={() => nav("/products/new")}>+ Добавить товар</Button>
          )
        }
      />
      <Loaded state={state}>
        {([products, cats, brands]) => (
          <ProductTable
            products={products}
            cats={cats}
            brands={brands}
            filters={{ cat, brand, flag, q }}
            controls={
              <div className="row">
                <input className="search" placeholder="Название, slug или артикул" value={q} onChange={(e) => setQ(e.target.value)} />
                <Select className="input-sm" style={{ width: 220 }} value={cat} onChange={(e) => setCat(e.target.value)}>
                  <option value="">Все категории</option>
                  {categoryTree(cats).map(({ cat: c, depth }) => (
                    <option key={c.id} value={c.id}>
                      {"— ".repeat(depth)}
                      {catName(c)}
                    </option>
                  ))}
                </Select>
                <Select className="input-sm" style={{ width: 180 }} value={brand} onChange={(e) => setBrand(e.target.value)}>
                  <option value="">Все бренды</option>
                  <option value="none">Без бренда</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
                <Select className="input-sm" style={{ width: 170 }} value={flag} onChange={(e) => setFlag(e.target.value)}>
                  <option value="">Любые</option>
                  <option value="discount">Со скидкой</option>
                  <option value="new">Новинки</option>
                  <option value="hidden">Скрытые</option>
                  <option value="nophoto">Без фото</option>
                  <option value="build">Готовые сборки</option>
                </Select>
              </div>
            }
          />
        )}
      </Loaded>
    </>
  );
}

function ProductTable({
  products,
  cats,
  brands,
  filters,
  controls,
}: {
  products: Product[];
  cats: Category[];
  brands: Brand[];
  filters: { cat: string; brand: string; flag: string; q: string };
  controls: ReactNode;
}) {
  const nav = useNavigate();
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const brandById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);

  const rows = useMemo(() => {
    // a parent category also matches its subcategories
    const inCat = (id: number): boolean => {
      if (!filters.cat) return true;
      let c = catById.get(id);
      while (c) {
        if (String(c.id) === filters.cat) return true;
        c = c.parent_id ? catById.get(c.parent_id) : undefined;
      }
      return false;
    };
    const needle = filters.q.trim().toLowerCase();
    return products.filter((p) => {
      if (!inCat(p.category_id)) return false;
      if (filters.brand === "none" ? p.brand_id !== null : filters.brand && String(p.brand_id) !== filters.brand) return false;
      if (filters.flag === "discount" && !discountPct(p.price, p.old_price)) return false;
      if (filters.flag === "new" && !p.is_new) return false;
      if (filters.flag === "hidden" && p.enabled) return false;
      if (filters.flag === "nophoto" && p.image_count > 0) return false;
      if (filters.flag === "build" && p.components.length === 0) return false;
      if (needle) {
        const hay = [p.slug, p.sku, p.barcode, ...p.translations.map((t) => t.title)].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [products, filters, catById]);

  return (
    <>
      {controls}
      <Card flush>
        {rows.length === 0 ? (
          <Empty title="Ничего не найдено">Измените или сбросьте фильтры.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Категория</th>
                  <th>Бренд</th>
                  <th className="right">Цена</th>
                  <th className="right">Остаток</th>
                  <th>Метки</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const pct = discountPct(p.price, p.old_price);
                  const c = catById.get(p.category_id);
                  return (
                    <tr key={p.id} className="clickable" onClick={() => nav(`/products/${p.id}`)}>
                      <td>
                        <div className="title">{trTitle(p)}</div>
                        <div className="sub">
                          {p.slug}
                          {p.sku ? ` · ${p.sku}` : ""} · фото: {p.image_count}
                        </div>
                      </td>
                      <td className="dim">{c ? catName(c) : "—"}</td>
                      <td className="dim">{(p.brand_id && brandById.get(p.brand_id)?.name) || "—"}</td>
                      <td className="right">
                        <div className="price">{money(p.price, p.currency)}</div>
                        {pct > 0 && <div className="old-price">{money(p.old_price, p.currency)}</div>}
                      </td>
                      <td className="right mono">
                        {p.stock_qty === null ? <span className="muted">не учит.</span> : p.stock_qty}
                      </td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          {pct > 0 && <Badge tone="red">-{pct}%</Badge>}
                          {p.is_new && <Badge tone="blue">Новое</Badge>}
                          {p.components.length > 0 && <Badge tone="soft-blue">Сборка</Badge>}
                          {!p.enabled && <Badge>Скрыт</Badge>}
                          {!p.in_stock && <Badge tone="soft-amber">Под заказ</Badge>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="muted small">
        Показано {rows.length} из {products.length}. <Link to="/categories">Категории</Link> · <Link to="/brands">Бренды</Link>
      </p>
    </>
  );
}
