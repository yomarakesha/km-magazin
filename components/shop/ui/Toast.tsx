"use client";
import { createPortal } from "react-dom";
import { usePortalRoot } from "./portal";
import Icon from "./Icon";

/** Floating confirmation toast (e.g. "added to cart"), portaled above content. */
export default function Toast({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const root = usePortalRoot();
  if (!root) return null;
  return createPortal(
    <div className="shop-toast-wrap">
      <div className="shop-toast" role="status">
        <span className="ic"><Icon name="check" size={14} strokeWidth={2.4} /></span>
        <span>{message}</span>
        {actionLabel && onAction && <button onClick={onAction}>{actionLabel}</button>}
      </div>
    </div>,
    root,
  );
}
