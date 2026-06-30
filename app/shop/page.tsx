import { getCatalog } from "@/lib/shop-server";
import CatalogView from "@/components/shop/CatalogView";
import Unavailable from "@/components/shop/Unavailable";

export default async function ShopPage() {
  const catalog = await getCatalog();
  if (!catalog) return <Unavailable />;
  return <CatalogView catalog={catalog} />;
}
