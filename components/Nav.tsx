"use client";
import { useEffect, useState } from "react";
import { useLang, LANGS } from "@/lib/lang";
import Icon from "./Icon";

const SECTIONS = ["about", "services", "process", "contact"] as const;
const SHOP_LABEL: Record<string, string> = { ru: "Магазин", tk: "Dükan", en: "Shop" };

export default function Nav() {
  const { c, lang, setLang } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [prog, setProg] = useState(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("about");

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProg(max > 0 ? (el.scrollTop / max) * 100 : 0);
      setScrolled(el.scrollTop > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
      { threshold: 0.3 }
    );
    SECTIONS.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div id="prog" style={{ width: `${prog}%` }} />
      <nav className={`nav${scrolled ? " scrolled" : ""}${open ? " open" : ""}`}>
        <a className="lg" href="#top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/km-logo.png" alt="KM" />KM
        </a>
        <button className="burger" aria-label="menu" onClick={() => setOpen((v) => !v)}>
          <span /><span /><span />
        </button>
        <div className="links">
          {SECTIONS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className={active === id ? "act" : ""}
              onClick={() => setOpen(false)}
            >
              {c.nav[id]}
            </a>
          ))}
          <a href="/shop" className="nav-shop" onClick={() => setOpen(false)}>
            {SHOP_LABEL[lang] ?? "Магазин"}
          </a>
          <span className="lang">
            <Icon name="globe" className="gl" />
            {LANGS.map((l) => (
              <button key={l} className={lang === l ? "on" : ""} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </span>
        </div>
      </nav>
    </>
  );
}
