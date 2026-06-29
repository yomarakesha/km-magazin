/**
 * Dumps the static CONTENT + MEDIA from lib/content.ts into a JSON file the
 * Python backend seed (backend/app/seed.py) consumes. Run: `npm run dump:seed`.
 * This keeps lib/content.ts as the single source of truth for the initial data.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CONTENT, MEDIA, type Lang } from "../lib/content";

const LANGS: Lang[] = ["ru", "tk", "en"];

// Map flat Content fields into named content blocks (must match BLOCK_KEYS / the
// builder's merge logic in backend/app/content_builder.py).
function blocksFor(lang: Lang) {
  const c = CONTENT[lang];
  return {
    meta: { brandFull: c.brandFull, tagline: c.tagline },
    hero: { heroKicker: c.heroKicker, heroSub: c.heroSub, heroScroll: c.heroScroll },
    marquee: { marquee: c.marquee },
    nav: { nav: c.nav },
    about: { aboutCode: c.aboutCode, aboutTitle: c.aboutTitle, aboutBody: c.aboutBody, stats: c.stats },
    services: {
      servicesCode: c.servicesCode,
      servicesTitle: c.servicesTitle,
      servicesSub: c.servicesSub,
      more: c.more,
      mediaSoon: c.mediaSoon,
    },
    process: { processCode: c.processCode, processTitle: c.processTitle, process: c.process },
    advantages: { advCode: c.advCode, advTitle: c.advTitle, adv: c.adv },
    contact: {
      contactCode: c.contactCode,
      contactTitle: c.contactTitle,
      contactSub: c.contactSub,
      catalogCta: c.catalogCta,
      lbl: c.lbl,
      capVideo: c.capVideo,
      capPhoto: c.capPhoto,
      close: c.close,
      play: c.play,
      contact: c.contact,
    },
  };
}

function captionKind(stem: string): "photo" | "vms" | "chapar" {
  if (stem.startsWith("prog")) return "chapar";
  if (stem.startsWith("cctv-vms")) return "vms";
  return "photo";
}

// Services: structure/icon/order from ru.sections, translations from each lang.
const base = CONTENT.ru.sections;
const services = base.map((s, idx) => {
  const m = MEDIA[s.id] ?? { videos: [], photos: [], still: [] };
  const still = m.still ?? [];
  const media = [
    ...m.videos.map((stem) => ({
      kind: "video" as const,
      filename: `${stem}.mp4`,
      poster: `${stem}-poster.jpg`,
      still: still.includes(stem),
      caption_kind: "photo" as const,
    })),
    ...m.photos.map((stem) => ({
      kind: "img" as const,
      filename: `${stem}.jpg`,
      poster: null,
      still: false,
      caption_kind: captionKind(stem),
    })),
  ];
  const translations: Record<string, unknown> = {};
  for (const lang of LANGS) {
    const sec = CONTENT[lang].sections.find((x) => x.id === s.id)!;
    translations[lang] = {
      code: sec.code,
      short: sec.short,
      title: sec.title,
      body: sec.body,
      feats: sec.feats,
    };
  }
  return { slug: s.id, icon: s.icon, sort_order: idx, enabled: true, translations, media };
});

const blocks: Record<string, unknown> = {};
for (const lang of LANGS) blocks[lang] = blocksFor(lang);

const out = { langs: LANGS, blocks, services };

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = resolve(__dirname, "../backend/app/seed_data.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 2), "utf8");
console.log(`Wrote ${target} (${services.length} services, ${LANGS.length} langs)`);
