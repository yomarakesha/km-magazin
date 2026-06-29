"use client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: opts.body && !(opts.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : undefined,
    ...opts,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(`API ${status}: ${detail}`);
  }
}

export const api = {
  base: API,
  // auth
  login: (password: string) => req("/api/auth/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => req("/api/auth/logout", { method: "POST" }),
  me: () => req<{ authenticated: boolean }>("/api/auth/me"),
  // content blocks
  getBlocks: () => req<{ keys: string[]; langs: string[]; blocks: Record<string, Record<string, Record<string, unknown>>> }>("/api/admin/content"),
  putBlock: (lang: string, key: string, data: Record<string, unknown>) =>
    req(`/api/admin/content/${lang}/${key}`, { method: "PUT", body: JSON.stringify({ data }) }),
  // services
  getServices: () => req<AdminService[]>("/api/admin/services"),
  getService: (id: number) => req<AdminService>(`/api/admin/services/${id}`),
  createService: (body: unknown) => req<AdminService>("/api/admin/services", { method: "POST", body: JSON.stringify(body) }),
  updateService: (id: number, body: unknown) => req<AdminService>(`/api/admin/services/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteService: (id: number) => req(`/api/admin/services/${id}`, { method: "DELETE" }),
  reorderServices: (ids: number[]) => req("/api/admin/services/reorder", { method: "POST", body: JSON.stringify({ ids }) }),
  // media
  getMedia: (serviceId: number) => req<AdminMedia[]>(`/api/admin/services/${serviceId}/media`),
  uploadMedia: (serviceId: number, form: FormData) =>
    req<AdminMedia>(`/api/admin/services/${serviceId}/media`, { method: "POST", body: form }),
  updateMedia: (id: number, body: unknown) => req<AdminMedia>(`/api/admin/media/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteMedia: (id: number) => req(`/api/admin/media/${id}`, { method: "DELETE" }),
  reorderMedia: (serviceId: number, ids: number[]) =>
    req(`/api/admin/services/${serviceId}/media/reorder`, { method: "POST", body: JSON.stringify({ ids }) }),
  // leads
  getLeads: () => req<Lead[]>("/api/admin/leads"),
  setLeadStatus: (id: number, status: string) => req<Lead>(`/api/admin/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteLead: (id: number) => req(`/api/admin/leads/${id}`, { method: "DELETE" }),
};

export interface AdminTranslation {
  lang: string; code: string; short: string; title: string; body: string; feats: string[];
}
export interface AdminService {
  id: number; slug: string; icon: string; enabled: boolean; sort_order: number;
  media_count?: number; translations: AdminTranslation[];
}
export interface AdminMedia {
  id: number; kind: string; filename: string; poster: string | null;
  still: boolean; caption_kind: string; sort_order: number;
}
export interface Lead {
  id: number; name: string; phone: string; email: string; message: string;
  status: string; created_at: string;
}
