import { describe, it, expect } from "vitest";
import { nationalDigits, formatPhone, canonicalPhone, isValidPhone } from "./phone";

describe("nationalDigits", () => {
  it("strips non-digits", () => {
    expect(nationalDigits("65 12-34 56")).toBe("65123456");
  });
  it("drops +993 country code", () => {
    expect(nationalDigits("+993 65 123456")).toBe("65123456");
  });
  it("drops leading 8 trunk prefix on long numbers", () => {
    expect(nationalDigits("865123456")).toBe("65123456");
  });
  it("caps at 8 digits", () => {
    expect(nationalDigits("651234567890")).toBe("65123456");
  });
  it("empty stays empty", () => {
    expect(nationalDigits("")).toBe("");
  });
});

describe("formatPhone", () => {
  it("formats a full number", () => {
    expect(formatPhone("65123456")).toBe("+993 65 123456");
  });
  it("formats partial input progressively", () => {
    expect(formatPhone("65")).toBe("+993 65");
    expect(formatPhone("651")).toBe("+993 65 1");
  });
  it("empty stays empty", () => {
    expect(formatPhone("")).toBe("");
  });
  it("re-formats already-formatted input idempotently", () => {
    expect(formatPhone("+993 65 123456")).toBe("+993 65 123456");
  });
});

describe("canonicalPhone", () => {
  it("produces +99365123456", () => {
    expect(canonicalPhone("65 123456")).toBe("+99365123456");
  });
  it("empty stays empty", () => {
    expect(canonicalPhone("")).toBe("");
  });
});

describe("isValidPhone", () => {
  it("true for 8 national digits", () => {
    expect(isValidPhone("+993 65 123456")).toBe(true);
  });
  it("false when too short", () => {
    expect(isValidPhone("65 1234")).toBe(false);
  });
});
