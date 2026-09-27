import { useEffect, useState } from "react";
import { api, type Settings } from "../api";
import { Button, Card, ErrorBox, Field, Input, Loaded, PageHead, useAction, useLoad } from "../ui";

const LANG_NAMES = { ru: "Русский", tk: "Türkmen", en: "English" } as const;

export default function SettingsPage() {
  const state = useLoad(api.settings);
  const [f, setF] = useState<Settings | null>(null);
  // coordinates are edited as text so "37," can be typed on the way to "37.9"
  const [pin, setPin] = useState({ lat: "", lng: "" });
  const { busy, error, run } = useAction();
  useEffect(() => {
    setF(state.data);
    setPin({ lat: state.data?.lat?.toString() ?? "", lng: state.data?.lng?.toString() ?? "" });
  }, [state.data]);

  const set = (k: keyof Settings, v: string) => setF((s) => (s ? { ...s, [k]: v } : s));
  // "" → null, a number in range → the number, anything else → undefined (invalid)
  const coord = (text: string, limit: number): number | null | undefined => {
    const t = text.trim().replace(",", ".");
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) && Math.abs(n) <= limit ? n : undefined;
  };
  const lat = coord(pin.lat, 90);
  const lng = coord(pin.lng, 180);
  const pinOk = lat !== undefined && lng !== undefined && (lat === null) === (lng === null);
  // "37.899804, 58.34857" copied from a map app fills both fields
  const pastePin = (text: string) => {
    const m = text.match(/^\s*(-?\d+\.\d+)\s*[,;\s]\s*(-?\d+\.\d+)\s*$/);
    if (!m) return false;
    setPin({ lat: m[1], lng: m[2] });
    return true;
  };

  return (
    <>
      <PageHead
        title="Контакты магазина"
        sub="Показываются в подвале сайта, на странице «Контакты» и в корзине"
        actions={
          <Button
            disabled={busy || !f || !pinOk}
            onClick={() => f && pinOk && run(() => api.updateSettings({ ...f, lat: lat ?? null, lng: lng ?? null }), "Сохранено")}
          >
            Сохранить
          </Button>
        }
      />
      <ErrorBox error={error} />
      <Loaded state={state}>
        {() =>
          f && (
            <div className="stack">
              <Card title="Связь">
                <div className="grid3">
                  <Field label="Телефон">
                    <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+993 12 21 63 14" />
                  </Field>
                  <Field label="Эл. почта">
                    <Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
                  </Field>
                  <Field label="WhatsApp" hint="Номер без +, пусто — не показывать">
                    <Input value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
                  </Field>
                </div>
              </Card>
              <Card title="Точка на карте" actions={<span className="muted small">страница «Контакты»</span>}>
                <div className="grid2">
                  <Field label="Широта (lat)">
                    <Input
                      inputMode="decimal"
                      value={pin.lat}
                      placeholder="37.899804"
                      onPaste={(e) => pastePin(e.clipboardData.getData("text")) && e.preventDefault()}
                      onChange={(e) => setPin({ ...pin, lat: e.target.value })}
                    />
                  </Field>
                  <Field label="Долгота (lng)">
                    <Input
                      inputMode="decimal"
                      value={pin.lng}
                      placeholder="58.34857"
                      onPaste={(e) => pastePin(e.clipboardData.getData("text")) && e.preventDefault()}
                      onChange={(e) => setPin({ ...pin, lng: e.target.value })}
                    />
                  </Field>
                </div>
                <p className="muted small">
                  Можно вставить координаты целиком, например «37.899804, 58.34857». Пустые поля — точка не задана.{" "}
                  {typeof lat === "number" && typeof lng === "number" && (
                    <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`} target="_blank" rel="noreferrer">
                      Проверить на карте ↗
                    </a>
                  )}
                </p>
                {!pinOk && (
                  <p className="small" style={{ color: "var(--red)" }}>
                    Нужны обе координаты числами (широта до ±90, долгота до ±180) — или обе пустые.
                  </p>
                )}
              </Card>
              {(["ru", "tk", "en"] as const).map((l) => (
                <Card key={l} title={LANG_NAMES[l]}>
                  <div className="grid2">
                    <Field label="Адрес">
                      <Input value={f[`address_${l}`]} onChange={(e) => set(`address_${l}`, e.target.value)} />
                    </Field>
                    <Field label="Часы работы">
                      <Input value={f[`hours_${l}`]} onChange={(e) => set(`hours_${l}`, e.target.value)} />
                    </Field>
                  </div>
                </Card>
              ))}
            </div>
          )
        }
      </Loaded>
    </>
  );
}
