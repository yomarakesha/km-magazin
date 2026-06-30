"use client";
import Overlay from "./Overlay";
import Icon from "./Icon";

/** Centered dialog. Used by the product quick view. */
export default function Modal({
  onClose,
  label,
  children,
}: {
  onClose: () => void;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <Overlay onClose={onClose}>
      <div className="shop-modal">
        <div className="shop-modal-card" role="dialog" aria-modal="true" aria-label={label}>
          <button className="shop-x shop-modal-x" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
          {children}
        </div>
      </div>
    </Overlay>
  );
}
