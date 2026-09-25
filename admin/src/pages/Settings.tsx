import { useEffect, useState } from "react";
import { api, type Settings } from "../api";
import { Button, Card, ErrorBox, Field, Input, Loaded, PageHead, useAction, useLoad } from "../ui";

const LANG_NAMES = { ru: "Русский", tk: "Türkmen", en: "English" } as const;

export default function SettingsPage() {
  const state = useLoad(api.settings);
  const [f, setF] = useState<Settings | null>(null);
  const { busy, error, run } = useAction();
  useEffect(() => setF(state.data), [state.data]);

  const set = (k: keyof Settings, v: string) => setF((s) => (s ? { ...s, [k]: v } : s));

  return (
    <>
      <PageHead
        title="Контакты магазина"
        sub="Показываются в подвале сайта, на странице «Контакты» и в корзине"
        actions={
          <Button disabled={busy || !f} onClick={() => f && run(() => api.updateSettings(f), "Сохранено")}>
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
