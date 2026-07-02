import type { Metadata } from "next";
import { getCatalog } from "@/lib/shop-server";
import ShopChrome from "@/components/shop/ShopChrome";
import "./shop.css";

export const metadata: Metadata = {
  title: "Магазин — Kanagatly Mahabat",
  description: "Компьютеры, камеры, сетевое оборудование и аксессуары.",
};

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const catalog = await getCatalog();
  const mediaBase = catalog?.mediaBase ?? "";
  return (
    <ShopChrome mediaBase={mediaBase} categories={catalog?.categories ?? []} settings={catalog?.settings} services={catalog?.services ?? []}>
      {children}
    </ShopChrome>
  );
}
