import { getCatalog } from "@/lib/shop-server";
import { SITE_URL, abs } from "@/lib/site";
import CatalogView from "@/components/shop/CatalogView";
import Unavailable from "@/components/shop/Unavailable";
import JsonLd from "@/components/JsonLd";

export default async function ShopPage() {
  const catalog = await getCatalog();
  if (!catalog) return <Unavailable />;

  const s = catalog.settings;
  const storeLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Kanagatly Mahabat",
    url: abs("/shop"),
    image: `${SITE_URL}/assets/km-logo.png`,
    address: { "@type": "PostalAddress", streetAddress: s.address.ru || "Ашхабад", addressLocality: "Ашхабад", addressCountry: "TM" },
  };
  if (s.phone) storeLd.telephone = s.phone;

  return (
    <>
      <JsonLd data={storeLd} />
      <CatalogView catalog={catalog} />
    </>
  );
}
