export type PayMethod = "bank" | "easypaisa" | "jazzcash" | "cod";

export type ReadyInput = {
  kind: "ready";
  productId: string;
  qty: number;
  color: string;
  size: string;
};

export type CustomDesign = {
  typeId: string;
  patternId: string;
  colorIds: string[];
  size: string;
  extraIds: string[];
  personalization: string;
  measurements: string;
  qty: number;
  brief: string;
  aiNotes: string;
  conceptImage: string;
  material: string;
};

export type CustomInput = { kind: "custom"; design: CustomDesign };

export type MysteryInput = {
  kind: "mystery";
  tierId: string;
  colorFamily: string;
  style: string;
  recipient: string;
  preferences: string;
  giftNote: string;
  qty: number;
};

export type LineInput = ReadyInput | CustomInput | MysteryInput;

export type BagLine = {
  key: string;
  input: LineInput;
  title: string;
  detail: string;
  image: string;
};

export type QuoteLine = {
  title: string;
  detail: string;
  image: string | null;
  qty: number;
  unitPkr: number;
  linePkr: number;
  kind: string;
  mystery: boolean;
};

export type Quote = {
  lines: QuoteLine[];
  subtotalPkr: number;
  discountPkr: number;
  couponCode: string | null;
  couponNote: string | null;
  shippingPkr: number;
  shippingDiscountPkr: number;
  shippingNote: string;
  totalPkr: number;
  productionDays: number;
  codAllowed: boolean;
  requiresPrepay: boolean;
  freeMysteryDelivery: boolean;
};

export function lineQty(input: LineInput): number {
  return input.kind === "custom" ? input.design.qty : input.qty;
}

export type AddressInput = {
  name: string;
  phone: string;
  line1: string;
  city: string;
  notes: string;
  save: boolean;
};
