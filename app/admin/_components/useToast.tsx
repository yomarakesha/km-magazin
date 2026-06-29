"use client";
import { useCallback, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);

  const show = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const node = toast ? <div className={`adm-toast ${toast.kind}`}>{toast.msg}</div> : null;
  return { show, node };
}
