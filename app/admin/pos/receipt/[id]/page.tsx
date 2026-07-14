"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, type AdminShopSettings, type SaleRow } from "@/lib/admin-api";

const fmt = (n: number) => n.toLocaleString("ru-RU");
const PAY_LABEL: Record<string, string> = { cash: "Наличные", terminal: "Терминал", debt: "В долг" };

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div className="adm-loading">Загрузка…</div>}>
      <Receipt />
    </Suspense>
  );
}

function Receipt() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const [sale, setSale] = useState<SaleRow | null>(null);
  const [settings, setSettings] = useState<AdminShopSettings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getSale(Number(params.id)).then(setSale).catch((e) => setError(String(e)));
    api.getShopSettings().then(setSettings).catch(() => {});
  }, [params.id]);

  // ?print=1 — открыть диалог печати сразу после проведения на кассе
  useEffect(() => {
    if (sale && search.get("print") === "1") {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [sale, search]);

  if (error) return <p style={{ color: "#ff9a9a" }}>{error}</p>;
  if (!sale) return <div className="adm-loading">Загрузка…</div>;

  return (
    <>
      <div className="adm-actions pos-no-print" style={{ marginBottom: 16 }}>
        <button className="adm-btn" onClick={() => window.print()}>Печать</button>
        <Link className="adm-btn ghost" href="/admin/pos">← Касса</Link>
        <Link className="adm-btn ghost" href="/admin/pos/sales">Продажи</Link>
      </div>

      <div className="pos-receipt">
        <header>
          <h1>Товарный чек № {sale.id}</h1>
          <div className="pos-receipt-meta">
            <div><b>Магазин KM</b></div>
            {settings?.phone && <div>Тел: {settings.phone}</div>}
            {settings?.address_ru && <div>{settings.address_ru}</div>}
            <div>Дата: {sale.created_at ? new Date(sale.created_at).toLocaleString("ru-RU") : "—"}</div>
            <div>Продавец: {sale.seller}</div>
          </div>
        </header>

        <table>
          <thead>
            <tr><th>№</th><th>Наименование</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr>
          </thead>
          <tbody>
            {sale.items.map((it, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{it.title}</td>
                <td>{it.qty}</td>
                <td>{fmt(it.price)}</td>
                <td>{fmt(it.price * it.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pos-receipt-totals">
          <div><span>Подытог:</span><span>{fmt(sale.subtotal)} TMT</span></div>
          {sale.discount > 0 && <div><span>Скидка:</span><span>−{fmt(sale.discount)} TMT</span></div>}
          {sale.discount < 0 && <div><span>Наценка:</span><span>+{fmt(-sale.discount)} TMT</span></div>}
          <div className="pos-receipt-grand"><span>ИТОГО:</span><span>{fmt(sale.sold_total)} TMT</span></div>
          <div><span>Оплата:</span><span>{PAY_LABEL[sale.payment_method] ?? sale.payment_method}</span></div>
        </div>

        {sale.payment_method === "debt" && (
          <div className="pos-receipt-debt">
            <b>{sale.status === "debt" ? "В долг" : "Долг погашен"}:</b> {sale.debtor_name}, {sale.debtor_phone}
            {sale.settled_at && <> · погашен {new Date(sale.settled_at).toLocaleDateString("ru-RU")}</>}
          </div>
        )}

        <footer>
          <div>Продавец: ______________________</div>
          <div>Покупатель: ______________________</div>
        </footer>
      </div>
    </>
  );
}
