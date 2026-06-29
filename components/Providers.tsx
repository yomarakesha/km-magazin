"use client";
import { LangProvider } from "@/lib/lang";
import { LightboxProvider } from "./Lightbox";
import type { Content, Lang } from "@/lib/content";

export default function Providers({
  content,
  mediaBase,
  children,
}: {
  content: Record<Lang, Content>;
  mediaBase: string;
  children: React.ReactNode;
}) {
  return (
    <LangProvider content={content} mediaBase={mediaBase}>
      <LightboxProvider>{children}</LightboxProvider>
    </LangProvider>
  );
}
