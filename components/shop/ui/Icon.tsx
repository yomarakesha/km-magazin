/** Inline line-icon set for the shop. Stroke = currentColor, so icons inherit
 *  text color. No emoji anywhere in the UI — these are the only glyphs. */
type IconName =
  | "search" | "cart" | "eye" | "check" | "close" | "minus" | "plus"
  | "phone" | "truck" | "filter" | "chevron" | "arrow" | "whatsapp"
  | "box" | "grid" | "shield" | "trash" | "compare"
  | "wrench" | "settings" | "refresh" | "heart" | "star";

const PATHS: Record<IconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  cart: <><path d="M3 4h2l2.4 11.5a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 8H6" /><circle cx="9.5" cy="20" r="1.3" /><circle cx="17.5" cy="20" r="1.3" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  phone: <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L19 18l-1 3a16 16 0 0 1-13-13Z" />,
  truck: <><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>,
  filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  whatsapp: <><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z" /><path d="M8.5 8.5c.3 2 1.5 4 3 5.2 1.4 1.1 2.8 1.3 3.7 1.1.5-.1.8-.7.6-1.2l-.5-1c-.2-.4-.7-.5-1-.2l-.7.5c-.9-.5-1.7-1.3-2.2-2.2l.5-.7c.2-.3.2-.7-.1-1l-.9-.6c-.4-.3-1-.1-1.2.4Z" fill="currentColor" stroke="none" /></>,
  box: <><path d="M12 3 4 7v10l8 4 8-4V7Z" /><path d="M4 7l8 4 8-4M12 11v10" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  shield: <path d="M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6Z" />,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  compare: <><rect x="3" y="5" width="7" height="14" rx="1.2" /><rect x="14" y="5" width="7" height="14" rx="1.2" /><path d="M12 3v18" /></>,
  wrench: <path d="M15 6a3.5 3.5 0 0 0-4.6 4.2L4 16.6 7.4 20l6.4-6.4A3.5 3.5 0 0 0 18 9l-2 2-2-2 2-2a3.5 3.5 0 0 0-1-1Z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v4h-4" /></>,
  heart: <path d="M12 20.5s-7.5-4.6-9.3-9A5 5 0 0 1 12 6.5 5 5 0 0 1 21.3 11.5c-1.8 4.4-9.3 9-9.3 9Z" />,
  star: <path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8Z" />,
};

export default function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
