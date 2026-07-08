"use client";
import { useCallback, useRef, useState } from "react";

/** Styled replacement for window.confirm(): const ok = await ask("Удалить?") */
export function useConfirm() {
  const [msg, setMsg] = useState<string | null>(null);
  const resolver = useRef<(ok: boolean) => void>(null);

  const ask = useCallback((message: string) => {
    setMsg(message);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const close = (ok: boolean) => {
    setMsg(null);
    resolver.current?.(ok);
    resolver.current = null;
  };

  const node = msg ? (
    <div className="adm-confirm-back" onClick={() => close(false)}>
      <div className="adm-confirm" onClick={(e) => e.stopPropagation()}>
        <p>{msg}</p>
        <div className="btns">
          <button className="adm-btn ghost sm" onClick={() => close(false)}>Отмена</button>
          <button className="adm-btn danger sm" onClick={() => close(true)} autoFocus>Удалить</button>
        </div>
      </div>
    </div>
  ) : null;

  return { ask, node };
}
