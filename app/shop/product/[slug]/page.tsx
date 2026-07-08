import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/shop-server";
import { SITE_URL, abs, hreflang } from "@/lib/site";
import ProductView from "@/components/shop/ProductView";
import JsonLd from "@/components/JsonLd";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Магазин — Kanagatly Mahabat" };
  const title = p.title.ru || p.slug;
  const desc = p.short.ru || `${title} — купить в Ашхабаде.`;
  const image = p.images[0] ? `${p.mediaBase}/${p.images[0]}` : undefined;
  const path = `/shop/product/${p.slug}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: `${title} — ${p.price} ${p.currency} | KM`,
    description: desc,
    alternates: { canonical: path, languages: hreflang(path) },
    openGraph: {
      type: "website",
      title,
      description: desc,
      url: abs(path),
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const title = product.title.ru || product.slug;
  const path = `/shop/product/${product.slug}`;
  // tracked stock at 0 = genuinely sold out; in_stock=false without tracking
  // means the store orders it on demand (PreOrder)
  const availability =
    product.stock_qty === 0
      ? "https://schema.org/OutOfStock"
      : product.in_stock
        ? "https://schema.org/InStock"
        : "https://schema.org/PreOrder";
  // price is honored for 30 days — matches how the store quotes offers
  // (server component: computed once per request, purity rule doesn't apply)
  // eslint-disable-next-line react-hooks/purity
  const priceValidUntil = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  const brandAttr = product.attributes.find((a) => a.key === "brand")?.value;

  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description: product.short.ru || title,
    image: product.images.map((im) => `${product.mediaBase}/${im}`),
    sku: product.sku || String(product.id),
    ...(brandAttr ? { brand: { "@type": "Brand", name: brandAttr } } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency,
      price: product.price,
      priceValidUntil,
      availability,
      url: abs(path),
      seller: { "@type": "Organization", name: "Kanagatly Mahabat" },
    },
  };
  if (product.rating && product.rating_count) {
    productLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.rating_count,
    };
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Магазин", item: abs("/shop") },
      { "@type": "ListItem", position: 2, name: title, item: abs(path) },
    ],
  };

  return (
    <>
      <JsonLd data={[productLd, breadcrumbLd]} />
      <ProductView p={product} />
    </>
  );
}
