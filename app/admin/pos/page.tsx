"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type PosLookup } from "@/lib/admin-api";
import { formatPhone, canonicalPhone } from "@/lib/phone";
import { useToast } from "../_components/useToast";

type CartLine = { product: PosLookup; qty: number };
type Payment = "cash" | "terminal" | "debt";

const fmt = (n: number) => n.toLocaleString("ru-RU");

export default function PosPage() {
  const { show, node } = useToast();
  const router = useRouter();
  const codeRef = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  // "" = взять подытог; иначе продавец ввёл свою сумму (скидка/наценка)
  const [soldTotal, setSoldTotal] = useState("");
  const [payment, setPayment] = useState<Payment>("cash");
  const [debtorName, setDebtorName] = useState("");
  const [debtorPhone, setDebtorPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { codeRef.current?.focus(); }, []);

  const subtotal = useMemo(
    () => cart.reduce((s, l) => s + l.product.price * l.qty, 0),
    [cart],
  );
  const sold = soldTotal.trim() === "" ? subtotal : Number(soldTotal);
  const diff = subtotal - sold; // >0 скидка, <0 наценка

  async function scan() {
    const needle = code.trim();
    if (!needle) return;
    try {
      const p = await api.posLookup(needle);
      setCart((prev) => {
        const i = prev.findIndex((l) => l.product.id === p.id);
        if (i >= 0) {
          const next = [...prev];
          next[i] = { ...next[i], qty: next[i].qty + 1 };
          return next;
        }
        return [...prev, { product: p, qty: 1 }];
      });
    } catch {
      show(`Не найдено: ${needle}`, "err");
    }
    setCode("");
    codeRef.current?.focus();
  }

  function setQty(id: number, qty: number) {
    if (qty < 1) return;
    setCart((prev) => prev.map((l) => (l.product.id === id ? { ...l, qty } : l)));
  }
  function removeLine(id: number) {
    setCart((prev) => prev.filter((l) => l.product.id !== id));
  }

  const soldInvalid = soldTotal.trim() !== "" && (!Number.isFinite(sold) || sold < 0);
  const debtInvalid = payment === "debt" && (!debtorName.trim() || !canonicalPhone(debtorPhone));
  const canSubmit = cart.length > 0 && !soldInvalid && !debtInvalid && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const sale = await api.createSale({
        items: cart.map((l) => ({ product_id: l.product.id, qty: l.qty })),
        sold_total: soldTotal.trim() === "" ? null : sold,
        payment_method: payment,
        debtor_name: payment === "debt" ? debtorName.trim() : null,
        debtor_phone: payment === "debt" ? canonicalPhone(debtorPhone) : null,
      });
      setCart([]); setSoldTotal(""); setPayment("cash");
      setDebtorName(""); setDebtorPhone("");
      router.push(`/admin/pos/receipt/${sale.id}?print=1`);
    } catch (e) {
      show(String(e), "err");
      setBusy(false);
      codeRef.current?.focus();
    }
  }

  return (
    <>
      <h1 className="adm-h1">Касса</h1>
      <p className="adm-sub">Сканируйте штрихкод или введите SKU/название и нажмите Enter. Товар списывается со склада при проведении.</p>

      <div className="adm-field" style={{ maxWidth: 420 }}>
        <label>Штрихкод / SKU / название</label>
        <input
          ref={codeRef} className="adm-in" value={code} placeholder="Скан или ввод + Enter"
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); scan(); } }}
        />
      </div>

      {cart.length === 0 && (
        <p style={{ color: "var(--tx3)", padding: "18px 0" }}>Чек пуст — отсканируйте товар.</p>
      )}

      {cart.length > 0 && (
        <div className="adm-table-wrap" style={{ marginBottom: 16 }}>
          <table className="leads-table">
            <thead><tr><th>Товар</th><th>Цена</th><th>Кол-во</th><th>Сумма</th><th /></tr></thead>
            <tbody>
              {cart.map((l) => (
                <tr key={l.product.id}>
                  <td>
                    {l.product.title}
                    {l.product.stock_qty != null && l.product.stock_qty <= l.qty && (
                      <span className="adm-tr-badge" title="Остаток на складе">ост: {l.product.stock_qty}</span>
                    )}
                  </td>
                  <td>{fmt(l.product.price)} {l.product.currency}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button className="adm-btn ghost sm" onClick={() => setQty(l.product.id, l.qty - 1)}>−</button>
                      <b style={{ minWidth: 22, textAlign: "center" }}>{l.qty}</b>
                      <button className="adm-btn ghost sm" onClick={() => setQty(l.product.id, l.qty + 1)}>+</button>
                    </div>
                  </td>
                  <td><b>{fmt(l.product.price * l.qty)}</b></td>
                  <td><button className="adm-btn danger sm" onClick={() => removeLine(l.product.id)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cart.length > 0 && (
        <div className="adm-cards" style={{ alignItems: "end" }}>
          <div className="adm-card"><span>Подытог</span><b>{fmt(subtotal)} TMT</b></div>
          <div className="adm-card">
            <span>Продано за</span>
            <input
              className="adm-in" type="number" min={0} value={soldTotal}
              placeholder={String(subtotal)}
              onChange={(e) => setSoldTotal(e.target.value)}
              style={{ marginTop: 4 }}
            />
            {diff !== 0 && !soldInvalid && (
              <span style={{ color: diff > 0 ? "#ffb86b" : "var(--acc-br)", fontSize: 13 }}>
                {diff > 0 ? `скидка ${fmt(diff)}` : `наценка ${fmt(-diff)}`}
              </span>
            )}
            {soldInvalid && <span style={{ color: "#ff9a9a", fontSize: 13 }}>некорректная сумма</span>}
          </div>
          <div className="adm-card">
            <span>Оплата</span>
            <div className="adm-tabs" style={{ marginTop: 6 }}>
              {(["cash", "terminal", "debt"] as Payment[]).map((m) => (
                <button key={m} className={payment === m ? "act" : ""} onClick={() => setPayment(m)}>
                  {m === "cash" ? "Наличные" : m === "terminal" ? "Терминал" : "В долг"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && payment === "debt" && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <div className="adm-field" style={{ flex: "1 1 220px", maxWidth: 280, marginBottom: 0 }}>
            <label>Имя должника *</label>
            <input className="adm-in" value={debtorName} onChange={(e) => setDebtorName(e.target.value)} />
          </div>
          <div className="adm-field" style={{ flex: "1 1 220px", maxWidth: 280, marginBottom: 0 }}>
            <label>Телефон должника *</label>
            <input
              className="adm-in" value={debtorPhone} placeholder="+993 65 123456" inputMode="tel"
              onChange={(e) => setDebtorPhone(formatPhone(e.target.value))}
            />
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <div className="adm-actions" style={{ marginTop: 18 }}>
          <button className="adm-btn" disabled={!canSubmit} onClick={submit}>
            {busy ? "Проведение…" : `Провести и печать — ${fmt(soldInvalid ? subtotal : sold)} TMT`}
          </button>
          <button className="adm-btn ghost" onClick={() => { setCart([]); setSoldTotal(""); codeRef.current?.focus(); }}>
            Очистить
          </button>
        </div>
      )}
      {node}
    </>
  );
}
