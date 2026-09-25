import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { Button, ErrorBox, Field, Input, errText } from "../ui";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(errText(err) === "Wrong username or password" ? "Неверный логин или пароль" : errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={submit}>
        <div className="logo">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Kanagatly Mahabat" />
        </div>
        <div>
          <h2>Вход в админ-панель</h2>
          <p className="muted small" style={{ marginTop: 6 }}>
            Для сотрудников магазина
          </p>
        </div>
        <Field label="Логин">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </Field>
        <Field label="Пароль">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus required />
        </Field>
        <ErrorBox error={error} />
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? "Входим…" : "Войти"}
        </Button>
      </form>
    </div>
  );
}
