"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type AdminProductImage } from "@/lib/admin-api";
import { useToast } from "../../../../_components/useToast";

export default function ProductImagesPage() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const router = useRouter();
  const { show, node } = useToast();
  const [list, setList] = useState<AdminProductImage[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.getProductImages(productId).then(setList).catch((e) => show(String(e), "err"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function upload() {
    const files = fileRef.current?.files;
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        await api.uploadProductImage(productId, form);
      }
      if (fileRef.current) fileRef.current.value = "";
      load();
      show("Загружено");
    } catch (e) { show(String(e), "err"); }
    finally { setBusy(false); }
  }

  async function remove(im: AdminProductImage) {
    if (!confirm("Удалить фото?")) return;
    await api.deleteProductImage(im.id).catch((e) => show(String(e), "err"));
    load();
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((m) => m.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    await api.reorderProductImages(productId, ids).catch((e) => show(String(e), "err"));
  }

  const url = (filename: string) => `${api.base}/media/products/${filename}`;

  return (
    <>
      <h1 className="adm-h1">Фото товара</h1>
      <p className="adm-sub">
        <button className="adm-btn ghost sm" onClick={() => router.push("/admin/shop/products")}>← К списку</button>
        {" "}Первое фото — главное (на карточке).
      </p>

      <div className="adm-block">
        <h3>Загрузить</h3>
        <input ref={fileRef} type="file" accept="image/*" multiple />
        <div className="adm-actions">
          <button className="adm-btn" onClick={upload} disabled={busy}>{busy ? "Загрузка…" : "Загрузить"}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {list.map((im, i) => (
          <div key={im.id} className="adm-block" style={{ padding: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url(im.filename)} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8 }} />
            <div style={{ display: "flex", gap: 4, marginTop: 6, justifyContent: "space-between" }}>
              <div className="ord">
                <button onClick={() => move(i, -1)} disabled={i === 0}>◀</button>
                <button onClick={() => move(i, 1)} disabled={i === list.length - 1}>▶</button>
              </div>
              <button className="adm-btn danger sm" onClick={() => remove(im)}>✕</button>
            </div>
          </div>
        ))}
      </div>
      {node}
    </>
  );
}
