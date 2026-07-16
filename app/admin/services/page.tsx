"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type AdminService } from "@/lib/admin-api";
import { useToast } from "../_components/useToast";
import { useConfirm } from "../_components/useConfirm";

export default function ServicesPage() {
  const router = useRouter();
  const { show, node } = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const [list, setList] = useState<AdminService[]>([]);
  const [draft, setDraft] = useState<{ name: string; slug: string } | null>(null);

  const load = () => api.getServices().then(setList).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((s) => s.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    await api.reorderServices(ids).catch((e) => show(String(e), "err"));
  }

  async function toggle(s: AdminService) {
    await api.updateService(s.id, { enabled: !s.enabled }).catch((e) => show(String(e), "err"));
    load();
  }

  async function submitCreate() {
    if (!draft) return;
    const name = draft.name.trim();
    const slug = (draft.slug.trim() || slugify(name)).toLowerCase();
    if (!name) { show("Введите название услуги", "err"); return; }
    if (!slug) { show("Не удалось составить идентификатор — впишите латиницей", "err"); return; }
    try {
      const svc = await api.createService({
        slug, icon: "code", enabled: true,
        translations: ["ru", "tk", "en"].map((lang) => ({ lang, code: slug.toUpperCase(), short: name, title: name, body: "", feats: [] })),
      });
      router.push(`/admin/services/${svc.id}`);
    } catch (e) { show(String(e), "err"); }
  }

  async function remove(s: AdminService) {
    if (!(await ask(`Удалить услугу «${title(s)}»? Медиа также будут удалены.`))) return;
    await api.deleteService(s.id).catch((e) => show(String(e), "err"));
    load();
    show("Удалено");
  }

  return (
    <>
      <h1 className="adm-h1">Услуги</h1>
      <p className="adm-sub">Направления работ. Порядок отражается на сайте.</p>

      {list.map((s, i) => (
        <div className="adm-row" key={s.id} style={{ opacity: s.enabled ? 1 : 0.5 }}>
          <div className="ord">
            <button onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
            <button onClick={() => move(i, 1)} disabled={i === list.length - 1}>▼</button>
          </div>
          <div className="grow">
            <div className="t">{title(s)}</div>
            <div className="m">{s.slug} · {s.icon} · {s.media_count ?? 0} медиа</div>
          </div>
          <div className="adm-actions" style={{ margin: 0 }}>
            <button className="adm-btn ghost sm" onClick={() => toggle(s)}>{s.enabled ? "Скрыть" : "Показать"}</button>
            <Link className="adm-btn ghost sm" href={`/admin/services/${s.id}/media`}>Медиа</Link>
            <Link className="adm-btn sm" href={`/admin/services/${s.id}`}>Изменить</Link>
            <button className="adm-btn danger sm" onClick={() => remove(s)}>Удалить</button>
          </div>
        </div>
      ))}

      {draft ? (
        <div className="adm-block" style={{ marginTop: 16 }}>
          <h3>Новая услуга</h3>
          <div className="adm-field">
            <label>Название услуги</label>
            <input
              className="adm-in"
              autoFocus
              placeholder="напр. Солнечные панели"
              value={draft.name}
              onChange={(e) => setDraft({ name: e.target.value, slug: slugify(e.target.value) })}
            />
          </div>
          <div className="adm-field">
            <label>Идентификатор для ссылки (латиницей, меняется редко)</label>
            <input
              className="adm-in"
              placeholder="solar"
              value={draft.slug}
              onChange={(e) => setDraft((d) => (d ? { ...d, slug: e.target.value } : d))}
            />
          </div>
          <div className="adm-actions" style={{ margin: 0 }}>
            <button className="adm-btn" onClick={submitCreate}>Создать</button>
            <button className="adm-btn ghost" onClick={() => setDraft(null)}>Отмена</button>
          </div>
        </div>
      ) : (
        <div className="adm-actions">
          <button className="adm-btn" onClick={() => setDraft({ name: "", slug: "" })}>+ Добавить услугу</button>
        </div>
      )}
      {node}
      {confirmNode}
    </>
  );
}

function title(s: AdminService): string {
  return s.translations.find((t) => t.lang === "ru")?.title || s.slug;
}

/** Turn a (possibly Cyrillic) name into a URL-safe latin slug. */
function slugify(name: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return name
    .toLowerCase()
    .split("")
    .map((ch) => (ch in map ? map[ch] : ch))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
