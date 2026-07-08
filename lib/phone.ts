/** Turkmenistan phone formatting. Local numbers are +993 65 XXXXXX (8-digit
 *  subscriber part after the 993 country code). We format progressively as the
 *  user types and keep a canonical value for submission. */

const CC = "993";

/** Keep only digits, drop a leading country code / 8-trunk prefix so we work
 *  with the national subscriber number (up to 8 digits). */
export function nationalDigits(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith(CC)) d = d.slice(CC.length);
  else if (d.startsWith("8") && d.length > 8) d = d.slice(1);
  return d.slice(0, 8);
}

/** Progressive display mask: "+993 65 123456". Partial input formats as far as
 *  it goes so the caret behaves while typing. */
export function formatPhone(input: string): string {
  const n = nationalDigits(input);
  if (n === "") return "";
  const parts = [n.slice(0, 2), n.slice(2)].filter(Boolean);
  return `+${CC} ${parts.join(" ")}`.trimEnd();
}

/** Canonical E.164-ish value for storage/submission: "+99365123456". */
export function canonicalPhone(input: string): string {
  const n = nationalDigits(input);
  return n ? `+${CC}${n}` : "";
}

/** A complete TM mobile number has all 8 national digits. */
export function isValidPhone(input: string): boolean {
  return nationalDigits(input).length === 8;
}
