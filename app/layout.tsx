import type { Metadata, Viewport } from "next";
import "./globals.css";

// Fonts are loaded via <link> (browser-side) rather than next/font to avoid a
// build-time dependency on fonts.gstatic.com. globals.css references the same
// family names (Unbounded / Manrope / JetBrains Mono) as fallbacks.
const GOOGLE_FONTS =
  "https://fonts.googleapis.com/css2?family=Unbounded:wght@600;800&family=Manrope:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap";

export const metadata: Metadata = {
  title: "KM · Kanagatly Mahabat — Системы безопасности и автоматизации",
  description:
    "Kanagatly Mahabat (KM) — проектирование, монтаж и программирование систем безопасности и автоматизации: СКУД, Face ID, видеонаблюдение, ЛВС, пожарная сигнализация, кондиционеры, шлагбаумы и разработка ПО. Ашхабад.",
  icons: { icon: "/assets/km-logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#070b09",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS} />
      </head>
      <body>{children}</body>
    </html>
  );
}
