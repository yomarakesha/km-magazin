"use client";

/** Orders placed from this browser, kept in localStorage so the customer can
 * revisit their statuses without an account (the phone doubles as the key
 * the backend checks on lookup). */
export interface MyOrderRef {
  id: number;
  phone: string;
  at: string; // ISO date of placement
}

const KEY = "km_my_orders";
const MAX = 20;

export function loadMyOrders(): MyOrderRef[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as MyOrderRef[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function rememberOrder(id: number, phone: string): void {
  try {
    const list = [{ id, phone, at: new Date().toISOString() },
      ...loadMyOrders().filter((o) => o.id !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export function forgetOrder(id: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadMyOrders().filter((o) => o.id !== id)));
  } catch {}
}
