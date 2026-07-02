"use client";
import type { ShopService } from "@/lib/shop-types";
import { useShop } from "./shop-context";
import ServiceCard from "./ServiceCard";
import Icon from "./ui/Icon";

/** "Услуги для категории" — a grid of add-to-cart service tiles. Renders
 *  nothing when the category has no services. */
export default function ServicesSection({ services, heading }: { services: ShopService[]; heading?: string }) {
  const { t } = useShop();
  if (!services || services.length === 0) return null;
  return (
    <section className="shop-svc-section">
      <div className="shop-svc-head">
        <Icon name="wrench" size={18} />
        <h2>{heading ?? t("servicesFor")}</h2>
      </div>
      <div className="shop-svc-grid">
        {services.map((s) => <ServiceCard key={s.id} s={s} />)}
      </div>
    </section>
  );
}
