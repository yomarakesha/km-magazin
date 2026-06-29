import { CONTENT, MEDIA, type Content, type Lang, type MediaItem } from "./content";

export interface SiteData {
  content: Record<Lang, Content>;
  mediaBase: string;
}

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const LANGS: Lang[] = ["ru", "tk", "en"];

/**
 * Loads all content for the public site from the FastAPI backend on every
 * request (uncached → always fresh). Falls back to the bundled static content
 * so the site still renders if the backend is unavailable.
 */
export async function getSiteData(): Promise<SiteData> {
  try {
    const res = await fetch(`${API_URL}/api/content`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`content fetch failed: ${res.status}`);
    const json = await res.json();
    return { content: json.content as Record<Lang, Content>, mediaBase: json.mediaBase };
  } catch (err) {
    console.error("[content-server] falling back to static content:", err);
    return { content: staticContent(), mediaBase: "/assets" };
  }
}

/** Rebuild the API shape (sections carry inline media) from the static data. */
function staticContent(): Record<Lang, Content> {
  const out = {} as Record<Lang, Content>;
  for (const lang of LANGS) {
    const c = CONTENT[lang];
    out[lang] = {
      ...c,
      sections: c.sections.map((s) => ({ ...s, media: staticMedia(s.id) })),
    };
  }
  return out;
}

function staticMedia(id: string): MediaItem[] {
  const m = MEDIA[id];
  if (!m) return [];
  const still = m.still ?? [];
  return [
    ...m.videos.map(
      (stem): MediaItem => ({
        kind: "video",
        src: `video/${stem}.mp4`,
        poster: `img/${stem}-poster.jpg`,
        still: still.includes(stem),
      })
    ),
    ...m.photos.map(
      (stem): MediaItem => ({
        kind: "img",
        src: `img/${stem}.jpg`,
        caption: stem.startsWith("prog") ? "chapar" : stem.startsWith("cctv-vms") ? "vms" : "photo",
      })
    ),
  ];
}
