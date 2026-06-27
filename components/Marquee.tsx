"use client";
import { useLang } from "@/lib/lang";

export default function Marquee() {
  const { c } = useLang();
  const row = [...c.marquee, ...c.marquee];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="mq-track">
        {row.map((m, i) => (
          <span key={i}>
            {m}
            <i style={{ marginLeft: 26 }}>◆</i>
          </span>
        ))}
      </div>
    </div>
  );
}
