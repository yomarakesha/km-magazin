import { Suspense } from "react";
import type { Metadata } from "next";
import { getCategoryName } from "@/lib/shop-server";
import CategoryClient from "@/components/shop/CategoryClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const name = await getCategoryName(slug);
  const title = name?.ru || slug;
  return {
    title: `${title} — Магазин Kanagatly Mahabat`,
    description: `${title}: купить в Ашхабаде. Доставка, оплата при получении.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense fallback={<div className="shop-wrap"><p className="shop-empty">…</p></div>}>
      <CategoryClient slug={slug} />
    </Suspense>
  );
}
