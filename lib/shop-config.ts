import type { ShopSettings } from "./shop-types";

/** Fallback shop contacts, used only when the backend/settings are unavailable.
 *  The live values are managed in /admin → «Контакты» and delivered through the
 *  catalog API into ShopProvider context. */
export const DEFAULT_SETTINGS: ShopSettings = {
  phone: "",
  whatsapp: "",
  address: { ru: "", tk: "", en: "" },
};

/** Build a wa.me link with a prefilled message for the given number.
 *  wa.me accepts digits only — strip spaces, "+", dashes, etc. so a contact
 *  stored as "+993 65 555 568" still produces a valid link. */
export function waLink(whatsapp: string, text: string): string {
  const num = (whatsapp || "").replace(/\D/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
