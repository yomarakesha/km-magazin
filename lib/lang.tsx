"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { CONTENT, type Content, type Lang } from "./content";

interface LangCtx { lang: Lang; setLang: (l: Lang) => void; c: Content }
const Ctx = createContext<LangCtx>({ lang: "ru", setLang: () => {}, c: CONTENT.ru });

const LANGS: Lang[] = ["ru", "tk", "en"];

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("km_lang") as Lang | null;
      if (saved && LANGS.includes(saved)) setLangState(saved);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("km_lang", l); } catch {}
    document.documentElement.lang = l;
  };

  return <Ctx.Provider value={{ lang, setLang, c: CONTENT[lang] }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
export { LANGS };
