"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type AdminCategory, type AdminProduct } from "@/lib/admin-api";
import ProductForm, { blankProduct, type ProductFormValue } from "@/components/admin/ProductForm";
import { useToast } from "../../../_components/useToast";

export default function ProductCreate() {
  const router = useRouter();
  const sp = useSearchParams();
  const { show, node } = useToast();
  const [cats, setCats] = useState<AdminCategory[]>([]);

  useEffect(() => { api.getCategories().then(setCats).catch((e) => show(String(e), "err")); }, [show]);

  const preCat = Number(sp.get("category_id")) || 0;

  async function handle(payload: ProductFormValue) {
    const p = (await api.createProduct(payload)) as AdminProduct;
    show("Товар создан");
    router.push(`/admin/shop/products/${p.id}/images`);
  }

  return (
    <>
      <h1 className="adm-h1">Новый товар</h1>
      <p className="adm-sub">
        <button className="adm-btn ghost sm" onClick={() => router.push("/admin/shop/products")}>← К списку</button>
        {" "}Заполните поля вручную. После сохранения можно загрузить фото.
      </p>
      <ProductForm initial={blankProduct(preCat)} categories={cats} submitLabel="Создать товар" onSubmit={handle} />
      {node}
    </>
  );
}
