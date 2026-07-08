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

  async function create() {
    const slug = prompt("Slug новой услуги (латиницей, напр. solar):");
    if (!slug) return;
    try {
      const svc = await api.createService({
        slug, icon: "code", enabled: true,
        translations: ["ru", "tk", "en"].map((lang) => ({ lang, code: slug.toUpperCase(), short: slug, title: slug, body: "", feats: [] })),
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

      <div className="adm-actions">
        <button className="adm-btn" onClick={create}>+ Добавить услугу</button>
      </div>
      {node}
      {confirmNode}
    </>
  );
}

function title(s: AdminService): string {
  return s.translations.find((t) => t.lang === "ru")?.title || s.slug;
}
