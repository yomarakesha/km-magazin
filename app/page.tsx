import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import { About, Services, Process, Advantages, Contact, Footer } from "@/components/Sections";

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <Marquee />
      <About />
      <Services />
      <Process />
      <Advantages />
      <Contact />
      <Footer />
    </>
  );
}
