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
  const [draft, setDraft] = useState<Record<string, unknown>>(() => clone(data));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function save() {
    setErr("");
    setBusy(true);
    onSave(draft).catch((e) => setErr(String(e))).finally(() => setBusy(false));
  }

  return (
    <div className="adm-block">
      <h3>{title}</h3>
      {Object.entries(draft).map(([field, value]) => (
        <div className="adm-field" key={field}>
          <label>{FIELD_LABEL[field] ?? field}</label>
          <ValueEditor value={value} onChange={(nv) => setDraft((d) => ({ ...d, [field]: nv }))} />
        </div>
      ))}
      {err && <div className="adm-login err" style={{ marginBottom: 12 }}>{err}</div>}
      <button className="adm-btn" onClick={save} disabled={busy}>
        {busy ? "Сохранение…" : "Сохранить"}
      </button>
    </div>
  );
}

/** Recursively renders a value: string -> textarea, array -> add/remove rows,
 *  object -> a field per key. No raw JSON — every leaf is a normal input. */
function ValueEditor({ value, onChange }: { value: unknown; onChange: (next: unknown) => void }) {
  if (typeof value === "number") {
    return (
      <input
        className="adm-in"
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    );
  }
  if (Array.isArray(value)) {
    return (
      <div className="adm-list">
        {value.map((item, i) => (
          <div className="adm-list-row" key={i}>
            <div className="adm-list-val">
              <ValueEditor value={item} onChange={(nv) => onChange(value.map((v, j) => (j === i ? nv : v)))} />
            </div>
            <button
              type="button"
              className="adm-btn danger sm"
              title="Удалить пункт"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="adm-btn ghost sm"
          onClick={() => onChange([...value, blankLike(value[0])])}
        >
          + пункт
        </button>
      </div>
    );
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return (
      <div className="adm-obj">
        {Object.entries(obj).map(([k, v]) => (
          <div className="adm-field" key={k}>
            <label>{FIELD_LABEL[k] ?? k}</label>
            <ValueEditor value={v} onChange={(nv) => onChange({ ...obj, [k]: nv })} />
          </div>
        ))}
      </div>
    );
  }
  // string (and null/undefined fall back to an empty text field)
  const str = typeof value === "string" ? value : "";
  return (
    <textarea
      className="adm-in"
      rows={str.length > 80 ? 3 : 1}
      value={str}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** A blank value shaped like `sample`, used by the "+ пункт" button so a new
 *  list item matches the structure of the existing ones (tuple / object / text). */
function blankLike(sample: unknown): unknown {
  if (Array.isArray(sample)) return sample.map(blankLike);
  if (sample && typeof sample === "object") {
    return Object.fromEntries(Object.entries(sample).map(([k, v]) => [k, blankLike(v)]));
  }
  if (typeof sample === "number") return 0;
  return "";
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

// Friendly labels for the technical block field keys — no jargon in the UI.
const FIELD_LABEL: Record<string, string> = {
  // meta
  brandFull: "Полное название бренда", tagline: "Слоган",
  // hero
  heroKicker: "Надзаголовок (главный экран)", heroSub: "Подзаголовок", heroScroll: "Подпись «прокрутите»",
  // marquee
  marquee: "Строки бегущей строки",
  // nav
  nav: "Пункты меню", about: "О компании", services: "Услуги",
  // about
  aboutCode: "Код раздела (бейдж)", aboutTitle: "Заголовок раздела", aboutBody: "Текст раздела",
  stats: "Цифры (значение + подпись)",
  // services (headings)
  servicesCode: "Код раздела (бейдж)", servicesTitle: "Заголовок раздела", servicesSub: "Подзаголовок",
  more: "Кнопка «подробнее»", mediaSoon: "Текст «медиа скоро»",
  // process
  processCode: "Код раздела (бейдж)", processTitle: "Заголовок раздела", process: "Шаги процесса",
  // advantages
  advCode: "Код раздела (бейдж)", advTitle: "Заголовок раздела", adv: "Преимущества",
  // contact
  contactCode: "Код раздела (бейдж)", contactTitle: "Заголовок раздела", contactSub: "Подзаголовок",
  catalogCta: "Кнопка каталога", lbl: "Подписи полей", contact: "Контакты",
  capVideo: "Подпись видео", capPhoto: "Подпись фото", close: "Кнопка «закрыть»", play: "Кнопка «смотреть»",
  addr: "Адрес", phone: "Телефон", email: "Email",
};
