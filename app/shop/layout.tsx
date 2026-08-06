import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/shop-server";
import { SHOP_ENABLED } from "@/lib/shop-flag";
import ShopChrome from "@/components/shop/ShopChrome";
import "./shop.css";

export const metadata: Metadata = {
  title: "Магазин — Kanagatly Mahabat",
  description: "Компьютеры, камеры, сетевое оборудование и аксессуары.",
};

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  if (!SHOP_ENABLED) notFound();
  const catalog = await getCatalog();
  const mediaBase = catalog?.mediaBase ?? "";
  return (
    <ShopChrome mediaBase={mediaBase} categories={catalog?.categories ?? []} settings={catalog?.settings} services={catalog?.services ?? []}>
      {children}
    </ShopChrome>
  );
}
