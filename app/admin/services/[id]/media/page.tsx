"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type AdminMedia } from "@/lib/admin-api";
import { useToast } from "../../../_components/useToast";

const MEDIA_BASE = `${api.base}/media`;

export default function MediaPage() {
  const { id } = useParams<{ id: string }>();
  const serviceId = Number(id);
  const router = useRouter();
  const { show, node } = useToast();
  const [list, setList] = useState<AdminMedia[]>([]);
  const [kind, setKind] = useState<"img" | "video">("img");
  const [caption, setCaption] = useState("photo");
  const [still, setStill] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);

  const load = () => api.getMedia(serviceId).then(setList).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { show("Выберите файл", "err"); return; }
    const form = new FormData();
    form.append("kind", kind);
    form.append("caption_kind", caption);
    form.append("still", String(still));
    form.append("file", file);
    const poster = posterRef.current?.files?.[0];
    if (kind === "video" && poster) form.append("poster", poster);
    setBusy(true);
    try {
      await api.uploadMedia(serviceId, form);
      if (fileRef.current) fileRef.current.value = "";
      if (posterRef.current) posterRef.current.value = "";
      show("Загружено");
      load();
    } catch (e) { show(String(e), "err"); }
    finally { setBusy(false); }
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((m) => m.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    await api.reorderMedia(serviceId, ids).catch((e) => show(String(e), "err"));
  }

  async function del(m: AdminMedia) {
    if (!confirm("Удалить файл?")) return;
    await api.deleteMedia(m.id).catch((e) => show(String(e), "err"));
    load();
  }

  async function toggleStill(m: AdminMedia) {
    await api.updateMedia(m.id, { still: !m.still }).catch((e) => show(String(e), "err"));
    load();
  }

  return (
    <>
      <h1 className="adm-h1">Медиа услуги</h1>
      <p className="adm-sub">
        <button className="adm-btn ghost sm" onClick={() => router.push("/admin/services")}>← К услугам</button>
      </p>

      <form className="adm-block" onSubmit={upload}>
        <h3>Загрузить файл</h3>
        <div className="adm-field"><label>Тип</label>
          <select className="adm-in" value={kind} onChange={(e) => setKind(e.target.value as "img" | "video")}>
            <option value="img">Фото</option>
            <option value="video">Видео</option>
          </select>
        </div>
        <div className="adm-field"><label>Файл ({kind === "video" ? "mp4" : "jpg/png"})</label>
          <input className="adm-in" type="file" ref={fileRef} accept={kind === "video" ? "video/*" : "image/*"} />
        </div>
        {kind === "video" && (
          <>
            <div className="adm-field"><label>Постер (jpg, необязательно)</label>
              <input className="adm-in" type="file" ref={posterRef} accept="image/*" />
            </div>
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--mono)", fontSize: 13, marginBottom: 14 }}>
              <input type="checkbox" checked={still} onChange={(e) => setStill(e.target.checked)} />
              Статичный постер (не проигрывать в ленте)
            </label>
          </>
        )}
        {kind === "img" && (
          <div className="adm-field"><label>Подпись</label>
            <select className="adm-in" value={caption} onChange={(e) => setCaption(e.target.value)}>
              <option value="photo">Фото</option>
              <option value="vms">Kanagatly VMS</option>
              <option value="chapar">Chapar Express</option>
            </select>
          </div>
        )}
        <button className="adm-btn" type="submit" disabled={busy}>{busy ? "Загрузка…" : "Загрузить"}</button>
      </form>

      <div className="adm-media">
        {list.map((m, i) => (
          <figure key={m.id}>
            {m.kind === "video" && !m.poster ? (
              <video src={`${MEDIA_BASE}/video/${m.filename}`} muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${MEDIA_BASE}/img/${m.kind === "video" ? m.poster : m.filename}`} alt="" />
            )}
            <div className="mc">
              <span className="fn">{m.kind === "video" ? "🎬 " : "🖼 "}{m.filename}</span>
              <div className="adm-actions" style={{ margin: 0, gap: 6 }}>
                <button className="adm-btn ghost sm" onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
                <button className="adm-btn ghost sm" onClick={() => move(i, 1)} disabled={i === list.length - 1}>▼</button>
                {m.kind === "video" && (
                  <button className="adm-btn ghost sm" onClick={() => toggleStill(m)}>{m.still ? "▶ вкл" : "⏸ стоп"}</button>
                )}
                <button className="adm-btn danger sm" onClick={() => del(m)}>✕</button>
              </div>
            </div>
          </figure>
        ))}
      </div>
      {node}
    </>
  );
}
