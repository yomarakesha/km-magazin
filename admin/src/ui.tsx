import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, type Lang } from "./api";

// ---------------------------------------------------------------- formatting
const nf = new Intl.NumberFormat("ru-RU");
export const money = (n: number | null | undefined, cur = "TMT") =>
  n === null || n === undefined ? "—" : `${nf.format(n)} ${cur}`;
export const num = (n: number | null | undefined) => (n === null || n === undefined ? "—" : nf.format(n));
export function dateTime(s: string | null | undefined): string {
  if (!s) return "—";
  // backend returns naive UTC timestamps without a zone suffix
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
export const dateOnly = (s: string | null | undefined) => (s ? dateTime(s).split(",")[0] : "—");
export const errText = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : String(e));
export const discountPct = (price: number, old: number | null) =>
  old && old > price ? Math.round((1 - price / old) * 100) : 0;

// ---------------------------------------------------------------- data hook
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const reload = useCallback(() => {
    const my = ++seq.current;
    setLoading(true);
    fn()
      .then((d) => my === seq.current && (setData(d), setError(null)))
      .catch((e) => my === seq.current && setError(errText(e)))
      .finally(() => my === seq.current && setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(reload, [reload]);
  return { data, error, loading, reload, setData };
}

// ---------------------------------------------------------------- toast
const ToastCtx = createContext<(msg: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Wrap an async action: disables while running, toasts success, surfaces errors. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, okMsg?: string): Promise<T | undefined> => {
      setBusy(true);
      setError(null);
      try {
        const r = await fn();
        if (okMsg) toast(okMsg);
        return r;
      } catch (e) {
        setError(errText(e));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { busy, error, setError, run };
}

// ---------------------------------------------------------------- primitives
type Variant = "primary" | "outline" | "ghost" | "danger";
export function Button({
  variant = "primary",
  size,
  block,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "lg"; block?: boolean }) {
  const cls = ["btn", `btn-${variant}`, size && `btn-${size}`, block && "btn-block", className].filter(Boolean).join(" ");
  return <button type="button" className={cls} {...rest} />;
}

export function BackButton({ to }: { to?: string }) {
  const nav = useNavigate();
  return (
    <button type="button" className="btn btn-back" onClick={() => (to ? nav(to) : nav(-1))}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <path d="M8.5 3.5L5 7l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      Назад
    </button>
  );
}

export function Field({ label, hint, children, className = "" }: { label?: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`field ${className}`}>
      {label && <span className="lbl">{label}</span>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}
export const Input = ({ className = "", ...p }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={`input ${className}`} {...p} />
);
export const Select = ({ className = "", ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={`select ${className}`} {...p} />
);
export const Textarea = ({ className = "", ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={`textarea ${className}`} {...p} />
);
export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

/** Integer input that keeps "" as null (optional numbers: old price, stock…). */
export function NumInput({ value, onChange, ...rest }: { value: number | null; onChange: (v: number | null) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      {...rest}
    />
  );
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="tabs">
      {options.map((o) => (
        <button key={o.value} type="button" className={`tab ${o.value === value ? "active" : ""}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const LANG_LABEL: Record<Lang, string> = { ru: "RU", tk: "TK", en: "EN" };
export function LangTabs({ value, onChange }: { value: Lang; onChange: (l: Lang) => void }) {
  return <Tabs value={value} onChange={onChange} options={(["ru", "tk", "en"] as Lang[]).map((l) => ({ value: l, label: LANG_LABEL[l] }))} />;
}

export function Card({ title, actions, children, flush, className = "" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string }) {
  return (
    <section className={`card ${flush ? "flush" : ""} ${className}`}>
      {(title || actions) && (
        <div className="card-head" style={flush ? { padding: "20px 24px 4px" } : undefined}>
          {typeof title === "string" ? <h2>{title}</h2> : title}
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHead({ title, sub, back, actions }: { title: ReactNode; sub?: ReactNode; back?: string | true; actions?: ReactNode }) {
  return (
    <>
      {back && (
        <div>
          <BackButton to={back === true ? undefined : back} />
        </div>
      )}
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          {sub && <p className="sub">{sub}</p>}
        </div>
        {actions && <div className="row">{actions}</div>}
      </div>
    </>
  );
}

export const Spinner = () => <div className="spinner" />;
export const ErrorBox = ({ error }: { error: string | null }) => (error ? <div className="alert error">{error}</div> : null);
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

/** Loading/error/data switch for a useLoad() result. */
export function Loaded<T>({ state, children }: { state: { data: T | null; error: string | null; loading: boolean }; children: (d: T) => ReactNode }) {
  if (state.error && !state.data) return <ErrorBox error={state.error} />;
  if (!state.data) return <Spinner />;
  return <>{children(state.data)}</>;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "wide" : ""}`}>
        <Card
          title={title}
          actions={
            <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
              ×
            </button>
          }
        >
          {children}
        </Card>
      </div>
    </div>
  );
}

export function Badge({ tone, children }: { tone?: "blue" | "red" | "soft-blue" | "soft-red" | "soft-green" | "soft-amber"; children: ReactNode }) {
  return <span className={`badge ${tone ?? ""}`}>{children}</span>;
}

export function Qty({ value, onChange, min = 1 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <span className="qty">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="Меньше">
        −
      </button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Больше">
        +
      </button>
    </span>
  );
}

export function confirmAction(text: string): boolean {
  return window.confirm(text);
}
