export type PayMethod = "bank" | "easypaisa" | "jazzcash" | "cod";

export type ShipLine = {
  kind: "ready" | "custom" | "mystery" | "quote";
  linePkr: number;
  qualifiesMysteryFree: boolean;
};

export function shippingFor(args: {
  method: PayMethod;
  shippingPkr: number;
  freeOver: number;
  subtotal: number;
  mysteryFreeEnabled: boolean;
  lines: ShipLine[];
}): { shippingPkr: number; shippingDiscountPkr: number; note: string } {
  const base = Math.max(0, Math.round(args.shippingPkr));
  const mystery = args.lines.filter((l) => l.kind === "mystery");
  const others = args.lines.filter((l) => l.kind !== "mystery");
  const prepaid = args.method !== "cod";
  const allMysteryQualify =
    mystery.length > 0 &&
    mystery.every((l) => l.qualifiesMysteryFree) &&
    args.mysteryFreeEnabled &&
    prepaid;

  if (allMysteryQualify && others.length === 0) {
    return {
      shippingPkr: 0,
      shippingDiscountPkr: base,
      note: "Free delivery with prepaid mystery gifts.",
    };
  }

  let shipping = base;
  let note = "Standard delivery across Pakistan.";
  if (args.freeOver > 0 && args.subtotal >= args.freeOver) {
    shipping = 0;
    note = "Delivery is free on this order total.";
  } else if (allMysteryQualify && others.length > 0) {
    note =
      "Mystery gifts travel free. Delivery is charged once for the other pieces in this parcel.";
  } else if (mystery.length > 0 && !allMysteryQualify) {
    note = prepaid
      ? "This mystery tier does not include free delivery."
      : "Free mystery delivery applies only when the gift is paid in advance.";
  }

  return { shippingPkr: shipping, shippingDiscountPkr: shipping === 0 && allMysteryQualify ? base : 0, note };
}

export function couponDiscount(args: {
  kind: "percent" | "fixed";
  amount: number;
  minSubtotal: number;
  appliesTo: "catalog" | "custom" | "all";
  catalogPkr: number;
  customPkr: number;
  subtotal: number;
}): { discountPkr: number; reason: string | null } {
  const eligible =
    args.appliesTo === "all"
      ? args.subtotal
      : args.appliesTo === "catalog"
        ? args.catalogPkr
        : args.customPkr;
  if (eligible <= 0) return { discountPkr: 0, reason: "This code does not apply to these pieces." };
  if (eligible < args.minSubtotal) {
    return { discountPkr: 0, reason: `Add a little more — this code starts at the minimum for eligible pieces.` };
  }
  const raw =
    args.kind === "percent"
      ? Math.round((eligible * args.amount) / 100)
      : Math.round(args.amount);
  return { discountPkr: Math.max(0, Math.min(raw, eligible)), reason: null };
}
