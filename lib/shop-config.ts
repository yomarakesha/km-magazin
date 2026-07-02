import type { ShopSettings } from "./shop-types";

/** Fallback shop contacts, used only when the backend/settings are unavailable.
 *  The live values are managed in /admin → «Контакты» and delivered through the
 *  catalog API into ShopProvider context. */
export const DEFAULT_SETTINGS: ShopSettings = {
  phone: "",
  whatsapp: "",
  address: { ru: "", tk: "", en: "" },
};

/** Build a wa.me link with a prefilled message for the given number. */
export function waLink(whatsapp: string, text: string): string {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
}
