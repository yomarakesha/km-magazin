/** Shop contact & trust settings. EDIT these with the real values. */
export const SHOP = {
  // Phone shown in the UI (human-readable)
  phone: "+993 12 00-00-00",
  // WhatsApp number in international format WITHOUT "+" or spaces, for wa.me links
  whatsapp: "99312000000",
  address: {
    ru: "Ашхабад, ул. ...",
    tk: "Aşgabat, ... köç.",
    en: "Ashgabat, ... str.",
  } as Record<string, string>,
};

/** Build a wa.me link with a prefilled message. */
export function waLink(text: string): string {
  return `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(text)}`;
}
