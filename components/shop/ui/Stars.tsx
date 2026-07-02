import Icon from "./Icon";

/** Read-only star rating: filled up to `value` (rounded), grey after. */
export default function Stars({ value, count, size = 14 }: { value: number; count?: number; size?: number }) {
  const filled = Math.round(value);
  return (
    <span className="shop-stars" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= filled ? "on" : ""}><Icon name="star" size={size} /></span>
      ))}
      {count != null && count > 0 && <span className="shop-stars-n">{value} · {count}</span>}
    </span>
  );
}
