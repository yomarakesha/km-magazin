import type { Lang } from "./shop-types";

/** Public canonical origin of the site (no trailing slash). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const LANGS: Lang[] = ["ru", "tk", "en"];

/** Absolute URL for a site-relative path. */
export function abs(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** hreflang alternates map for a path (the shop switches language client-side,
 *  so every language points at the same URL; still valid + helps crawlers). */
export function hreflang(path: string): Record<string, string> {
  const url = abs(path);
  return { ru: url, tk: url, en: url, "x-default": url };
}
