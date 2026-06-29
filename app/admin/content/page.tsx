"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/admin-api";
import { useToast } from "../_components/useToast";

const LANG_LABEL: Record<string, string> = { ru: "Русский", tk: "Türkmençe", en: "English" };
const BLOCK_LABEL: Record<string, string> = {
  meta: "Бренд", hero: "Главный экран", marquee: "Бегущая строка", nav: "Меню",
  about: "О компании", services: "Услуги (заголовки)", process: "Процесс",
  advantages: "Преимущества", contact: "Контакты",
};

type Blocks = Record<string, Record<string, Record<string, unknown>>>;

export default function ContentPage() {
  const { show, node } = useToast();
  const [blocks, setBlocks] = useState<Blocks>({});
  const [keys, setKeys] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [lang, setLang] = useState("ru");

  useEffect(() => {
    api.getBlocks().then((d) => {
      setBlocks(d.blocks);
      setKeys(d.keys);
      setLangs(d.langs);
    }).catch((e) => show(String(e), "err"));
  }, [show]);

  return (
    <>
      <h1 className="adm-h1">Тексты</h1>
      <p className="adm-sub">Редактирование текстов сайта по языкам.</p>

      <div className="adm-tabs">
        {langs.map((l) => (
          <button key={l} className={l === lang ? "on" : ""} onClick={() => setLang(l)}>
            {LANG_LABEL[l] ?? l}
          </button>
        ))}
      </div>

      {keys.map((key) => {
        const data = blocks[lang]?.[key];
        if (!data) return null;
        return (
          <BlockEditor
            key={`${lang}-${key}`}
            title={BLOCK_LABEL[key] ?? key}
            data={data}
            onSave={async (next) => {
              await api.putBlock(lang, key, next);
              setBlocks((b) => ({ ...b, [lang]: { ...b[lang], [key]: next } }));
              show("Сохранено");
            }}
          />
        );
      })}
      {node}
    </>
  );
}

function BlockEditor({ title, data, onSave }: {
  title: string;
  data: Record<string, unknown>;
  onSave: (next: Record<string, unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() => toDraft(data));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function save() {
    setErr("");
    let next: Record<string, unknown>;
    try {
      next = fromDraft(data, draft);
    } catch (e) {
      setErr(`Ошибка JSON: ${(e as Error).message}`);
      return;
    }
    setBusy(true);
    onSave(next).catch((e) => setErr(String(e))).finally(() => setBusy(false));
  }

  return (
    <div className="adm-block">
      <h3>{title}</h3>
      {Object.entries(data).map(([field, value]) => {
        const isStr = typeof value === "string";
        return (
          <div className="adm-field" key={field}>
            <label>{field}</label>
            <textarea
              className={`adm-in${isStr ? "" : " mono"}`}
              rows={isStr ? (String(value).length > 80 ? 3 : 1) : 5}
              value={draft[field]}
              onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
            />
          </div>
        );
      })}
      {err && <div className="adm-login err" style={{ marginBottom: 12 }}>{err}</div>}
      <button className="adm-btn" onClick={save} disabled={busy}>
        {busy ? "Сохранение…" : "Сохранить"}
      </button>
    </div>
  );
}

function toDraft(data: Record<string, unknown>): Record<string, string> {
  const d: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    d[k] = typeof v === "string" ? v : JSON.stringify(v, null, 2);
  }
  return d;
}

function fromDraft(orig: Record<string, unknown>, draft: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(orig)) {
    out[k] = typeof v === "string" ? draft[k] : JSON.parse(draft[k]);
  }
  return out;
}
