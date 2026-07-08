"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { usePortalRoot } from "./portal";

// Shared lock count so stacked overlays (e.g. cart drawer + quick-view modal)
// don't unlock body scroll until the LAST one closes.
let lockCount = 0;
let lockPrev = "";
function lockScroll() {
  if (lockCount === 0) {
    lockPrev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}
function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = lockPrev;
}

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
    lockScroll();
    return unlockScroll;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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
