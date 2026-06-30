"use client";
import { useShop } from "./shop-context";

export default function Unavailable() {
  const { t } = useShop();
  return (
    <div className="shop-wrap">
      <p className="shop-empty">{t("unavailable")}</p>
    </div>
  );
}
