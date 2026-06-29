"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type AdminService, type Lead } from "@/lib/admin-api";

export default function Dashboard() {
  const [services, setServices] = useState<AdminService[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    api.getServices().then(setServices).catch(() => {});
    api.getLeads().then(setLeads).catch(() => {});
  }, []);

  const mediaCount = services.reduce((n, s) => n + (s.media_count ?? 0), 0);
  const newLeads = leads.filter((l) => l.status === "new").length;

  return (
    <>
      <h1 className="adm-h1">Дашборд</h1>
      <p className="adm-sub">Управление контентом сайта KM.</p>

      <div className="adm-cards adm-section">
        <Link className="adm-card" href="/admin/services">
          <div className="n">{services.length}</div>
          <div className="l">Услуги</div>
        </Link>
        <div className="adm-card">
          <div className="n">{mediaCount}</div>
          <div className="l">Медиа файлов</div>
        </div>
        <Link className="adm-card" href="/admin/leads">
          <div className="n">{newLeads}</div>
          <div className="l">Новых заявок</div>
        </Link>
        <Link className="adm-card" href="/admin/content">
          <div className="n">3</div>
          <div className="l">Языка</div>
        </Link>
      </div>
    </>
  );
}
