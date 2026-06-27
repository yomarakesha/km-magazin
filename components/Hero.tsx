"use client";
import { useLang } from "@/lib/lang";

export default function Hero() {
  const { c } = useLang();
  return (
    <header className="hero" id="top">
      <div className="ring">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/km-logo.png" alt="" />
      </div>
      <div className="wrap">
        <span className="badge"><span className="pulse" />{c.heroKicker}</span>
        <h1>KM</h1>
        <div className="full">{c.brandFull}</div>
        <div className="tag">{c.tagline}</div>
        <p className="sub">{c.heroSub}</p>
        <div className="scroll"><span className="ln" />{c.heroScroll}</div>
      </div>
      <div className="meta">KM · Kanagatly Mahabat<br />2026</div>
    </header>
  );
}
