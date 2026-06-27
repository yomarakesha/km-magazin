import type { Metadata, Viewport } from "next";
import { Unbounded, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const disp = Unbounded({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["600", "800"], variable: "--font-disp", display: "swap" });
const body = Manrope({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["400", "500", "700", "800"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["400", "500", "700"], variable: "--font-mono", display: "swap" });

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
    <html lang="ru" className={`${disp.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
