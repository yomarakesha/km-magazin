import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("transliterates Russian", () => {
    expect(slugify("Ноутбуки и компьютеры")).toBe("noutbuki-i-kompyutery");
    expect(slugify("Жёсткий диск")).toBe("zhestkiy-disk");
  });

  it("transliterates Turkmen latin extras", () => {
    expect(slugify("Kömek üçin çözgüt")).toBe("komek-ucin-cozgut");
  });

  it("collapses punctuation/spaces into single dashes and trims them", () => {
    expect(slugify("  Hello,   World! ")).toBe("hello-world");
    expect(slugify("---a---b---")).toBe("a-b");
  });

  it("lowercases and keeps digits", () => {
    expect(slugify("RTX 4060 Ti")).toBe("rtx-4060-ti");
  });

  it("handles empty and symbol-only input", () => {
    expect(slugify("")).toBe("");
    expect(slugify("!!!")).toBe("");
  });

  it("caps the slug at 64 chars", () => {
    expect(slugify("a".repeat(100)).length).toBeLessThanOrEqual(64);
  });
});
