"use client";
import { useState } from "react";
import type { ProductReview } from "@/lib/shop-types";
import { postReview } from "@/lib/shop-api";
import { useShop } from "./shop-context";
import Icon from "./ui/Icon";
import Stars from "./ui/Stars";

/** PDP reviews block: approved reviews + a "write a review" form.
 *  New reviews go to moderation and appear only after admin approval. */
export default function Reviews({ slug, reviews, rating, count }: {
  slug: string;
  reviews: ProductReview[];
  rating: number | null;
  count: number;
}) {
  const { t, lang } = useShop();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [stars, setStars] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim()) { setErr(t("name")); return; }
    setBusy(true);
    try {
      await postReview(slug, { name: name.trim(), rating: stars, text: text.trim() });
      setSent(true);
      setOpen(false);
    } catch (e2) { setErr(String(e2)); }
    finally { setBusy(false); }
  }

  return (
    <section className="shop-reviews" id="reviews">
      <div className="shop-svc-head">
        <Icon name="star" size={18} />
        <h2>{t("reviews")}{count > 0 ? ` · ${count}` : ""}</h2>
        {rating != null && count > 0 && <Stars value={rating} size={16} />}
      </div>

      {reviews.length === 0 && <p className="shop-reviews-empty">{t("noReviews")}</p>}

      <div className="shop-reviews-list">
        {reviews.map((r, i) => (
          <div className="shop-review" key={i}>
            <div className="shop-review-head">
              <b>{r.name}</b>
              <Stars value={r.rating} />
              <span className="shop-review-date">
                {new Date(r.created_at).toLocaleDateString(lang === "ru" ? "ru-RU" : lang === "tk" ? "tk-TM" : "en-US")}
              </span>
            </div>
            {r.text && <p>{r.text}</p>}
          </div>
        ))}
      </div>

      {sent ? (
        <p className="shop-review-sent"><Icon name="check" size={16} /> {t("reviewPending")}</p>
      ) : open ? (
        <form className="shop-review-form" onSubmit={submit}>
          <div className="shop-review-row">
            <label className="shop-review-field">
              {t("name")}
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={128} />
            </label>
            <label className="shop-review-field">
              {t("ratingLabel")}
              <span className="shop-rate-pick" role="radiogroup" aria-label={t("ratingLabel")}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <button type="button" key={i} className={i <= stars ? "on" : ""} onClick={() => setStars(i)}
                    role="radio" aria-checked={i === stars} aria-label={`${i}`}>
                    <Icon name="star" size={20} />
                  </button>
                ))}
              </span>
            </label>
          </div>
          <label className="shop-review-field">
            {t("yourReview")}
            <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
          </label>
          {err && <p className="shop-err">{err}</p>}
          <div className="shop-review-actions">
            <button className="shop-btn sm" type="submit" disabled={busy}>{busy ? t("sending") : t("sendReview")}</button>
            <button className="shop-btn ghost sm" type="button" onClick={() => setOpen(false)}>{t("reset")}</button>
          </div>
        </form>
      ) : (
        <button className="shop-btn ghost" onClick={() => setOpen(true)}>{t("writeReview")}</button>
      )}
    </section>
  );
}
