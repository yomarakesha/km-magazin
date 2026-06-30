"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CatalogCategory } from "@/lib/shop-types";
import { SHOP, waLink } from "@/lib/shop-config";
import { LANGS, ShopProvider, useShop } from "./shop-context";

const LANG_LABEL: Record<string, string> = { ru: "РУ", tk: "TK", en: "EN" };

export default function ShopChrome({
  mediaBase,
  categories,
  children,
}: {
  mediaBase: string;
  categories: CatalogCategory[];
  children: React.ReactNode;
}) {
  return (
    <ShopProvider mediaBase={mediaBase}>
      <Header categories={categories} />
      <main className="shop-main">{children}</main>
      <Footer />
    </ShopProvider>
  );
}

function Header({ categories }: { categories: CatalogCategory[] }) {
  const { t, pick, lang, setLang, count } = useShop();
  const router = useRouter();
  const [q, setQ] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/shop/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <header className="shop-head">
      <div className="shop-wrap shop-head-in">
        <Link href="/shop" className="shop-logo">KM <span>{t("shop")}</span></Link>
        <nav className="shop-cats">
          <Link href="/shop">{t("catalog")}</Link>
          {categories.map((c) => (
            <Link key={c.slug} href={`/shop/category/${c.slug}`}>{pick(c.name)}</Link>
          ))}
        </nav>
        <form className="shop-search" onSubmit={submitSearch}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("searchTitle")} />
          <button type="submit" aria-label={t("searchTitle")}>🔍</button>
        </form>
        <div className="shop-head-right">
          <div className="shop-langs">
            {LANGS.map((l) => (
              <button key={l} className={l === lang ? "on" : ""} onClick={() => setLang(l)}>{LANG_LABEL[l]}</button>
            ))}
          </div>
          <Link href="/shop/cart" className="shop-cart-link">
            🛒 {t("cart")}{count > 0 && <span className="shop-cart-badge">{count}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { t, lang } = useShop();
  return (
    <footer className="shop-foot">
      <div className="shop-wrap shop-foot-in">
        <div className="shop-foot-col">
          <div className="shop-foot-h">{t("delivery")}</div>
          <p>{t("deliveryNote")}</p>
        </div>
        <div className="shop-foot-col">
          <div className="shop-foot-h">{t("guarantee")}</div>
          <p>{SHOP.address[lang] ?? SHOP.address.ru}</p>
        </div>
        <div className="shop-foot-col">
          <div className="shop-foot-h">{t("needHelp")}</div>
          <a className="shop-foot-cta" href={`tel:${SHOP.phone.replace(/\s/g, "")}`}>📞 {SHOP.phone}</a>
          <a className="shop-foot-cta wa" href={waLink(t("needHelp"))} target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
      </div>
      <div className="shop-wrap">
        <Link href="/" className="shop-foot-link">← {t("backToSite")}</Link>
      </div>
    </footer>
  );
}
