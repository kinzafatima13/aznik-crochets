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

test("prepaid orders have free delivery", () => {
  const result = shippingFor({
    method: "easypaisa",
    shippingPkr: 250,
    freeOver: 0,
    subtotal: 4500,
    mysteryFreeEnabled: true,
    lines: [{ kind: "ready", linePkr: 4500, qualifiesMysteryFree: false }],
  });
  assert.equal(result.shippingPkr, 0);
  assert.equal(result.shippingDiscountPkr, 250);
});

test("cash on delivery charges the courier fee", () => {
  const result = shippingFor({
    method: "cod",
    shippingPkr: 250,
    freeOver: 0,
    subtotal: 4500,
    mysteryFreeEnabled: true,
    lines: [{ kind: "ready", linePkr: 4500, qualifiesMysteryFree: false }],
  });
  assert.equal(result.shippingPkr, 250);
  assert.equal(result.shippingDiscountPkr, 0);
});

test("prepaid mixed parcels stay free", () => {
  const result = shippingFor({
    method: "jazzcash",
    shippingPkr: 250,
    freeOver: 0,
    subtotal: 9000,
    mysteryFreeEnabled: true,
    lines: [
      { kind: "mystery", linePkr: 1990, qualifiesMysteryFree: true },
      { kind: "ready", linePkr: 7010, qualifiesMysteryFree: false },
    ],
  });
  assert.equal(result.shippingPkr, 0);
});

test("cash on delivery does not unlock free delivery", () => {
  const result = shippingFor({
    method: "cod",
    shippingPkr: 250,
    freeOver: 0,
    subtotal: 1990,
    mysteryFreeEnabled: true,
    lines: [{ kind: "mystery", linePkr: 1990, qualifiesMysteryFree: true }],
  });
  assert.equal(result.shippingPkr, 250);
});

test("advance payment is free even when the mystery offer is off", () => {
  const result = shippingFor({
    method: "bank",
    shippingPkr: 250,
    freeOver: 0,
    subtotal: 1990,
    mysteryFreeEnabled: false,
    lines: [{ kind: "mystery", linePkr: 1990, qualifiesMysteryFree: true }],
  });
  assert.equal(result.shippingPkr, 0);
  assert.equal(result.shippingDiscountPkr, 250);
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
