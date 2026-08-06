import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import { About, Services, Process, Advantages, Contact, Footer } from "@/components/Sections";
import { getSiteData } from "@/lib/content-server";
import { SITE_URL, abs } from "@/lib/site";
import { SHOP_ENABLED } from "@/lib/shop-flag";
import JsonLd from "@/components/JsonLd";

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kanagatly Mahabat",
  alternateName: "KM",
  url: SITE_URL,
  logo: `${SITE_URL}/assets/km-logo.png`,
  description:
    "Проектирование, монтаж и программирование систем безопасности и автоматизации: СКУД, Face ID, видеонаблюдение, ЛВС, пожарная сигнализация. Ашхабад.",
  address: { "@type": "PostalAddress", addressLocality: "Ашхабад", addressCountry: "TM" },
  // don't advertise the storefront while it is switched off
  ...(SHOP_ENABLED ? { sameAs: [abs("/shop")] } : {}),
};

export default async function Home() {
  const { content, mediaBase } = await getSiteData();
  return (
    <Providers content={content} mediaBase={mediaBase}>
      <JsonLd data={organizationLd} />
      <Nav />
      <Hero />
      <Marquee />
      <About />
      <Services />
      <Process />
      <Advantages />
      <Contact />
      <Footer />
    </Providers>
  );
}
