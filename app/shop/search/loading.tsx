import { SkeletonGrid } from "@/components/shop/ui/Skeleton";

export default function SearchLoading() {
  return (
    <div className="shop-wrap" style={{ paddingTop: 28 }}>
      <div className="shop-skel shop-skel-line" style={{ width: 260, height: 28, marginBottom: 18 }} />
      <SkeletonGrid n={8} />
    </div>
  );
}
