import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import { About, Services, Process, Advantages, Contact, Footer } from "@/components/Sections";
import { getSiteData } from "@/lib/content-server";

export default async function Home() {
  const { content, mediaBase } = await getSiteData();
  return (
    <Providers content={content} mediaBase={mediaBase}>
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
