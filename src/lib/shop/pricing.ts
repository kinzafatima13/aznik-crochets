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
  if (args.method !== "cod") {
    return {
      shippingPkr: 0,
      shippingDiscountPkr: base,
      note: "Free delivery because this order is paid in advance.",
    };
  }
  return {
    shippingPkr: base,
    shippingDiscountPkr: 0,
    note: "Cash on delivery includes the courier charge. Custom pieces must be paid first.",
  };
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
