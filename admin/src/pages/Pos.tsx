import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, type SaleIn, type StockRow } from "../api";
import { Button, Card, Empty, ErrorBox, Field, Input, NumInput, PageHead, Qty, Tabs, errText, money } from "../ui";

interface Line {
  id: number;
  title: string;
  price: number;
  stock: number | null;
  qty: number;
}

export default function Pos() {
  const nav = useNavigate();
  const [lines, setLines] = useState<Line[]>([]);
  const [code, setCode] = useState("");
  const [hits, setHits] = useState<StockRow[]>([]);
  const [soldTotal, setSoldTotal] = useState<number | null>(null);
  const [method, setMethod] = useState<SaleIn["payment_method"]>("cash");
  const [debtor, setDebtor] = useState({ name: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scan = useRef<HTMLInputElement>(null);

  // live suggestions from the stock list (readable by sales)
  useEffect(() => {
    const q = code.trim();
    if (q.length < 2) return setHits([]);
    const t = window.setTimeout(() => {
      api.stock(q).then((r) => setHits(r.filter((x) => x.enabled).slice(0, 8))).catch(() => setHits([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [code]);

  const add = (p: { id: number; title: string; price: number; stock_qty: number | null }) => {
    setLines((ls) => {
      const ex = ls.find((l) => l.id === p.id);
      if (ex) return ls.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { id: p.id, title: p.title, price: p.price, stock: p.stock_qty, qty: 1 }];
    });
    setCode("");
    setHits([]);
    scan.current?.focus();
  };

  async function onScan(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    try {
      add(await api.posLookup(code.trim()));
    } catch (err) {
      setError(errText(err) === "Product not found" ? `Товар «${code}» не найден` : errText(err));
    }
  }

  const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
  const total = soldTotal ?? subtotal;
  const debtOk = method !== "debt" || debtor.name.trim().length > 0;

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const sale = await api.createSale({
        items: lines.map((l) => ({ product_id: l.id, qty: l.qty })),
        sold_total: soldTotal,
        payment_method: method,
        debtor_name: method === "debt" ? debtor.name.trim() : null,
        debtor_phone: method === "debt" ? debtor.phone.trim() || null : null,
      });
      nav(`/pos/receipt/${sale.id}`);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title="Касса" sub="Сканируйте штрихкод или ищите по названию и артикулу" actions={<Button variant="outline" onClick={() => nav("/sales")}>Продажи</Button>} />
      <div className="split">
        <div className="stack">
          <Card>
            <form onSubmit={onScan} style={{ position: "relative" }}>
              <input
                ref={scan}
                className="search"
                style={{ width: "100%", height: 50, fontSize: 15 }}
                placeholder="Штрихкод, артикул или название — Enter"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
              {hits.length > 0 && (
                <div className="card" style={{ position: "absolute", left: 0, right: 0, top: 56, zIndex: 5, padding: 8, gap: 0 }}>
                  {hits.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      className="list-row"
                      style={{ border: "none", background: "none", textAlign: "left", cursor: "pointer", font: "inherit", padding: "10px 12px", borderRadius: 10 }}
                      onClick={() => add(h)}
                    >
                      <span style={{ flex: 1 }}>{h.title}</span>
                      <span className="muted small">{h.stock_qty === null ? "не учит." : `${h.stock_qty} шт.`}</span>
                      <b>{money(h.price)}</b>
                    </button>
                  ))}
                </div>
              )}
            </form>
            <ErrorBox error={error} />
          </Card>
          <Card flush>
            {lines.length === 0 ? (
              <Empty title="Чек пуст">Отсканируйте первый товар.</Empty>
            ) : (
              <div style={{ padding: "4px 24px" }}>
                {lines.map((l) => (
                  <div className="list-row" key={l.id} style={{ padding: "18px 0" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 15 }}>{l.title}</div>
                      <div className="muted small">
                        {money(l.price)}
                        {l.stock !== null && ` · на складе ${l.stock}`}
                        {l.stock !== null && l.qty > l.stock && <span style={{ color: "var(--red)" }}> · не хватает</span>}
                      </div>
                    </div>
                    <Qty value={l.qty} onChange={(qty) => setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, qty } : x)))} />
                    <b className="mono" style={{ minWidth: 110, textAlign: "right" }}>
                      {money(l.price * l.qty)}
                    </b>
                    <button className="icon-btn" aria-label="Убрать" onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card title="Оплата">
          <div className="total-line">
            <span style={{ fontWeight: 800 }}>Итого</span>
            <b>{money(total)}</b>
          </div>
          <Field label="Цена со скидкой" hint={soldTotal !== null && soldTotal < subtotal ? `Скидка ${money(subtotal - soldTotal)}` : `Без скидки: ${money(subtotal)}`}>
            <NumInput value={soldTotal} min={0} max={subtotal} placeholder={String(subtotal)} onChange={setSoldTotal} />
          </Field>
          <Tabs
            value={method}
            onChange={setMethod}
            options={[
              { value: "cash", label: "Наличные" },
              { value: "terminal", label: "Карта" },
              { value: "debt", label: "В долг" },
            ]}
          />
          {method === "debt" && (
            <div className="grid2">
              <Field label="Должник">
                <Input value={debtor.name} onChange={(e) => setDebtor({ ...debtor, name: e.target.value })} />
              </Field>
              <Field label="Телефон">
                <Input value={debtor.phone} onChange={(e) => setDebtor({ ...debtor, phone: e.target.value })} />
              </Field>
            </div>
          )}
          <Button size="lg" block disabled={busy || lines.length === 0 || !debtOk || (soldTotal !== null && soldTotal > subtotal)} onClick={checkout}>
            {busy ? "Проводим…" : "Провести продажу"}
          </Button>
          {lines.length > 0 && (
            <Button variant="ghost" onClick={() => (setLines([]), setSoldTotal(null))}>
              Очистить чек
            </Button>
          )}
        </Card>
      </div>
    </>
  );
}
