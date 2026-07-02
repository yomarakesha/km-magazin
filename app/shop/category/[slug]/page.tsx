import { Suspense } from "react";
import type { Metadata } from "next";
import { getCategory } from "@/lib/shop-server";
import { SITE_URL, abs, hreflang } from "@/lib/site";
import CategoryClient from "@/components/shop/CategoryClient";
import JsonLd from "@/components/JsonLd";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategory(slug);
  const title = cat?.name.ru || slug;
  const path = `/shop/category/${slug}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: `${title} — Магазин Kanagatly Mahabat`,
    description: `${title}: купить в Ашхабаде. Доставка, оплата при получении.`,
    alternates: { canonical: path, languages: hreflang(path) },
    openGraph: { type: "website", title, url: abs(path) },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = await getCategory(slug);
  const title = cat?.name.ru || slug;
  const path = `/shop/category/${slug}`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Магазин", item: abs("/shop") },
      { "@type": "ListItem", position: 2, name: title, item: abs(path) },
    ],
  };
  const itemListLd = cat && cat.products.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: title,
        itemListElement: cat.products.slice(0, 24).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: abs(`/shop/product/${p.slug}`),
          name: p.title.ru || p.slug,
        })),
      }
    : null;

  return (
    <>
      <JsonLd data={itemListLd ? [breadcrumbLd, itemListLd] : [breadcrumbLd]} />
      <Suspense fallback={<div className="shop-wrap"><p className="shop-empty">…</p></div>}>
        <CategoryClient slug={slug} />
      </Suspense>
    </>
  );
}
