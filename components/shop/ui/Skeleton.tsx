/** Shimmer placeholders for the product grid while data loads. */
export function SkeletonCard() {
  return (
    <div className="shop-skel-card">
      <div className="shop-skel shop-skel-img" />
      <div className="shop-skel-lines">
        <div className="shop-skel shop-skel-line" />
        <div className="shop-skel shop-skel-line sm" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ n = 8 }: { n?: number }) {
  return (
    <div className="shop-grid">
      {Array.from({ length: n }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
