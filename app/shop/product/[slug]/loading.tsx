export default function ProductLoading() {
  return (
    <div className="shop-wrap" style={{ paddingTop: 28 }}>
      <div className="shop-skel shop-skel-line" style={{ width: 320, height: 30, marginBottom: 20 }} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,560px) minmax(0,1fr)", gap: 28 }}>
        <div className="shop-skel shop-skel-img" style={{ aspectRatio: "1", borderRadius: 12 }} />
        <div className="shop-skel-lines" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div className="shop-skel shop-skel-line" style={{ height: 22 }} />
          <div className="shop-skel shop-skel-line sm" />
          <div className="shop-skel shop-skel-line" style={{ width: 140, height: 34, marginTop: 10 }} />
        </div>
      </div>
    </div>
  );
}
