import assert from "node:assert/strict";
import test from "node:test";
import { couponDiscount, shippingFor } from "./pricing.ts";

test("prepaid mystery-only order gets free delivery", () => {
  const result = shippingFor({
    method: "bank",
    shippingPkr: 350,
    freeOver: 0,
    subtotal: 4900,
    mysteryFreeEnabled: true,
    lines: [{ kind: "mystery", linePkr: 4900, qualifiesMysteryFree: true }],
  });
  assert.equal(result.shippingPkr, 0);
  assert.equal(result.shippingDiscountPkr, 350);
});

test("ready-made order keeps standard delivery", () => {
  const result = shippingFor({
    method: "easypaisa",
    shippingPkr: 350,
    freeOver: 0,
    subtotal: 4500,
    mysteryFreeEnabled: true,
    lines: [{ kind: "ready", linePkr: 4500, qualifiesMysteryFree: false }],
  });
  assert.equal(result.shippingPkr, 350);
  assert.equal(result.shippingDiscountPkr, 0);
});

test("mixed parcel does not wipe delivery for other pieces", () => {
  const result = shippingFor({
    method: "jazzcash",
    shippingPkr: 350,
    freeOver: 0,
    subtotal: 9000,
    mysteryFreeEnabled: true,
    lines: [
      { kind: "mystery", linePkr: 1990, qualifiesMysteryFree: true },
      { kind: "ready", linePkr: 7010, qualifiesMysteryFree: false },
    ],
  });
  assert.equal(result.shippingPkr, 350);
  assert.match(result.note, /other pieces/i);
});

test("cash on delivery does not unlock mystery free delivery", () => {
  const result = shippingFor({
    method: "cod",
    shippingPkr: 350,
    freeOver: 0,
    subtotal: 1990,
    mysteryFreeEnabled: true,
    lines: [{ kind: "mystery", linePkr: 1990, qualifiesMysteryFree: true }],
  });
  assert.equal(result.shippingPkr, 350);
});

test("the offer stays off when the shop has disabled it", () => {
  const result = shippingFor({
    method: "bank",
    shippingPkr: 350,
    freeOver: 0,
    subtotal: 1990,
    mysteryFreeEnabled: false,
    lines: [{ kind: "mystery", linePkr: 1990, qualifiesMysteryFree: true }],
  });
  assert.equal(result.shippingPkr, 350);
  assert.equal(result.shippingDiscountPkr, 0);
});

test("catalog coupon ignores mystery value", () => {
  const result = couponDiscount({
    kind: "percent",
    amount: 10,
    minSubtotal: 1000,
    appliesTo: "catalog",
    catalogPkr: 2000,
    customPkr: 0,
    subtotal: 7000,
  });
  assert.equal(result.discountPkr, 200);
});
