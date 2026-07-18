"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CatalogCategory, ShopService, ShopSettings } from "@/lib/shop-types";
import { LANGS, ShopProvider, useShop } from "./shop-context";
import CartDrawer from "./CartDrawer";
import QuickView from "./QuickView";
import CompareBar from "./CompareBar";
import CompareView from "./CompareView";
import Toast from "./ui/Toast";
import Icon from "./ui/Icon";

const LANG_LABEL: Record<string, string> = { ru: "RU", tk: "TK", en: "EN" };

export default function ShopChrome({
  mediaBase,
  categories,
  settings,
  services,
  children,
}: {
  mediaBase: string;
  categories: CatalogCategory[];
  settings?: ShopSettings;
  services?: ShopService[];
  children: React.ReactNode;
}) {
  return (
    <ShopProvider mediaBase={mediaBase} categories={categories} settings={settings} services={services}>
      <Header />
      <main className="shop-main">{children}</main>
      <Footer />
      <CartDrawer />
      <QuickView />
      <CompareBar />
      <CompareView />
      <ToastHost />
    </ShopProvider>
  );
}

function ToastHost() {
  const { toast, t, openCart } = useShop();
  if (!toast) return null;
  return <Toast key={toast.id} message={`${toast.message}`} actionLabel={t("cart")} onAction={openCart} />;
}

function Header() {
  const { t, lang, setLang, count, openCart, favs } = useShop();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);

  // header stays pinned at all times; only track scroll for the elevation shadow
  useEffect(() => {
    let ticking = false;
    const update = () => { setScrolled(window.scrollY > 4); ticking = false; };
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/shop/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <header className={`shop-head ${scrolled ? "scrolled" : ""}`}>
      <div className="shop-wrap shop-head-in">
        <Link href="/shop" className="shop-logo">KM <span>{t("shop")}</span></Link>
        <Link href="/" className="shop-back-site" title={t("backToSite")}>
          <Icon name="arrow" size={15} className="flip" /> <span>{t("backToSite")}</span>
        </Link>
        <form className="shop-search" onSubmit={submitSearch}>
          <Icon name="search" size={16} className="shop-search-ic" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("searchTitle")} />
          <button type="submit" aria-label={t("searchTitle")}><Icon name="arrow" size={16} /></button>
        </form>
        <div className="shop-head-right">
          <Link href="/shop/orders" className="shop-fav-btn" aria-label={t("myOrders")} title={t("myOrders")}>
            <Icon name="box" size={18} />
          </Link>
          <Link href="/shop/favorites" className="shop-fav-btn" aria-label={t("favorites")} title={t("favorites")}>
            <Icon name="heart" size={18} />
            {favs.length > 0 && <span className="shop-cart-badge">{favs.length}</span>}
          </Link>
          <div className="shop-langs">
            <Icon name="globe" size={14} className="shop-langs-gl" />
            {LANGS.map((l) => (
              <button key={l} className={l === lang ? "on" : ""} onClick={() => setLang(l)}>{LANG_LABEL[l]}</button>
            ))}
          </div>
          <button className="shop-cart-btn" onClick={openCart} aria-label={t("cart")}>
            <Icon name="cart" size={18} /> <span>{t("cart")}</span>
            {count > 0 && <span className="shop-cart-badge">{count}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { t, pick, settings } = useShop();
  return (
    <footer className="shop-foot">
      <div className="shop-wrap shop-foot-in">
        <div className="shop-foot-col">
          <div className="shop-foot-h">{t("delivery")}</div>
          <p>{t("deliveryNote")}</p>
        </div>
        <div className="shop-foot-col">
          <div className="shop-foot-h">{t("guarantee")}</div>
          <p>{pick(settings.address)}</p>
        </div>
        <div className="shop-foot-col">
          <div className="shop-foot-h">{t("needHelp")}</div>
          {settings.phone && <a className="shop-foot-cta" href={`tel:${settings.phone.replace(/\s/g, "")}`}><Icon name="phone" size={15} /> {settings.phone}</a>}
        </div>
      </div>
      <div className="shop-wrap">
        <Link href="/" className="shop-foot-link"><Icon name="arrow" size={15} className="flip" /> {t("backToSite")}</Link>
      </div>
    </footer>
  );
}
