export function pkr(value: number | string | null | undefined): string {
  const n = Math.round(Number(value) || 0);
  const formatted = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);
  return `Rs. ${formatted}`;
}

export function paymentLabel(status: string): string {
  switch (status) {
    case "awaiting":
      return "Awaiting Payment";
    case "verifying":
      return "Payment Under Verification";
    case "paid":
      return "Paid";
    case "rejected":
      return "Payment not confirmed";
    case "refund_requested":
      return "Refund Requested";
    case "refunded":
      return "Refunded";
    default:
      return status;
  }
}

export function fulfillmentLabel(status: string): string {
  switch (status) {
    case "awaiting_payment":
      return "Awaiting Payment";
    case "confirmed":
      return "Confirmed";
    case "in_production":
      return "In Production";
    case "quality_check":
      return "Quality Check";
    case "ready_to_ship":
      return "Ready to Ship";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function customerStatus(order: {
  paymentStatus: string;
  fulfillmentStatus: string;
}): string {
  if (order.fulfillmentStatus === "cancelled") return "Cancelled";
  if (order.paymentStatus === "refund_requested") return "Refund Requested";
  if (order.paymentStatus === "refunded") return "Refunded";
  if (order.paymentStatus === "rejected") return "Payment needs a new proof";
  if (order.paymentStatus === "awaiting") return "Awaiting Payment";
  if (order.paymentStatus === "verifying") return "Payment Under Verification";
  if (order.fulfillmentStatus === "awaiting_payment") return "Paid";
  return fulfillmentLabel(order.fulfillmentStatus);
}

export const FULFILLMENT_OPTIONS = [
  "awaiting_payment",
  "confirmed",
  "in_production",
  "quality_check",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export function describePiece(kind: string, options: unknown): string {
  if (!options || typeof options !== "object") return "";
  const row = options as Record<string, unknown>;
  if (kind === "quote" && typeof row.description === "string") return row.description;
  const bits: string[] = [];
  if (typeof row.pattern === "string" && row.pattern) bits.push(row.pattern);
  if (typeof row.color === "string" && row.color) bits.push(row.color);
  if (Array.isArray(row.colors)) {
    const names = row.colors
      .map((color) => (color && typeof color === "object" && "name" in color ? String((color as { name: unknown }).name) : ""))
      .filter(Boolean);
    if (names.length) bits.push(names.join(", "));
  }
  if (typeof row.size === "string" && row.size) bits.push(row.size);
  if (Array.isArray(row.extras)) {
    const extras = row.extras.map((extra) => String(extra)).filter(Boolean);
    if (extras.length) bits.push(extras.join(", "));
  }
  if (typeof row.personalization === "string" && row.personalization.trim()) bits.push(`Stitched “${row.personalization.trim()}”`);
  if (typeof row.measurements === "string" && row.measurements.trim()) bits.push(row.measurements.trim());
  if (kind === "mystery") {
    if (typeof row.colorFamily === "string") bits.push(row.colorFamily);
    if (typeof row.style === "string") bits.push(row.style);
  }
  return bits.join(" · ");
}
