"use client";
import { LangProvider } from "@/lib/lang";
import { LightboxProvider } from "./Lightbox";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <LightboxProvider>{children}</LightboxProvider>
    </LangProvider>
  );
}
