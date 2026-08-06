import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Unbounded } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font (downloaded at build time, served same-origin):
// no render-blocking Google Fonts CSS, no CLS. globals.css consumes the
// variables with the original family names as fallbacks.
const disp = Unbounded({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["600", "800"],
  variable: "--font-disp",
  display: "swap",
});
const body = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-body",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KM · Kanagatly Mahabat — Системы безопасности и автоматизации",
  description:
    "Kanagatly Mahabat (KM) — проектирование, монтаж и программирование систем безопасности и автоматизации: СКУД, Face ID, видеонаблюдение, ЛВС, пожарная сигнализация, кондиционеры, шлагбаумы и разработка ПО. Ашхабад.",
  icons: { icon: "/assets/km-logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#0a0906",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${disp.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        {/* Night (gold on dark) is the default; km-theme="light" switches to the
            day variant. ?theme=light / ?theme=dark also sets it. Runs before
            hydration so there is no flash of the wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var q=new URLSearchParams(location.search).get("theme");if(q==="light"||q==="dark")localStorage.setItem("km-theme",q);if(localStorage.getItem("km-theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}})();',
          }}
        />
        {children}
      </body>
    </html>
  );
}
