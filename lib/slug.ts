/** Transliterate + slugify a (usually Russian) name into a URL-safe slug.
 *  Used by the admin create forms so editors fill human fields and the slug
 *  is derived automatically. */
const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  // common Turkmen latin extras → ascii
  ä: "a", ö: "o", ü: "u", ç: "c", ş: "s", ý: "y", ň: "n", ž: "zh", ğ: "g",
};

export function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .split("")
    .map((ch) => (ch in MAP ? MAP[ch] : ch))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 64);
}
