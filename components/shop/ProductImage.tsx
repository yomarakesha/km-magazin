"use client";
import { useState } from "react";
import Icon from "./ui/Icon";

type Variant = "card" | "pdp" | "thumb" | "mini";

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// curated, on-brand soft gradients (no loud random hues — premium neutrals + faint green/teal)
const GRADS = [
  "linear-gradient(135deg,#eef3f0,#e1ebe5)",
  "linear-gradient(140deg,#edf3f2,#dde9e4)",
  "linear-gradient(135deg,#eef2f6,#e1e9ef)",
  "linear-gradient(140deg,#f0f1ed,#e5e9e3)",
  "linear-gradient(135deg,#e9f2ee,#e6eee9)",
  "linear-gradient(140deg,#eef1f4,#e2e8ec)",
];

function glyphFor(category?: string): "eye" | "grid" | "box" | "shield" {
  const c = (category || "").toLowerCase();
  if (/kamer|camera|cctv|video|faceid/.test(c)) return "eye";
  if (/set|network|lan|router|switch|wifi/.test(c)) return "grid";
  if (/secur|alarm|fire|access/.test(c)) return "shield";
  return "box";
}

/** Single source of truth for product imagery. Real photo → CLS-safe fade-in.
 *  No photo → an intentional branded placeholder (seeded gradient + category
 *  glyph + texture + monogram), so empty products never look like missing assets. */
export default function ProductImage({
  src,
  alt,
  seed,
  category,
  variant = "card",
}: {
  src?: string | null;
  alt?: string;
  seed: string | number;
  category?: string;
  variant?: Variant;
}) {
  const [loaded, setLoaded] = useState(false);

  if (src) {
    return (
      <span className={`shop-img ${loaded ? "on" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt || ""} loading="lazy" decoding="async" onLoad={() => setLoaded(true)} />
      </span>
    );
  }

  const grad = GRADS[hash(String(seed)) % GRADS.length];
  const glyph = glyphFor(category);
  const glyphSize = variant === "pdp" ? 96 : variant === "card" ? 54 : variant === "thumb" ? 22 : 18;

  return (
    <span className={`shop-ph shop-ph-${variant}`} style={{ backgroundImage: grad }} aria-hidden="true">
      <span className="shop-ph-tex" />
      <Icon name={glyph} size={glyphSize} strokeWidth={1.1} />
      {(variant === "card" || variant === "pdp") && <span className="shop-ph-mono">KM</span>}
    </span>
  );
}
