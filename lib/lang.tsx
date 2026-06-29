"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { type Content, type Lang } from "./content";

interface LangCtx { lang: Lang; setLang: (l: Lang) => void; c: Content; mediaBase: string }
const Ctx = createContext<LangCtx | null>(null);

const LANGS: Lang[] = ["ru", "tk", "en"];

export function LangProvider({
  content,
  mediaBase,
  children,
}: {
  content: Record<Lang, Content>;
  mediaBase: string;
  children: React.ReactNode;
}) {
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

  return (
    <Ctx.Provider value={{ lang, setLang, c: content[lang], mediaBase }}>
      {children}
    </Ctx.Provider>
  );
}

export const useLang = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
};
export { LANGS };
