import assert from "node:assert/strict";
import test from "node:test";
import { phonesMatch } from "./access.ts";
import { fieldsFromItem, filterLines, itemsCsv, productionStatus, summaryCsv, type ExportLine } from "./csv.ts";

function line(patch: Partial<ExportLine> = {}): ExportLine {
  return {
    orderId: "AZ-TEST01",
    createdAt: "2026-10-21 15:04",
    createdDay: "2026-10-21",
    customerName: "Kinza, Fatima",
    customerPhone: "03001234567",
    customerEmail: "kinza@example.com",
    address: "House 4\nStreet 9",
    city: "Islamabad",
    paymentMethod: "bank",
    paymentStatus: "paid",
    paymentReference: "TXN-1",
    fulfillmentStatus: "in_production",
    shippingMethod: "Standard delivery",
    tracking: "",
    adminNotes: 'Said "gift wrap"',
    discountPkr: 100,
    deliveryPkr: 350,
    subtotalPkr: 5000,
    totalPkr: 5250,
    kind: "mixed",
    productName: "Daisy Phone Pouch",
    sku: "pouch-daisy",
    productType: "ready-made",
    qty: 1,
    color: "Ivory",
    size: "Phone",
    customization: "",
    designNotes: "",
    unitPkr: 2700,
    customizationPkr: 0,
    mysteryTier: "",
    giftMessage: "",
    privateNote: "",
    itemKind: "ready",
    ...patch,
  };
}

test("phones match local and international forms", () => {
  assert.equal(phonesMatch("0300-1234567", "+92 300 1234567"), true);
  assert.equal(phonesMatch("03001111111", "03002222222"), false);
});

test("items csv keeps every product and does not repeat the order total", () => {
  const csv = itemsCsv([
    line(),
    line({
      productName: "Tiny Mystery",
      sku: "tiny",
      productType: "mystery",
      kind: "mystery",
      unitPkr: 1990,
      mysteryTier: "Tiny Mystery",
      giftMessage: "Happy day",
      color: "Blush",
    }),
  ]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  const rows = csv.replace(/^\uFEFF/, "").trim().split("\r\n");
  assert.equal(rows.length, 3);
  assert.match(rows[0], /Order reference/);
  assert.match(rows[1], /"Kinza, Fatima"/);
  assert.match(rows[1], /"House 4\nStreet 9"/);
  assert.match(rows[1], /"Said ""gift wrap"""/);
  assert.match(rows[1], /5250,"Yes"/);
  assert.match(rows[2], /Tiny Mystery/);
  assert.doesNotMatch(rows[2], /5250/);
  assert.match(rows[2], /"No"/);
  assert.match(rows[2], /Happy day/);
});

test("summary csv has one revenue total per order", () => {
  const csv = summaryCsv([line(), line({ productName: "Tiny Mystery", productType: "mystery", mysteryTier: "Tiny Mystery" })]);
  const rows = csv.replace(/^\uFEFF/, "").trim().split("\r\n");
  assert.equal(rows.length, 2);
  assert.equal(rows[1].split(",5250,").length, 2);
});

test("filters keep matching orders only", () => {
  const lines = [
    line({ paymentStatus: "verifying", createdDay: "2026-10-20" }),
    line({ orderId: "AZ-OTHER", paymentStatus: "paid", createdDay: "2026-10-21", customerName: "Amina" }),
  ];
  const filtered = filterLines(lines, { q: "", payment: "paid", fulfillment: "", kind: "", from: "2026-10-21", to: "2026-10-21" });
  assert.deepEqual(filtered.map((item) => item.orderId), ["AZ-OTHER"]);
});

test("custom options become export columns", () => {
  const fields = fieldsFromItem({
    kind: "custom",
    name: "Custom Shoulder bag",
    productId: null,
    tierId: null,
    qty: 1,
    unitPkr: 8000,
    options: {
      typeId: "shoulder-bag",
      pattern: "Flowers",
      material: "Cotton",
      colors: [{ name: "Blush" }, { name: "Ivory" }],
      size: "Mini",
      extras: ["Bow"],
      brief: "Baby-pink bag with daisies",
      aiNotes: "Cream strap",
      customizationPkr: 800,
      giftNote: "",
    },
  });
  assert.equal(fields.productType, "custom");
  assert.equal(fields.sku, "shoulder-bag");
  assert.equal(fields.color, "Blush, Ivory");
  assert.equal(fields.size, "Mini");
  assert.match(fields.designNotes, /Baby-pink/);
  assert.equal(fields.customizationPkr, 800);
});

test("product type filter keeps every item from a mixed order", () => {
  const lines = [
    line({ kind: "mixed", itemKind: "ready", productType: "ready-made" }),
    line({
      kind: "mixed",
      itemKind: "mystery",
      productName: "Tiny Mystery",
      productType: "mystery",
      mysteryTier: "Tiny Mystery",
    }),
    line({ orderId: "AZ-PLAIN", kind: "ready", itemKind: "ready", productType: "ready-made" }),
  ];
  const filtered = filterLines(lines, { q: "", payment: "", fulfillment: "", kind: "mystery", from: "", to: "" });
  assert.deepEqual(filtered.map((item) => item.productName), ["Daisy Phone Pouch", "Tiny Mystery"]);
});

test("production status is not started before payment", () => {
  assert.equal(productionStatus("awaiting_payment"), "Not started");
  assert.equal(productionStatus("in_production"), "In production");
});
