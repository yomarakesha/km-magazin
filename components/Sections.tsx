"use client";
import { useLang } from "@/lib/lang";
import type { Section } from "@/lib/content";
import Reveal from "./Reveal";
import Icon from "./Icon";
import Gallery from "./Gallery";

export function About() {
  const { c } = useLang();
  return (
    <section id="about">
      <div className="wrap">
        <div className="about-grid">
          <Reveal>
            <span className="code">{c.aboutCode}</span>
            <h2 className="title">{c.aboutTitle}</h2>
            <p style={{ marginTop: 22 }}>{c.aboutBody}</p>
          </Reveal>
          <div className="stats">
            {c.stats.map((s, i) => (
              <Reveal key={i} className="stat" delay={i * 0.05}>
                <div className="snum">{s[0]}</div>
                <div className="slab">{s[1]}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ServiceBlock({ s, alt }: { s: Section; alt: boolean }) {
  return (
    <Reveal id={s.id} className={`svc${alt ? " alt" : ""}`}>
      <div className="svc-info">
        <div className="svc-head">
          <Icon name={s.icon} className="svc-ic" />
          <span className="code">{s.no} / {s.code}</span>
        </div>
        <div className="svc-no">{s.no}</div>
        <h3>{s.title}</h3>
        <p>{s.body}</p>
        <ul className="feats">
          {s.feats.map((f, i) => (
            <li key={i}><Icon name="check" className="li" />{f}</li>
          ))}
        </ul>
      </div>
      <div className="svc-media"><Gallery section={s} /></div>
    </Reveal>
  );
}

export function Services() {
  const { c } = useLang();
  return (
    <section id="services">
      <div className="wrap">
        <Reveal className="sec-head">
          <span className="code">{c.servicesCode}</span>
          <h2 className="title">{c.servicesTitle}</h2>
          <div className="sub">{c.servicesSub}</div>
        </Reveal>
        <div className="dirs">
          {c.sections.map((s) => (
            <Reveal key={s.id}>
              <a className="dir" href={`#${s.id}`}>
                <Icon name={s.icon} />
                <b>{s.short}</b>
                <span className="ar">{s.no} · {c.more} →</span>
              </a>
            </Reveal>
          ))}
        </div>
        {c.sections.map((s, i) => (
          <ServiceBlock key={s.id} s={s} alt={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

export function Process() {
  const { c } = useLang();
  return (
    <section id="process">
      <div className="wrap">
        <Reveal className="sec-head">
          <span className="code">{c.processCode}</span>
          <h2 className="title">{c.processTitle}</h2>
        </Reveal>
        <div className="proc">
          {c.process.map((p, i) => (
            <Reveal key={i} className="step" delay={(i % 3) * 0.05}>
              <div className="step-no">{p[0]}</div>
              <div className="step-t">{p[1]}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Advantages() {
  const { c } = useLang();
  return (
    <section id="advantages">
      <div className="wrap">
        <Reveal className="sec-head">
          <span className="code">{c.advCode}</span>
          <h2 className="title">{c.advTitle}</h2>
        </Reveal>
        <div className="adv">
          {c.adv.map((a, i) => (
            <Reveal key={i} className="adv-card" delay={i * 0.05}>
              <div className="adv-ic"><Icon name={a[0]} /></div>
              <h4>{a[1]}</h4>
              <p>{a[2]}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  const { c } = useLang();
  const k = c.contact;
  return (
    <section id="contact">
      <div className="wrap">
        <Reveal className="contact-card">
          <div className="cc-l">
            <span className="code">{c.contactCode}</span>
            <h2>{c.contactTitle}</h2>
            <div className="sub">{c.contactSub}</div>
            <div className="rows">
              <div className="row"><b>{c.lbl.addr}</b><span>{k.addr}</span></div>
              <div className="row"><b>{c.lbl.phone}</b><a href={`tel:${k.phone.replace(/\s/g, "")}`}>{k.phone}</a></div>
              <div className="row"><b>{c.lbl.email}</b><a href={`mailto:${k.email}`}>{k.email}</a></div>
            </div>
            <a className="cta-pdf" href="/km-catalog.pdf" download>
              <Icon name="download" className="cta-ic" />
              <span>{c.catalogCta}</span>
            </a>
          </div>
          <div className="cc-r">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/km-logo.png" alt="KM" />
            <div className="nm">KM</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  const { c } = useLang();
  return (
    <footer>© 2026 <b>{c.contact.legal}</b> · KM — {c.tagline}</footer>
  );
}
