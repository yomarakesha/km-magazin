"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/admin-api";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(false);
    try {
      await api.login(password);
      router.replace("/admin");
    } catch {
      setErr(true);
      setBusy(false);
    }
  }

  return (
    <div className="adm-login">
      <div className="lg">KM</div>
      <div className="sb">Панель управления</div>
      <form onSubmit={submit}>
        <input
          className="adm-in"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          autoFocus
        />
        {err && <div className="err">Неверный пароль</div>}
        <button className="adm-btn" type="submit" disabled={busy}>
          {busy ? "Вход…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
