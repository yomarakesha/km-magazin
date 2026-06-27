"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useLang } from "@/lib/lang";

type Item = { kind: "video" | "img"; src: string } | null;
const Ctx = createContext<(i: Item) => void>(() => {});

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<Item>(null);
  const { c } = useLang();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setItem(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Ctx.Provider value={setItem}>
      {children}
      {item && (
        <div className="lb" onClick={(e) => { if (e.target === e.currentTarget) setItem(null); }}>
          <button className="x" title={c.close} onClick={() => setItem(null)}>×</button>
          <div className="inner">
            {item.kind === "video" ? (
              <video src={item.src} controls autoPlay loop playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.src} alt="" />
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useLightbox = () => useContext(Ctx);
