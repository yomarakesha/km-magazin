"use client";
import { MEDIA, captionFor, type Section } from "@/lib/content";
import { useLang } from "@/lib/lang";
import { useLightbox } from "./Lightbox";
import Icon from "./Icon";

type Item = { kind: "video" | "img"; name: string; still?: boolean };

export default function Gallery({ section }: { section: Section }) {
  const { c } = useLang();
  const open = useLightbox();
  const m = MEDIA[section.id];
  const still = m.still ?? [];
  const items: Item[] = [
    ...m.videos.map((v) => ({ kind: "video" as const, name: v, still: still.includes(v) })),
    ...m.photos.map((p) => ({ kind: "img" as const, name: p })),
  ];

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

  const renderCard = (it: Item) => {
    if (it.kind === "video") {
      const src = `/assets/video/${it.name}.mp4`;
      const poster = `/assets/img/${it.name}-poster.jpg`;
      return (
        <figure key={it.name} className="card" onClick={() => open({ kind: "video", src })}>
          {it.still ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" loading="lazy" />
          ) : (
            <video src={src} poster={poster} muted autoPlay loop playsInline preload="metadata" />
          )}
          <span className="play"><Icon name="camera" className="pic" /><b>{c.play}</b></span>
          <figcaption><span className="dot" />{c.capVideo}</figcaption>
        </figure>
      );
    }
    return (
      <figure key={it.name} className="card" onClick={() => open({ kind: "img", src: `/assets/img/${it.name}.jpg` })}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/img/${it.name}.jpg`} alt="" loading="lazy" />
        <figcaption><span className="dot" />{captionFor(it.name, c)}</figcaption>
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
