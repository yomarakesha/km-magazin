"use client";
import Overlay from "./Overlay";
import Icon from "./Icon";

/** Right slide-in panel. Used by the cart and the mobile filter sheet. */
export default function Drawer({
  title,
  onClose,
  children,
  foot,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  foot?: React.ReactNode;
}) {
  return (
    <Overlay onClose={onClose}>
      <aside className="shop-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="shop-drawer-head">
          <h2>{title}</h2>
          <button className="shop-x" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        <div className="shop-drawer-body">{children}</div>
        {foot && <div className="shop-drawer-foot">{foot}</div>}
      </aside>
    </Overlay>
  );
}
