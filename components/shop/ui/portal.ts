"use client";
import { useEffect, useState } from "react";

/** Lazily create (once) a body-level portal root that carries the `.shop-portal`
 *  class so the shop's light `--sh-*` tokens resolve inside drawers/modals/toasts. */
export function usePortalRoot(): HTMLElement | null {
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    let el = document.getElementById("shop-portal");
    if (!el) {
      el = document.createElement("div");
      el.id = "shop-portal";
      el.className = "shop-portal";
      document.body.appendChild(el);
    }
    setNode(el);
  }, []);
  return node;
}
