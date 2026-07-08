"use client";

/** Last-used checkout details, kept in localStorage so returning customers
 *  don't retype their name/phone/address. No account, purely a convenience. */
export interface Customer {
  name: string;
  phone: string;
  address: string;
}

const KEY = "km_customer";

export function loadCustomer(): Customer | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Customer;
    return c && typeof c.name === "string" ? c : null;
  } catch {
    return null;
  }
}

export function saveCustomer(c: Customer): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {}
}
