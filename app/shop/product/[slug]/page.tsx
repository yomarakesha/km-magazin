import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/shop-server";
import ProductView from "@/components/shop/ProductView";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Магазин — Kanagatly Mahabat" };
  const title = p.title.ru || p.slug;
  const desc = p.short.ru || `${title} — купить в Ашхабаде.`;
  const image = p.images[0] ? `${p.mediaBase}/${p.images[0]}` : undefined;
  return {
    title: `${title} — ${p.price} ${p.currency} | KM`,
    description: desc,
    openGraph: { title, description: desc, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return <ProductView p={product} />;
}
