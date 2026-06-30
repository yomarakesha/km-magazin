"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CatalogCategory } from "@/lib/shop-types";
import { SHOP, waLink } from "@/lib/shop-config";
import { LANGS, ShopProvider, useShop } from "./shop-context";
import CartDrawer from "./CartDrawer";
import QuickView from "./QuickView";
import CompareBar from "./CompareBar";
import CompareView from "./CompareView";
import Toast from "./ui/Toast";
import Icon from "./ui/Icon";

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
    <ShopProvider mediaBase={mediaBase} categories={categories}>
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
  const { t, lang, setLang, count, openCart } = useShop();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // hide on scroll-down, slide back down on scroll-up (rAF-throttled, jitter-guarded)
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      setScrolled(y > 4);
      if (y < 90) {
        setHidden(false);
      } else {
        const delta = y - last;
        if (Math.abs(delta) > 6) {
          if (delta > 0 && y > 120) setHidden(true);
          else if (delta < 0) setHidden(false);
        }
      }
      last = y;
      ticking = false;
    };
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
    <header className={`shop-head ${hidden ? "hide" : ""} ${scrolled ? "scrolled" : ""}`}>
      <div className="shop-wrap shop-head-in">
        <Link href="/shop" className="shop-logo">KM <span>{t("shop")}</span></Link>
        <form className="shop-search" onSubmit={submitSearch}>
          <Icon name="search" size={16} className="shop-search-ic" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("searchTitle")} />
          <button type="submit" aria-label={t("searchTitle")}><Icon name="arrow" size={16} /></button>
        </form>
        <div className="shop-head-right">
          <div className="shop-langs">
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
          <a className="shop-foot-cta" href={`tel:${SHOP.phone.replace(/\s/g, "")}`}><Icon name="phone" size={15} /> {SHOP.phone}</a>
          <a className="shop-foot-cta wa" href={waLink(t("needHelp"))} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={15} /> WhatsApp</a>
        </div>
      </div>
      <div className="shop-wrap">
        <Link href="/" className="shop-foot-link"><Icon name="arrow" size={15} className="flip" /> {t("backToSite")}</Link>
      </div>
    </footer>
  );
}
