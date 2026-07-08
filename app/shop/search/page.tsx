import { Suspense } from "react";
import type { Metadata } from "next";
import { getSearch } from "@/lib/shop-server";
import { SITE_URL } from "@/lib/site";
import SearchClient from "@/components/shop/SearchClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function toQuery(sp: Record<string, string | string[] | undefined>): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") next.set(k, v);
    else if (Array.isArray(v) && v[0] != null) next.set(k, v[0]);
  }
  return next.toString();
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return {
    metadataBase: new URL(SITE_URL),
    title: q ? `Поиск: ${q} — Магазин Kanagatly Mahabat` : "Поиск — Магазин Kanagatly Mahabat",
    // every sort/offset permutation canonicalizes to the plain query URL
    alternates: { canonical: q ? `/shop/search?q=${encodeURIComponent(q)}` : "/shop/search" },
  };
}

/** First page of results is rendered on the server so search URLs are
 * crawlable; SearchClient hydrates and handles sort/load-more from there. */
export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const query = toQuery(await searchParams);
  const initial = await getSearch(query);
  return (
    <Suspense fallback={<div className="shop-wrap"><p className="shop-empty">…</p></div>}>
      <SearchClient initial={initial} initialQuery={query} />
    </Suspense>
  );
}
