import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://localhost:8000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/shop`, changeFrequency: "daily", priority: 0.9 },
  ];
  try {
    const res = await fetch(`${API}/api/shop/sitemap`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const j = await res.json();
      for (const slug of j.categories ?? [])
        urls.push({ url: `${SITE}/shop/category/${slug}`, changeFrequency: "daily", priority: 0.7 });
      for (const slug of j.products ?? [])
        urls.push({ url: `${SITE}/shop/product/${slug}`, changeFrequency: "weekly", priority: 0.6 });
    }
  } catch {
    // backend down at build/runtime — return the static urls only
  }
  return urls;
}
