"use client";
import { useState } from "react";
import { useLang } from "@/lib/lang";
import type { Lang } from "@/lib/content";
import Icon from "./Icon";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const T: Record<Lang, { name: string; phone: string; msg: string; send: string; ok: string; err: string }> = {
  ru: { name: "Ваше имя", phone: "Телефон", msg: "Сообщение", send: "Отправить заявку", ok: "Заявка отправлена. Мы свяжемся с вами.", err: "Не удалось отправить. Попробуйте позже." },
  tk: { name: "Adyňyz", phone: "Telefon", msg: "Habar", send: "Arza ibermek", ok: "Arza iberildi. Siz bilen habarlaşarys.", err: "Iberip bolmady. Soňra synanyşyň." },
  en: { name: "Your name", phone: "Phone", msg: "Message", send: "Send request", ok: "Request sent. We'll get back to you.", err: "Could not send. Try again later." },
};

export default function LeadForm() {
  const { lang } = useLang();
  const t = T[lang];
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setState("sending");
    try {
      const res = await fetch(`${API}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, message }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("ok");
      setName(""); setPhone(""); setMessage("");
    } catch {
      setState("err");
    }
  }

  if (state === "ok") {
    return (
      <div className="lead-done">
        <Icon name="check" className="ld-ic" />
        <span>{t.ok}</span>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={submit}>
      <div className="lf-row">
        <input className="lf-in" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name} required />
        <input className="lf-in" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phone} />
      </div>
      <textarea className="lf-in lf-ta" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t.msg} rows={3} />
      <button className="cta-pdf lf-btn" type="submit" disabled={state === "sending"}>
        <span>{t.send}</span>
      </button>
      {state === "err" && <div className="lf-err">{t.err}</div>}
    </form>
  );
}
