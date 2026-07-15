"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, type AdminCategory, type AdminProduct } from "@/lib/admin-api";
import ProductForm, { type ProductFormValue } from "@/components/admin/ProductForm";
import { useToast } from "../../../_components/useToast";

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { show, node } = useToast();
  const [p, setP] = useState<AdminProduct | null>(null);
  const [cats, setCats] = useState<AdminCategory[]>([]);

  useEffect(() => {
    api.getProduct(Number(id)).then(setP).catch((e) => show(String(e), "err"));
    api.getCategories().then(setCats).catch((e) => show(String(e), "err"));
  }, [id, show]);

  if (!p) return <div className="adm-loading">Загрузка…</div>;

  const initial: ProductFormValue = {
    slug: p.slug, category_id: p.category_id, price: p.price, old_price: p.old_price, currency: p.currency,
    in_stock: p.in_stock, stock_qty: p.stock_qty, sku: p.sku, barcode: p.barcode, enabled: p.enabled,
    translations: p.translations, attributes: p.attributes,
  };

  async function handle(payload: ProductFormValue) {
    await api.updateProduct(p!.id, payload);
    show("Сохранено");
  }

  return (
    <>
      <h1 className="adm-h1">Товар: {p.translations.find((t) => t.lang === "ru")?.title || p.slug}</h1>
      <p className="adm-sub">
        <button className="adm-btn ghost sm" onClick={() => router.push("/admin/shop/products")}>← К списку</button>
        {" "}
        <Link className="adm-btn ghost sm" href={`/admin/shop/products/${p.id}/images`}>Фото товара</Link>
      </p>
      <ProductForm initial={initial} categories={cats} submitLabel="Сохранить" onSubmit={handle} />
      {node}
    </>
  );
}
