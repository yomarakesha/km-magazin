"use client";
import type { Facet, I18n } from "@/lib/shop-types";
import Icon from "./ui/Icon";

interface Props {
  facets: Facet[];
  t: (k: string) => string;
  pick: (m: I18n) => string;
  get: (k: string) => string;
  isSelected: (k: string, v: string) => boolean;
  toggleSelect: (k: string, v: string) => void;
  setParam: (k: string, v: string) => void;
  toggleBool: (k: string) => void;
}

/** Horizontal filter bar above the product grid: in-stock toggle + a dropdown
 *  per facet. Dropdowns use native <details> so they need no extra JS. */
export default function FilterBar({ facets, t, pick, get, isSelected, toggleSelect, setParam, toggleBool }: Props) {
  const inStock = !!get("in_stock");
  const hasPrice = !!(get("price_min") || get("price_max"));

  return (
    <div className="shop-filterbar">
      <span className="shop-fb-label"><Icon name="filter" size={16} /> {t("filters")}</span>

      <button className={`shop-fb-toggle ${inStock ? "on" : ""}`} onClick={() => toggleBool("in_stock")}>
        {inStock && <Icon name="check" size={13} />} {t("onlyInStock")}
      </button>

      <details className="shop-fdd">
        <summary>
          {t("price")}{hasPrice && <i className="dot" />}<Icon name="chevron" size={13} />
        </summary>
        <div className="shop-fdd-panel">
          <div className="shop-range">
            <input type="number" inputMode="numeric" placeholder={t("from")} defaultValue={get("price_min")}
              onBlur={(e) => setParam("price_min", e.target.value)} />
            <input type="number" inputMode="numeric" placeholder={t("to")} defaultValue={get("price_max")}
              onBlur={(e) => setParam("price_max", e.target.value)} />
          </div>
        </div>
      </details>

      {facets.map((f) => {
        const label = pick(f.label) || f.key;
        if (f.type === "number") {
          const a = get(`${f.key}_min`), b = get(`${f.key}_max`);
          return (
            <details className="shop-fdd" key={f.key}>
              <summary>
                {label}{f.unit ? `, ${f.unit}` : ""}{(a || b) && <i className="dot" />}<Icon name="chevron" size={13} />
              </summary>
              <div className="shop-fdd-panel">
                <div className="shop-range">
                  <input type="number" inputMode="numeric" placeholder={f.min != null ? String(f.min) : t("from")} defaultValue={a}
                    onBlur={(e) => setParam(`${f.key}_min`, e.target.value)} />
                  <input type="number" inputMode="numeric" placeholder={f.max != null ? String(f.max) : t("to")} defaultValue={b}
                    onBlur={(e) => setParam(`${f.key}_max`, e.target.value)} />
                </div>
              </div>
            </details>
          );
        }
        const options = (f.options ?? []).filter((o) => o.count > 0 || isSelected(f.key, o.value));
        if (options.length === 0) return null;
        const activeN = options.filter((o) => isSelected(f.key, o.value)).length;
        return (
          <details className="shop-fdd" key={f.key}>
            <summary>
              {label}{activeN > 0 ? ` · ${activeN}` : ""}<Icon name="chevron" size={13} />
            </summary>
            <div className="shop-fdd-panel">
              <div className="shop-facet-opts">
                {options.map((o) => (
                  <label key={o.value} className="shop-check">
                    <input type="checkbox" checked={isSelected(f.key, o.value)} onChange={() => toggleSelect(f.key, o.value)} />
                    <span>{o.value}</span>
                    <span className="shop-facet-count">{o.count}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
