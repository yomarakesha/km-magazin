"use client";
import { useEffect, useState } from "react";
import { api, type AdminShopSettings } from "@/lib/admin-api";
import { useToast } from "../../_components/useToast";

const EMPTY: AdminShopSettings = { phone: "", whatsapp: "", address_ru: "", address_tk: "", address_en: "" };

export default function ShopSettingsPage() {
  const { show, node } = useToast();
  const [s, setS] = useState<AdminShopSettings>(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.getShopSettings().then(setS).catch((e) => show(String(e), "err")); }, [show]);

  async function save() {
    setBusy(true);
    try {
      await api.updateShopSettings(s);
      show("Сохранено");
    } catch (e) { show(String(e), "err"); }
    finally { setBusy(false); }
  }

  const field = (key: keyof AdminShopSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [key]: e.target.value });

  return (
    <>
      <h1 className="adm-h1">Контакты магазина</h1>
      <p className="adm-sub">Телефон и адрес — показываются в шапке и футере магазина.</p>

      <div className="adm-block">
        <h3>Связь</h3>
        <div className="adm-field"><label>Телефон (как показывать)</label>
          <input className="adm-in" value={s.phone} onChange={field("phone")} placeholder="+993 12 00-00-00" /></div>
      </div>

      <div className="adm-block">
        <h3>Адрес</h3>
        <div className="adm-field"><label>Адрес — RU</label>
          <input className="adm-in" value={s.address_ru} onChange={field("address_ru")} /></div>
        <div className="adm-field"><label>Адрес — TK</label>
          <input className="adm-in" value={s.address_tk} onChange={field("address_tk")} /></div>
        <div className="adm-field"><label>Адрес — EN</label>
          <input className="adm-in" value={s.address_en} onChange={field("address_en")} /></div>
      </div>

      <div className="adm-actions">
        <button className="adm-btn" onClick={save} disabled={busy}>{busy ? "Сохранение…" : "Сохранить"}</button>
      </div>
      {node}
    </>
  );
}
