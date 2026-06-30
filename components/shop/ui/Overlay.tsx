"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { usePortalRoot } from "./portal";

/** Backdrop + Esc-to-close + body scroll lock. Base for Drawer and Modal. */
export default function Overlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  const root = usePortalRoot();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!root) return null;
  return createPortal(
    <>
      <div className="shop-overlay" onClick={onClose} />
      {children}
    </>,
    root,
  );
}
