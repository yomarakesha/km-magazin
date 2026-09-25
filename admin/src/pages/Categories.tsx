import { useNavigate } from "react-router-dom";
import { api, mediaUrl, type Category } from "../api";
import { Badge, Button, Card, Empty, Loaded, PageHead, useAction, useLoad } from "../ui";
import { catName, categoryTree } from "./Products";

export default function Categories() {
  const nav = useNavigate();
  const state = useLoad(api.categories);
  const { busy, run } = useAction();

  /** Swap a category with its neighbour among siblings and persist the order. */
  async function move(cats: Category[], c: Category, dir: -1 | 1) {
    const siblings = cats.filter((x) => x.parent_id === c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    const i = siblings.findIndex((x) => x.id === c.id);
    const j = i + dir;
    if (j < 0 || j >= siblings.length) return;
    [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
    // reorder endpoint takes the full list; keep other groups in place
    const others = cats.filter((x) => x.parent_id !== c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    await run(() => api.reorderCategories([...siblings, ...others].map((x) => x.id)));
    state.reload();
  }

  return (
    <>
      <PageHead
        title="Категории"
        sub="Меню каталога: Компьютеры, Безопасность, Сетевое оборудование и подкатегории"
        actions={<Button onClick={() => nav("/categories/new")}>+ Новая категория</Button>}
      />
      <Card flush>
        <Loaded state={state}>
          {(cats) =>
            cats.length === 0 ? (
              <Empty title="Категорий нет" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Slug</th>
                      <th className="right">Товаров</th>
                      <th>Фильтры</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {categoryTree(cats).map(({ cat: c, depth }) => (
                      <tr key={c.id} className="clickable" onClick={() => nav(`/categories/${c.id}`)}>
                        <td>
                          <div className="title row" style={{ paddingLeft: depth * 24, fontWeight: depth ? 400 : 600, gap: 10, flexWrap: "nowrap" }}>
                            {c.image && <img className="thumb" src={mediaUrl(c.image)} alt="" style={{ width: 36, height: 36, borderRadius: 8 }} />}
                            {depth > 0 && <span className="muted">└ </span>}
                            {catName(c)} {!c.enabled && <Badge>Скрыта</Badge>}
                          </div>
                        </td>
                        <td className="dim">{c.slug}</td>
                        <td className="right mono">{c.product_count}</td>
                        <td className="dim small">
                          {c.attributes.map((a) => a.translations.find((t) => t.lang === "ru")?.label || a.key).join(", ") || "—"}
                        </td>
                        <td className="right nowrap" onClick={(e) => e.stopPropagation()}>
                          <button className="icon-btn" disabled={busy} onClick={() => move(cats, c, -1)} aria-label="Выше">
                            ↑
                          </button>
                          <button className="icon-btn" disabled={busy} onClick={() => move(cats, c, 1)} aria-label="Ниже">
                            ↓
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </Loaded>
      </Card>
    </>
  );
}
