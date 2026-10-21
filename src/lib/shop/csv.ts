export type OrderFilter = {
  q: string;
  payment: string;
  fulfillment: string;
  kind: string;
  from: string;
  to: string;
};

export type ExportLine = {
  orderId: string;
  createdAt: string;
  createdDay: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  city: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentReference: string;
  fulfillmentStatus: string;
  shippingMethod: string;
  tracking: string;
  adminNotes: string;
  discountPkr: number;
  deliveryPkr: number;
  subtotalPkr: number;
  totalPkr: number;
  kind: string;
  productName: string;
  sku: string;
  productType: string;
  qty: number;
  color: string;
  size: string;
  customization: string;
  designNotes: string;
  unitPkr: number;
  customizationPkr: number;
  mysteryTier: string;
  giftMessage: string;
  privateNote: string;
  itemKind: string;
};

const ITEM_HEADERS = [
  "Order ID",
  "Order reference",
  "Order date and time",
  "Customer name",
  "Customer phone number",
  "Customer email",
  "Delivery address",
  "City",
  "Product name",
  "Product SKU or product ID",
  "Product type",
  "Quantity",
  "Selected color",
  "Selected size",
  "Customization details",
  "AI design description or custom order notes",
  "Unit price PKR",
  "Customization charges PKR",
  "Discount PKR",
  "Delivery fee PKR",
  "Final order total PKR",
  "Include in revenue total (Yes = first item only)",
  "Payment method",
  "Payment status",
  "Payment transaction reference",
  "Order status",
  "Production status",
  "Shipping method",
  "Tracking number",
  "Mystery Gift tier",
  "Gift message",
  "Admin notes",
  "Private fulfillment note",
];

const SUMMARY_HEADERS = [
  "Order ID",
  "Order reference",
  "Order date and time",
  "Customer name",
  "Customer phone number",
  "Customer email",
  "Delivery address",
  "City",
  "Items",
  "Product types",
  "Quantity",
  "Subtotal PKR",
  "Discount PKR",
  "Delivery fee PKR",
  "Final order total PKR",
  "Payment method",
  "Payment status",
  "Payment transaction reference",
  "Order status",
  "Production status",
  "Shipping method",
  "Tracking number",
  "Mystery Gift tier",
  "Gift message",
  "Admin notes",
];

export function productionStatus(fulfillment: string): string {
  if (fulfillment === "in_production") return "In production";
  if (fulfillment === "quality_check") return "Quality check";
  if (fulfillment === "ready_to_ship") return "Ready to ship";
  if (fulfillment === "shipped" || fulfillment === "delivered") return "Complete";
  if (fulfillment === "cancelled") return "Cancelled";
  return "Not started";
}

export function orderStatusLabel(fulfillment: string, payment: string): string {
  if (fulfillment === "cancelled") return "Cancelled";
  if (payment === "verifying") return "Awaiting payment verification";
  if (payment === "awaiting") return "Awaiting payment";
  if (payment === "rejected") return "Payment not confirmed";
  if (payment === "refund_requested") return "Refund requested";
  if (payment === "refunded") return "Refunded";
  if (payment === "paid" && fulfillment === "awaiting_payment") return "Paid";
  return fulfillment.replaceAll("_", " ");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function fieldsFromItem(item: {
  kind: string;
  name: string;
  productId?: string | null;
  tierId?: string | null;
  options: unknown;
  qty: number;
  unitPkr: number;
  secretName?: string;
  secretNote?: string;
}): Pick<
  ExportLine,
  | "productName"
  | "sku"
  | "productType"
  | "qty"
  | "color"
  | "size"
  | "customization"
  | "designNotes"
  | "unitPkr"
  | "customizationPkr"
  | "mysteryTier"
  | "giftMessage"
  | "privateNote"
  | "kind"
> {
  const options = asRecord(item.options);
  const colorNames = Array.isArray(options.colors)
    ? options.colors
        .map((color) => (color && typeof color === "object" && "name" in color ? String((color as { name: unknown }).name) : ""))
        .filter(Boolean)
    : [];
  const color =
    (typeof options.color === "string" && options.color) ||
    colorNames.join(", ") ||
    (typeof options.colorFamily === "string" ? options.colorFamily : "");
  const size = typeof options.size === "string" ? options.size : "";
  const extras = Array.isArray(options.extras) ? options.extras.map((extra) => String(extra)).filter(Boolean) : [];
  const customization = [
    typeof options.pattern === "string" ? options.pattern : "",
    typeof options.material === "string" ? options.material : "",
    extras.join(", "),
    typeof options.personalization === "string" && options.personalization ? `Personalization: ${options.personalization}` : "",
    typeof options.measurements === "string" && options.measurements ? `Measurements: ${options.measurements}` : "",
    typeof options.preferences === "string" && options.preferences ? `Preferences: ${options.preferences}` : "",
    typeof options.recipient === "string" && options.recipient ? `For: ${options.recipient}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const designNotes = [
    typeof options.brief === "string" ? options.brief : "",
    typeof options.aiNotes === "string" ? options.aiNotes : "",
    typeof options.description === "string" ? options.description : "",
  ]
    .filter((part) => part.trim())
    .join("\n");
  const productType =
    item.kind === "ready" ? "ready-made" : item.kind === "custom" || item.kind === "quote" ? "custom" : item.kind === "mystery" ? "mystery" : item.kind;
  return {
    kind: item.kind,
    productName: item.name,
    sku: item.productId || item.tierId || (typeof options.typeId === "string" ? options.typeId : ""),
    productType,
    qty: item.qty,
    color,
    size,
    customization,
    designNotes,
    unitPkr: item.unitPkr,
    customizationPkr: Number(options.customizationPkr) || 0,
    mysteryTier: item.kind === "mystery" ? item.name : "",
    giftMessage: typeof options.giftNote === "string" ? options.giftNote : "",
    privateNote: [item.secretName, item.secretNote].filter((part) => part && part.trim()).join(" — "),
  };
}

function phonesMatch(left: string, right: string): boolean {
  const compact = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.length > 10 ? digits.slice(-10) : digits;
  };
  const a = compact(left);
  const b = compact(right);
  return a.length >= 7 && a === b;
}

export function orderMatches(
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    kind: string;
    createdDay: string;
  },
  filter: OrderFilter,
): boolean {
  if (filter.payment && order.paymentStatus !== filter.payment) return false;
  if (filter.fulfillment && order.fulfillmentStatus !== filter.fulfillment) return false;
  if (filter.kind && order.kind !== filter.kind) return false;
  if (filter.from && order.createdDay < filter.from) return false;
  if (filter.to && order.createdDay > filter.to) return false;
  const q = filter.q.trim().toLowerCase();
  if (!q) return true;
  if (phonesMatch(q, order.customerPhone) || normalizeLoose(q, order.customerPhone)) return true;
  const blob = `${order.id} ${order.customerName} ${order.customerEmail} ${order.customerPhone}`.toLowerCase();
  return blob.includes(q);
}

function normalizeLoose(query: string, phone: string): boolean {
  const digits = query.replace(/\D/g, "");
  if (digits.length < 4) return false;
  return phone.replace(/\D/g, "").includes(digits);
}

function csvCell(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.round(value));
  if (value == null || value === "") return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const body = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return `\uFEFF${body}\r\n`;
}

export function exportFilename(kind: "orders" | "items", date = new Date()): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return kind === "orders" ? `aznik-crochets-orders-${day}.csv` : `aznik-crochets-order-items-${day}.csv`;
}

function grouped(lines: ExportLine[]): ExportLine[][] {
  const groups: ExportLine[][] = [];
  const index = new Map<string, ExportLine[]>();
  for (const line of lines) {
    const existing = index.get(line.orderId);
    if (existing) existing.push(line);
    else {
      const group = [line];
      index.set(line.orderId, group);
      groups.push(group);
    }
  }
  return groups;
}

export function itemsCsv(lines: ExportLine[]): string {
  const rows: unknown[][] = [];
  for (const group of grouped(lines)) {
    group.forEach((line, index) => {
      const first = index === 0;
      rows.push([
        line.orderId,
        line.orderId,
        line.createdAt,
        line.customerName,
        line.customerPhone,
        line.customerEmail,
        line.address,
        line.city,
        line.productName,
        line.sku,
        line.productType,
        line.qty,
        line.color,
        line.size,
        line.customization,
        line.designNotes,
        line.unitPkr,
        line.customizationPkr,
        first ? line.discountPkr : "",
        first ? line.deliveryPkr : "",
        first ? line.totalPkr : "",
        first ? "Yes" : "No",
        line.paymentMethod,
        line.paymentStatus,
        line.paymentReference,
        orderStatusLabel(line.fulfillmentStatus, line.paymentStatus),
        productionStatus(line.fulfillmentStatus),
        line.shippingMethod,
        line.tracking,
        line.mysteryTier,
        line.giftMessage,
        line.adminNotes,
        line.privateNote,
      ]);
    });
  }
  return toCsv(ITEM_HEADERS, rows);
}

export function summaryCsv(lines: ExportLine[]): string {
  const rows = grouped(lines).map((group) => {
    const line = group[0];
    const tiers = [...new Set(group.map((item) => item.mysteryTier).filter(Boolean))].join("; ");
    const gifts = [...new Set(group.map((item) => item.giftMessage).filter(Boolean))].join(" | ");
    return [
      line.orderId,
      line.orderId,
      line.createdAt,
      line.customerName,
      line.customerPhone,
      line.customerEmail,
      line.address,
      line.city,
      group.map((item) => `${item.productName} x${item.qty}`).join(" | "),
      [...new Set(group.map((item) => item.productType))].join(", "),
      group.reduce((sum, item) => sum + item.qty, 0),
      line.subtotalPkr,
      line.discountPkr,
      line.deliveryPkr,
      line.totalPkr,
      line.paymentMethod,
      line.paymentStatus,
      line.paymentReference,
      orderStatusLabel(line.fulfillmentStatus, line.paymentStatus),
      productionStatus(line.fulfillmentStatus),
      line.shippingMethod,
      line.tracking,
      tiers,
      gifts,
      line.adminNotes,
    ];
  });
  return toCsv(SUMMARY_HEADERS, rows);
}

export function filterLines(lines: ExportLine[], filter: OrderFilter): ExportLine[] {
  const allowed = new Set(
    grouped(lines)
      .filter((group) => {
        const line = group[0];
        if (!line) return false;
        if (!matchesProductType(group, filter.kind)) return false;
        return orderMatches(
          {
            id: line.orderId,
            customerName: line.customerName,
            customerPhone: line.customerPhone,
            customerEmail: line.customerEmail,
            paymentStatus: line.paymentStatus,
            fulfillmentStatus: line.fulfillmentStatus,
            kind: "",
            createdDay: line.createdDay,
          },
          { ...filter, kind: "" },
        );
      })
      .map((group) => group[0].orderId),
  );
  return lines.filter((line) => allowed.has(line.orderId));
}

function matchesProductType(group: ExportLine[], kind: string): boolean {
  if (!kind) return true;
  if (kind === "mixed") return group[0]?.kind === "mixed";
  return group.some((line) => line.kind === kind || line.itemKind === kind);
}
