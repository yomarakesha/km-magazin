"use client";
import type { MediaItem, Section } from "@/lib/content";
import { useLang } from "@/lib/lang";
import { useLightbox } from "./Lightbox";
import Icon from "./Icon";

function imgCaption(item: Extract<MediaItem, { kind: "img" }>): string | null {
  if (item.caption === "chapar") return "Chapar Express";
  if (item.caption === "vms") return "Kanagatly VMS";
  return null;
}

export default function Gallery({ section }: { section: Section }) {
  const { c, mediaBase } = useLang();
  const open = useLightbox();
  const items: MediaItem[] = section.media ?? [];
  const url = (p: string) => `${mediaBase}/${p}`;

  if (items.length === 0) {
    return (
      <div className="gal-empty">
        <Icon name={section.icon} className="ev-ic" />
        <span className="ev-tag">{section.short}</span>
      </div>
    );
  }

  // Layout: programming gets a bespoke staggered mosaic; galleries with ≤4
  // media render as a 1:1 quad (padded with a branded tile when only 3 exist);
  // larger sets (e.g. fire) keep the flowing grid.
  const isProg = section.id === "programming";
  const quad = !isProg && items.length <= 4;
  const cls = isProg ? "gal gal-prog" : quad ? "gal gal-quad" : "gal";

  const renderCard = (it: MediaItem) => {
    if (it.kind === "video") {
      const src = url(it.src);
      const poster = it.poster ? url(it.poster) : undefined;
      return (
        <figure key={it.src} className="card" onClick={() => open({ kind: "video", src })}>
          {it.still && poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" loading="lazy" />
          ) : (
            <video src={src} poster={poster} muted autoPlay loop playsInline preload="metadata" />
          )}
          <span className="play"><Icon name="camera" className="pic" /><b>{c.play}</b></span>
        </figure>
      );
    }
    const src = url(it.src);
    const cap = imgCaption(it);
    return (
      <figure key={it.src} className="card" onClick={() => open({ kind: "img", src })}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" loading="lazy" />
        {cap && <figcaption><span className="dot" />{cap}</figcaption>}
      </figure>
    );
  };

  return (
    <div className={cls}>
      {items.map(renderCard)}
      {quad && items.length === 3 && (
        <div className="card gal-fill" aria-hidden>
          <Icon name={section.icon} className="gf-ic" />
          <span className="gf-tag">{section.short}</span>
        </div>
      )}
    </div>
  );
}
