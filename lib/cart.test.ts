import { describe, expect, it } from "vitest";
import {
  addItem,
  cartCount,
  cartTotal,
  cartUid,
  effectiveDiscount,
  removeItem,
  setItemQty,
  type CartItem,
} from "./cart";

function item(over: Partial<CartItem> = {}): CartItem {
  return {
    id: 1,
    kind: "product",
    slug: "test",
    titles: { ru: "Тест" },
    price: 100,
    currency: "TMT",
    image: null,
    qty: 1,
    ...over,
  };
}

describe("cartUid", () => {
  it("includes the kind so product and service ids never collide", () => {
    expect(cartUid({ id: 5, kind: "product" })).toBe("product:5");
    expect(cartUid({ id: 5, kind: "service" })).toBe("service:5");
    expect(cartUid({ id: 5, kind: "product" })).not.toBe(cartUid({ id: 5, kind: "service" }));
  });

  it("defaults a missing kind to product (legacy carts)", () => {
    expect(cartUid({ id: 7 })).toBe("product:7");
  });
});

describe("addItem", () => {
  it("appends a new line", () => {
    const next = addItem([], item());
    expect(next).toHaveLength(1);
    expect(next[0].qty).toBe(1);
  });

  it("merges qty into an existing line", () => {
    const prev = [item({ qty: 2 })];
    const next = addItem(prev, item({ qty: 3 }));
    expect(next).toHaveLength(1);
    expect(next[0].qty).toBe(5);
  });

  it("keeps same-id product and service as separate lines", () => {
    const prev = [item({ id: 1, kind: "product" })];
    const next = addItem(prev, item({ id: 1, kind: "service" }));
    expect(next).toHaveLength(2);
  });

  it("does not mutate the previous array", () => {
    const prev = [item({ qty: 1 })];
    addItem(prev, item({ qty: 9 }));
    expect(prev[0].qty).toBe(1);
  });
});

describe("setItemQty", () => {
  it("sets the quantity of the matching line only", () => {
    const prev = [item({ id: 1 }), item({ id: 2 })];
    const next = setItemQty(prev, "product:2", 7);
    expect(next[0].qty).toBe(1);
    expect(next[1].qty).toBe(7);
  });

  it("clamps quantity to a minimum of 1 (removal is explicit)", () => {
    const next = setItemQty([item()], "product:1", 0);
    expect(next[0].qty).toBe(1);
    expect(setItemQty([item()], "product:1", -5)[0].qty).toBe(1);
  });
});

describe("removeItem", () => {
  it("removes only the matching line", () => {
    const prev = [item({ id: 1 }), item({ id: 1, kind: "service" })];
    const next = removeItem(prev, "product:1");
    expect(next).toHaveLength(1);
    expect(next[0].kind).toBe("service");
  });
});

describe("cartCount / cartTotal", () => {
  it("sums quantities and price*qty across lines", () => {
    const items = [item({ price: 100, qty: 2 }), item({ id: 2, price: 50, qty: 3 })];
    expect(cartCount(items)).toBe(5);
    expect(cartTotal(items)).toBe(350);
  });

  it("is zero for an empty cart", () => {
    expect(cartCount([])).toBe(0);
    expect(cartTotal([])).toBe(0);
  });
});

describe("effectiveDiscount", () => {
  it("passes the discount through when below the total", () => {
    expect(effectiveDiscount(30, 100)).toBe(30);
  });

  it("never exceeds the payable total", () => {
    expect(effectiveDiscount(500, 100)).toBe(100);
  });

  it("treats null/undefined/zero as no discount", () => {
    expect(effectiveDiscount(null, 100)).toBe(0);
    expect(effectiveDiscount(undefined, 100)).toBe(0);
    expect(effectiveDiscount(0, 100)).toBe(0);
  });
});
