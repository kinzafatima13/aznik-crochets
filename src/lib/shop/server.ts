import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { optionalAuthMiddleware } from "@/lib/auth/optional";
import { newAccessToken, phonesMatch } from "@/lib/shop/access";
import { exportFilename, fieldsFromItem, filterLines, itemsCsv, orderMatches, summaryCsv, type ExportLine, type OrderFilter } from "@/lib/shop/csv";
import { isAllowedImage } from "@/lib/shop/images";
import { isShopOwner } from "@/lib/shop/owner";
import { couponDiscount, shippingFor, type PayMethod } from "@/lib/shop/pricing";
import type { LineInput, Quote } from "@/lib/shop/types";

async function db() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

type Sql = Awaited<ReturnType<typeof db>>;

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function flag(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function nid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function orderNumber(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = "AZ-";
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return code;
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Please check that form.");
  return result.data;
}

function assertImage(value: string) {
  if (!isAllowedImage(value)) throw new Error("Upload a smaller JPG, PNG, or WebP.");
}

async function notify(
  sql: Sql,
  row: { userId?: string | null; audience: "customer" | "admin"; kind: string; title: string; body: string; orderId?: string | null },
) {
  await sql`insert into notifications (id, user_id, audience, kind, title, body, order_id) values (
    ${nid("nt")}, ${row.userId ?? null}, ${row.audience}, ${row.kind}, ${row.title}, ${row.body}, ${row.orderId ?? null}
  )`;
}

async function assertAdmin(sql: Sql, userId: string) {
  const rows = await sql<{ email: string }>`select email from "user" where id = ${userId} limit 1`;
  if (!isShopOwner(rows[0]?.email)) throw new Error("Only the shop owner can open that.");
}

type Settings = {
  shipping_pkr: number;
  free_shipping_over_pkr: number;
  mystery_free_delivery: boolean;
  cod_ready_made: boolean;
  custom_full_prepay: boolean;
  payments_configured: boolean;
  bank_instructions: string;
  easypaisa_instructions: string;
  jazzcash_instructions: string;
  announcement: string;
  tagline: string;
  store_name: string;
  contact_email: string;
  contact_phone: string;
  instagram: string;
  city: string;
  story: string;
  return_policy: string;
  faqs: unknown;
  hero_image: string;
};

async function loadSettings(sql: Sql): Promise<Settings> {
  const rows = await sql<Settings>`select * from shop_settings where id = 1`;
  const row = rows[0];
  if (!row) throw new Error("The shop settings are missing.");
  return row;
}

function publicSettings(row: Settings) {
  return {
    storeName: row.store_name,
    tagline: row.tagline,
    announcement: row.announcement,
    email: row.contact_email,
    phone: row.contact_phone,
    instagram: row.instagram,
    city: row.city,
    story: row.story,
    policy: row.return_policy,
    faqs: asArray<{ q: string; a: string }>(row.faqs),
    heroImage: row.hero_image,
    shippingPkr: num(row.shipping_pkr),
    freeOverPkr: num(row.free_shipping_over_pkr),
    mysteryFreeDelivery: flag(row.mystery_free_delivery),
    codReadyMade: flag(row.cod_ready_made),
    paymentsConfigured: flag(row.payments_configured),
  };
}

type ProductRow = {
  id: string;
  name: string;
  description: string;
  category_id: string;
  collection_id: string;
  price_pkr: number;
  status: string;
  made_to_order: boolean;
  track_stock: boolean;
  stock: number;
  production_days: number;
  care: string;
  shipping_note: string;
  images: unknown;
  colors: unknown;
  sizes: unknown;
  customizable: boolean;
  mystery_eligible: boolean;
  featured: boolean;
  bestseller: boolean;
  is_new: boolean;
  material_cost_pkr: number;
  created_at: string;
  mystery_tier_id?: string | null;
};

function card(row: ProductRow, withCost = false) {
  const images = asArray<string>(row.images);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    collectionId: row.collection_id,
    pricePkr: num(row.price_pkr),
    status: row.status,
    madeToOrder: flag(row.made_to_order),
    trackStock: flag(row.track_stock),
    stock: num(row.stock),
    productionDays: num(row.production_days),
    care: row.care,
    shippingNote: row.shipping_note,
    image: images[0] ?? "/photos/hero.jpg",
    images,
    colors: asArray<{ name: string; hex: string }>(row.colors),
    sizes: asArray<string>(row.sizes),
    customizable: flag(row.customizable),
    mysteryEligible: flag(row.mystery_eligible),
    featured: flag(row.featured),
    bestseller: flag(row.bestseller),
    isNew: flag(row.is_new),
    materialCostPkr: withCost ? num(row.material_cost_pkr) : undefined,
    mysteryTierId: row.mystery_tier_id ? String(row.mystery_tier_id) : "",
  };
}

type TierCard = {
  id: string;
  name: string;
  blurb: string;
  pricePkr: number;
  valueNote: string;
  categories: string[];
  exclusions: string;
  qtyAvailable: number;
  colorFamilies: string[];
  styles: string[];
  freeDelivery: boolean;
  requiresPrepay: boolean;
  active: boolean;
};

function tierCard(tier: {
  id: string;
  name: string;
  blurb: string;
  price_pkr: number;
  value_note: string;
  categories: unknown;
  exclusions: string;
  qty_available: number;
  color_families: unknown;
  styles: unknown;
  free_delivery: boolean;
  requires_prepay: boolean;
  active?: boolean;
}): TierCard {
  return {
    id: tier.id,
    name: tier.name,
    blurb: tier.blurb,
    pricePkr: num(tier.price_pkr),
    valueNote: tier.value_note,
    categories: asArray<string>(tier.categories),
    exclusions: tier.exclusions,
    qtyAvailable: num(tier.qty_available),
    colorFamilies: asArray<string>(tier.color_families),
    styles: asArray<string>(tier.styles),
    freeDelivery: flag(tier.free_delivery),
    requiresPrepay: flag(tier.requires_prepay),
    active: tier.active == null ? true : flag(tier.active),
  };
}

function withMystery<T extends { mysteryTierId: string; name: string; description: string; pricePkr: number; stock: number; trackStock: boolean }>(
  product: T,
  tiers: TierCard[],
  freeEnabled: boolean,
) {
  if (!product.mysteryTierId) return { ...product, mystery: false as const, tier: null };
  const tier = tiers.find((item) => item.id === product.mysteryTierId && item.active);
  if (!tier) return null;
  return {
    ...product,
    name: tier.name,
    description: `${tier.blurb} The exact contents stay a secret until delivery. Possible pieces: ${tier.categories.join(", ")}. ${tier.exclusions} Approximate value: ${tier.valueNote}`,
    pricePkr: tier.pricePkr,
    stock: tier.qtyAvailable,
    trackStock: true,
    image: "/photos/mystery.jpg",
    mystery: true as const,
    tier: { ...tier, offerOn: freeEnabled && tier.freeDelivery && tier.requiresPrepay },
  };
}

const LineSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ready"),
    productId: z.string().min(1).max(80),
    qty: z.number().int().min(1).max(10),
    color: z.string().max(40),
    size: z.string().max(40),
  }),
  z.object({
    kind: z.literal("custom"),
    design: z.object({
      typeId: z.string().min(1).max(80),
      patternId: z.string().min(1).max(80),
      colorIds: z.array(z.string().max(40)).min(1).max(4),
      size: z.string().min(1).max(80),
      extraIds: z.array(z.string().max(40)).max(8),
      personalization: z.string().max(60).optional().default(""),
      measurements: z.string().max(400).optional().default(""),
      qty: z.number().int().min(1).max(5),
      brief: z.string().max(2000).optional().default(""),
      aiNotes: z.string().max(2000).optional().default(""),
      conceptImage: z
        .string()
        .max(2000)
        .optional()
        .default("")
        .refine((value) => value === "" || value.startsWith("https://"), "A concept image must be a link from the design service."),
      material: z.string().max(40).optional().default("Cotton"),
    }),
  }),
  z.object({
    kind: z.literal("mystery"),
    tierId: z.string().min(1).max(80),
    colorFamily: z.string().min(1).max(40),
    style: z.string().min(1).max(40),
    recipient: z.string().max(40),
    preferences: z.string().max(400),
    giftNote: z.string().max(240),
    qty: z.number().int().min(1).max(3),
  }),
]);

const QuoteSchema = z.object({
  lines: z.array(LineSchema).min(1).max(20),
  coupon: z.string().max(40),
  paymentMethod: z.enum(["bank", "easypaisa", "jazzcash", "cod"]),
});

const AddressSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  line1: z.string().trim().min(4).max(160),
  city: z.string().trim().min(2).max(60),
  notes: z.string().max(240),
  save: z.boolean(),
});

type BuiltLine = {
  kind: string;
  productId: string | null;
  tierId: string | null;
  title: string;
  detail: string;
  image: string | null;
  qty: number;
  unitPkr: number;
  linePkr: number;
  options: Record<string, unknown>;
  mystery: boolean;
  qualifiesMysteryFree: boolean;
  trackStock: boolean;
  productionDays: number;
};

async function buildQuote(sql: Sql, input: z.infer<typeof QuoteSchema>): Promise<Quote & { built: BuiltLine[]; catalogPkr: number; customPkr: number }> {
  const settings = await loadSettings(sql);
  const products = await sql<ProductRow>`select * from products where status = 'published'`;
  const byId = new Map(products.map((row) => [row.id, row]));
  const types = await sql<{ id: string; name: string; base_pkr: number; production_days: number; sizes: unknown; active: boolean }>`select * from custom_types where active = true`;
  const patterns = await sql<{ id: string; name: string; extra_pkr: number; active: boolean }>`select * from custom_patterns where active = true`;
  const extras = await sql<{ id: string; name: string; extra_pkr: number; needs_text: boolean; active: boolean }>`select * from custom_extras where active = true`;
  const yarns = await sql<{ id: string; name: string; hex: string; extra_pkr: number; active: boolean }>`select * from yarn_colors where active = true`;
  const tiers = await sql<{
    id: string;
    name: string;
    price_pkr: number;
    active: boolean;
    qty_available: number;
    free_delivery: boolean;
    requires_prepay: boolean;
    color_families: unknown;
    styles: unknown;
    value_note: string;
  }>`select * from mystery_tiers`;

  const built: BuiltLine[] = [];
  for (const line of input.lines) {
    if (line.kind === "ready") {
      const product = byId.get(line.productId);
      if (!product) throw new Error("A piece in your bag is no longer available.");
      if (product.mystery_tier_id) throw new Error("Add mystery gifts from their product page so the contents stay a secret.");
      if (line.color && !asArray<{ name: string }>(product.colors).some((color) => color.name === line.color)) {
        throw new Error(`Choose an available colour for ${product.name}.`);
      }
      if (line.size && !asArray<string>(product.sizes).includes(line.size)) {
        throw new Error(`Choose an available size for ${product.name}.`);
      }
      if (flag(product.track_stock) && num(product.stock) < line.qty) {
        throw new Error(`${product.name} does not have enough in stock.`);
      }
      const unit = num(product.price_pkr);
      built.push({
        kind: "ready",
        productId: product.id,
        tierId: null,
        title: product.name,
        detail: [line.color, line.size].filter(Boolean).join(" · ") || "Ready-made",
        image: asArray<string>(product.images)[0] ?? "/photos/hero.jpg",
        qty: line.qty,
        unitPkr: unit,
        linePkr: unit * line.qty,
        options: { color: line.color, size: line.size, madeToOrder: flag(product.made_to_order) },
        mystery: false,
        qualifiesMysteryFree: false,
        trackStock: flag(product.track_stock),
        productionDays: num(product.production_days),
      });
    } else if (line.kind === "custom") {
      const design = line.design;
      const type = types.find((item) => item.id === design.typeId);
      if (!type) throw new Error("That custom piece is not offered right now.");
      if (num(type.base_pkr) <= 0) throw new Error("This idea needs a personal quotation before it can be ordered.");
      const pattern = patterns.find((item) => item.id === design.patternId);
      if (!pattern) throw new Error("Choose a pattern.");
      const size = asArray<{ label: string; extra: number }>(type.sizes).find((item) => item.label === design.size);
      if (!size) throw new Error("Choose a size that this piece is made in.");
      if (size.label === "Custom measurements" && design.measurements.trim().length < 3) {
        throw new Error("Add measurements for a custom size.");
      }
      const chosenYarn = design.colorIds.map((id) => yarns.find((yarn) => yarn.id === id));
      if (chosenYarn.some((yarn) => !yarn)) throw new Error("One of those yarn colours is unavailable.");
      const chosenExtras = design.extraIds.map((id) => extras.find((extra) => extra.id === id));
      if (chosenExtras.some((extra) => !extra)) throw new Error("One of those extras is unavailable.");
      if (chosenExtras.some((extra) => extra?.needs_text) && design.personalization.trim().length < 1) {
        throw new Error("Add the initials or name you want stitched in.");
      }
      const yarnExtra = chosenYarn.reduce((sum, yarn) => sum + num(yarn?.extra_pkr), 0);
      const extraSum = chosenExtras.reduce((sum, extra) => sum + num(extra?.extra_pkr), 0);
      const customizationPkr = num(pattern.extra_pkr) + num(size.extra) + yarnExtra + extraSum;
      const unit = num(type.base_pkr) + customizationPkr;
      const names = chosenYarn.map((yarn) => yarn?.name).join(", ");
      const conceptImage = design.conceptImage.startsWith("https://") ? design.conceptImage : "";
      built.push({
        kind: "custom",
        productId: null,
        tierId: null,
        title: `Custom ${type.name}`,
        detail: `${pattern.name} · ${names} · ${size.label}${design.material ? ` · ${design.material}` : ""}`,
        image: conceptImage || null,
        qty: design.qty,
        unitPkr: unit,
        linePkr: unit * design.qty,
        options: {
          typeId: type.id,
          typeName: type.name,
          pattern: pattern.name,
          colors: chosenYarn.map((yarn) => ({ name: yarn?.name, hex: yarn?.hex })),
          size: size.label,
          extras: chosenExtras.map((extra) => extra?.name),
          personalization: design.personalization,
          measurements: design.measurements,
          material: design.material,
          brief: design.brief,
          aiNotes: design.aiNotes,
          conceptImage,
          basePkr: num(type.base_pkr),
          customizationPkr,
        },
        mystery: false,
        qualifiesMysteryFree: false,
        trackStock: false,
        productionDays: num(type.production_days) + Math.max(0, design.qty - 1),
      });
    } else {
      const tier = tiers.find((item) => item.id === line.tierId && flag(item.active));
      if (!tier) throw new Error("That mystery tier is closed.");
      if (num(tier.qty_available) < line.qty) throw new Error(`${tier.name} is sold out for now.`);
      const families = asArray<string>(tier.color_families);
      const styles = asArray<string>(tier.styles);
      if (!families.includes(line.colorFamily) || !styles.includes(line.style)) {
        throw new Error("Choose a colour family and style this tier offers.");
      }
      const catalogProduct = products.find((row) => row.mystery_tier_id === tier.id);
      const qualifies = flag(tier.free_delivery) && flag(settings.mystery_free_delivery) && input.paymentMethod !== "cod";
      built.push({
        kind: "mystery",
        productId: catalogProduct?.id ?? null,
        tierId: tier.id,
        title: tier.name,
        detail: `${line.colorFamily} · ${line.style}`,
        image: "/photos/mystery.jpg",
        qty: line.qty,
        unitPkr: num(tier.price_pkr),
        linePkr: num(tier.price_pkr) * line.qty,
        options: {
          tierId: tier.id,
          colorFamily: line.colorFamily,
          style: line.style,
          recipient: line.recipient,
          preferences: line.preferences,
          giftNote: line.giftNote,
          valueNote: tier.value_note,
        },
        mystery: true,
        qualifiesMysteryFree: qualifies,
        trackStock: false,
        productionDays: 7,
      });
    }
  }

  const subtotal = built.reduce((sum, line) => sum + line.linePkr, 0);
  const catalogPkr = built.filter((line) => line.kind === "ready").reduce((sum, line) => sum + line.linePkr, 0);
  const customPkr = built.filter((line) => line.kind === "custom").reduce((sum, line) => sum + line.linePkr, 0);
  let discount = 0;
  let couponCode: string | null = null;
  let couponNote: string | null = null;
  const code = input.coupon.trim().toUpperCase();
  if (code) {
    const coupons = await sql<{
      code: string;
      kind: "percent" | "fixed";
      amount: number;
      min_subtotal: number;
      applies_to: "catalog" | "custom" | "all";
      active: boolean;
      max_uses: number | null;
      uses: number;
    }>`select * from coupons where code = ${code} limit 1`;
    const coupon = coupons[0];
    if (!coupon || !flag(coupon.active)) couponNote = "That code is not active.";
    else if (coupon.max_uses != null && num(coupon.uses) >= num(coupon.max_uses)) couponNote = "That code has been fully used.";
    else {
      const applied = couponDiscount({
        kind: coupon.kind,
        amount: num(coupon.amount),
        minSubtotal: num(coupon.min_subtotal),
        appliesTo: coupon.applies_to,
        catalogPkr,
        customPkr,
        subtotal,
      });
      discount = applied.discountPkr;
      couponNote = applied.reason;
      if (discount > 0) couponCode = coupon.code;
    }
  }

  const ship = shippingFor({
    method: input.paymentMethod,
    shippingPkr: num(settings.shipping_pkr),
    freeOver: num(settings.free_shipping_over_pkr),
    subtotal,
    mysteryFreeEnabled: flag(settings.mystery_free_delivery),
    lines: built.map((line) => ({
      kind: line.kind as "ready" | "custom" | "mystery",
      linePkr: line.linePkr,
      qualifiesMysteryFree: line.qualifiesMysteryFree,
    })),
  });

  const codAllowed = true;
  const requiresPrepay = built.some((line) => line.kind !== "ready" || !line.trackStock || flag((line.options as { madeToOrder?: boolean }).madeToOrder)) || flag(settings.custom_full_prepay) && built.some((line) => line.kind === "custom" || line.kind === "mystery");
  const total = Math.max(0, subtotal - discount + ship.shippingPkr);

  return {
    lines: built.map((line) => ({
      title: line.title,
      detail: line.detail,
      image: line.image,
      qty: line.qty,
      unitPkr: line.unitPkr,
      linePkr: line.linePkr,
      kind: line.kind,
      mystery: line.mystery,
    })),
    subtotalPkr: subtotal,
    discountPkr: discount,
    couponCode,
    couponNote,
    shippingPkr: ship.shippingPkr,
    shippingDiscountPkr: ship.shippingDiscountPkr,
    shippingNote: ship.note,
    totalPkr: total,
    productionDays: built.reduce((max, line) => Math.max(max, line.productionDays), 0),
    codAllowed,
    requiresPrepay: built.some((line) => line.kind === "custom" || line.kind === "mystery" || flag((line.options as { madeToOrder?: boolean }).madeToOrder)),
    freeMysteryDelivery: ship.shippingPkr === 0 && ship.shippingDiscountPkr > 0,
    built,
    catalogPkr,
    customPkr,
  };
}

export const getChrome = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await db();
  const settings = await loadSettings(sql);
  const categories = await sql<{ id: string; name: string; blurb: string; image: string }>`select id, name, blurb, image from categories order by sort`;
  const collections = await sql<{ id: string; name: string; blurb: string; image: string }>`select id, name, blurb, image from collections order by sort`;
  return { settings: publicSettings(settings), categories, collections };
});

export const getHome = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await db();
  const settings = await loadSettings(sql);
  const categories = await sql<{ id: string; name: string; blurb: string; image: string; sort: number }>`select id, name, blurb, image, sort from categories order by sort`;
  const collections = await sql<{ id: string; name: string; blurb: string; image: string }>`select id, name, blurb, image from collections order by sort`;
  const products = await sql<ProductRow>`select * from products where status = 'published' order by created_at desc`;
  const tiers = await sql<{
    id: string;
    name: string;
    blurb: string;
    price_pkr: number;
    value_note: string;
    categories: unknown;
    exclusions: string;
    qty_available: number;
    color_families: unknown;
    styles: unknown;
    free_delivery: boolean;
    requires_prepay: boolean;
  }>`select id, name, blurb, price_pkr, value_note, categories, exclusions, qty_available, color_families, styles, free_delivery, requires_prepay from mystery_tiers where active = true order by sort`;
  const reviews = await sql<{ id: string; rating: number; body: string; author_name: string; created_at: string }>`select id, rating, body, author_name, to_char(created_at, 'DD Mon YYYY') as created_at from reviews order by created_at desc limit 6`;
  return {
    settings: publicSettings(settings),
    categories,
    collections,
    products: products.map((row) => card(row)),
    tiers: tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      blurb: tier.blurb,
      pricePkr: num(tier.price_pkr),
      valueNote: tier.value_note,
      categories: asArray<string>(tier.categories),
      exclusions: tier.exclusions,
      qtyAvailable: num(tier.qty_available),
      colorFamilies: asArray<string>(tier.color_families),
      styles: asArray<string>(tier.styles),
      freeDelivery: flag(tier.free_delivery),
      requiresPrepay: flag(tier.requires_prepay),
    })),
    reviews,
  };
});

const CatalogSchema = z.object({
  q: z.string().max(80).default(""),
  category: z.string().max(40).default(""),
  collection: z.string().max(40).default(""),
  color: z.string().max(40).default(""),
  size: z.string().max(40).default(""),
  min: z.number().int().min(0).max(500000).default(0),
  max: z.number().int().min(0).max(500000).default(0),
  sort: z.enum(["featured", "newest", "price-asc", "price-desc"]).default("featured"),
});

export const getCatalog = createServerFn({ method: "GET" })
  .validator((input: unknown) => parse(CatalogSchema, input ?? {}))
  .handler(async ({ data }) => {
    const sql = await db();
    const settings = await loadSettings(sql);
    const tiers = (await sql<{
      id: string;
      name: string;
      blurb: string;
      price_pkr: number;
      value_note: string;
      categories: unknown;
      exclusions: string;
      qty_available: number;
      color_families: unknown;
      styles: unknown;
      free_delivery: boolean;
      requires_prepay: boolean;
      active: boolean;
    }>`select id, name, blurb, price_pkr, value_note, categories, exclusions, qty_available, color_families, styles, free_delivery, requires_prepay, active from mystery_tiers`).map((tier) => tierCard(tier));
    const products = (await sql<ProductRow>`select * from products where status = 'published'`)
      .map((row) => withMystery(card(row), tiers, flag(settings.mystery_free_delivery)))
      .filter((product) => product !== null);
    let list = products.filter((product) => {
      if (data.category && product.categoryId !== data.category) return false;
      if (data.collection && product.collectionId !== data.collection) return false;
      if (data.q && !`${product.name} ${product.description}`.toLowerCase().includes(data.q.toLowerCase())) return false;
      if (data.color && !product.colors.some((color) => color.name === data.color)) return false;
      if (data.size && !product.sizes.includes(data.size)) return false;
      if (data.min && product.pricePkr < data.min) return false;
      if (data.max && product.pricePkr > data.max) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (data.sort === "price-asc") return a.pricePkr - b.pricePkr;
      if (data.sort === "price-desc") return b.pricePkr - a.pricePkr;
      if (data.sort === "newest") return Number(b.isNew) - Number(a.isNew);
      return Number(b.featured) - Number(a.featured) || Number(b.bestseller) - Number(a.bestseller);
    });
    const colors = [...new Set(products.flatMap((product) => product.colors.map((color) => color.name)))];
    const sizes = [...new Set(products.flatMap((product) => product.sizes))];
    return { products: list, colors, sizes };
  });

export const getProduct = createServerFn({ method: "GET" })
  .validator((input: unknown) => parse(z.object({ id: z.string().min(1).max(80) }), input))
  .handler(async ({ data }) => {
    const sql = await db();
    const rows = await sql<ProductRow>`select * from products where id = ${data.id} and status = 'published' limit 1`;
    const product = rows[0];
    if (!product) return null;
    const settings = await loadSettings(sql);
    const tiers = (await sql<{
      id: string;
      name: string;
      blurb: string;
      price_pkr: number;
      value_note: string;
      categories: unknown;
      exclusions: string;
      qty_available: number;
      color_families: unknown;
      styles: unknown;
      free_delivery: boolean;
      requires_prepay: boolean;
      active: boolean;
    }>`select id, name, blurb, price_pkr, value_note, categories, exclusions, qty_available, color_families, styles, free_delivery, requires_prepay, active from mystery_tiers`).map((tier) => tierCard(tier));
    const shaped = withMystery(card(product), tiers, flag(settings.mystery_free_delivery));
    if (!shaped) return null;
    const related = (await sql<ProductRow>`select * from products where status = 'published' and (category_id = ${product.category_id} or collection_id = ${product.collection_id}) and id <> ${product.id} limit 8`)
      .map((row) => withMystery(card(row), tiers, flag(settings.mystery_free_delivery)))
      .filter((item) => item !== null)
      .slice(0, 4);
    const reviews = await sql<{ rating: number; body: string; author_name: string }>`select rating, body, author_name from reviews where product_id = ${product.id} order by created_at desc limit 4`;
    return { product: shaped, related, reviews, mysteryFreeDelivery: flag(settings.mystery_free_delivery) };
  });

export const getAtelier = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await db();
  const types = await sql<{ id: string; name: string; base_pkr: number; production_days: number; sizes: unknown; sort: number }>`select id, name, base_pkr, production_days, sizes, sort from custom_types where active = true order by sort`;
  const patterns = await sql<{ id: string; name: string; extra_pkr: number }>`select id, name, extra_pkr from custom_patterns where active = true order by sort`;
  const extras = await sql<{ id: string; name: string; extra_pkr: number; needs_text: boolean }>`select id, name, extra_pkr, needs_text from custom_extras where active = true order by sort`;
  const yarns = await sql<{ id: string; name: string; hex: string; extra_pkr: number }>`select id, name, hex, extra_pkr from yarn_colors where active = true order by sort`;
  return {
    types: types.map((type) => ({
      id: type.id,
      name: type.name,
      basePkr: num(type.base_pkr),
      productionDays: num(type.production_days),
      sizes: asArray<{ label: string; extra: number }>(type.sizes),
    })),
    patterns: patterns.map((pattern) => ({ id: pattern.id, name: pattern.name, extraPkr: num(pattern.extra_pkr) })),
    extras: extras.map((extra) => ({ id: extra.id, name: extra.name, extraPkr: num(extra.extra_pkr), needsText: flag(extra.needs_text) })),
    yarns: yarns.map((yarn) => ({ id: yarn.id, name: yarn.name, hex: yarn.hex, extraPkr: num(yarn.extra_pkr) })),
    aiConfigured: Boolean(process.env.XAI_API_KEY?.trim()),
  };
});

export const quoteCart = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(QuoteSchema, input))
  .handler(async ({ data }) => {
    const sql = await db();
    const quote = await buildQuote(sql, data);
    const { built: _built, catalogPkr: _c, customPkr: _u, ...publicQuote } = quote;
    return publicQuote satisfies Quote;
  });

export const getPayInfo = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await db();
  const settings = await loadSettings(sql);
  return {
    paymentsConfigured: flag(settings.payments_configured),
    codReadyMade: flag(settings.cod_ready_made),
    bank: settings.bank_instructions,
    easypaisa: settings.easypaisa_instructions,
    jazzcash: settings.jazzcash_instructions,
    shippingPkr: num(settings.shipping_pkr),
    mysteryFreeDelivery: flag(settings.mystery_free_delivery),
  };
});

const PlaceSchema = QuoteSchema.extend({
  address: AddressSchema,
  email: z
    .string()
    .trim()
    .max(120)
    .refine((value) => value === "" || z.string().email().safeParse(value).success, "Enter a valid email, or leave it blank."),
  requestId: z.string().uuid(),
});

function tokensEqual(given: string, stored: unknown): boolean {
  const expected = typeof stored === "string" ? stored : "";
  if (!given || !expected || given.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < given.length; index += 1) mismatch |= given.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) => parse(PlaceSchema, input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    const userId = context.userId ?? "guest";
    const existing = await sql<{ id: string; access_token: string | null }>`select id, access_token from orders where user_id = ${userId} and request_id = ${data.requestId} limit 1`;
    if (existing[0]) return { orderId: existing[0].id, accessToken: existing[0].access_token ?? "" };
    const quote = await buildQuote(sql, data);
    const taken: Array<{ kind: "stock" | "tier"; id: string; qty: number }> = [];
    let orderId = "";
    let couponUsed: string | null = null;
    try {
      for (const line of quote.built) {
        if (line.trackStock && line.productId) {
          const updated = await sql<{ id: string }>`update products set stock = stock - ${line.qty} where id = ${line.productId} and track_stock = true and stock >= ${line.qty} returning id`;
          if (!updated.length) throw new Error(`${line.title} just sold out. Refresh your bag.`);
          taken.push({ kind: "stock", id: line.productId, qty: line.qty });
        }
        if (line.tierId) {
          const updated = await sql<{ id: string }>`update mystery_tiers set qty_available = qty_available - ${line.qty} where id = ${line.tierId} and qty_available >= ${line.qty} returning id`;
          if (!updated.length) throw new Error(`${line.title} just sold out.`);
          taken.push({ kind: "tier", id: line.tierId, qty: line.qty });
        }
      }
      if (quote.couponCode) {
        const used = await sql<{ code: string }>`update coupons set uses = uses + 1 where code = ${quote.couponCode} and active = true and (max_uses is null or uses < max_uses) returning code`;
        if (!used.length) throw new Error("That code can no longer be used.");
        couponUsed = quote.couponCode;
      }
      orderId = orderNumber();
      const accessToken = newAccessToken();
      const kinds = new Set(quote.built.map((line) => line.kind));
      const kind = kinds.size === 1 ? [...kinds][0] : "mixed";
      const cod = data.paymentMethod === "cod";
      await sql`insert into orders (
        id, user_id, request_id, kind, payment_status, fulfillment_status, payment_method, pay_on_delivery,
        subtotal_pkr, discount_pkr, shipping_pkr, shipping_discount_pkr, total_pkr, coupon_code, shipping_note,
        customer_name, customer_phone, customer_email, address_line, address_city, address_notes, production_days, breakdown, access_token
      ) values (
        ${orderId}, ${userId}, ${data.requestId}, ${kind}, ${cod ? "awaiting" : "awaiting"}, ${cod ? "confirmed" : "awaiting_payment"},
        ${data.paymentMethod}, ${cod}, ${quote.subtotalPkr}, ${quote.discountPkr}, ${quote.shippingPkr}, ${quote.shippingDiscountPkr},
        ${quote.totalPkr}, ${quote.couponCode}, ${quote.shippingNote}, ${data.address.name}, ${data.address.phone}, ${data.email},
        ${data.address.line1}, ${data.address.city}, ${data.address.notes}, ${quote.productionDays}, ${JSON.stringify({ lines: quote.lines })}::jsonb,
        ${accessToken}
      )`;
      for (const line of quote.built) {
        await sql`insert into order_items (
          id, order_id, kind, product_id, tier_id, name_public, image, unit_pkr, qty, line_pkr, options
        ) values (
          ${nid("oi")}, ${orderId}, ${line.kind}, ${line.productId}, ${line.tierId}, ${line.title}, ${line.image},
          ${line.unitPkr}, ${line.qty}, ${line.linePkr}, ${JSON.stringify(line.options)}::jsonb
        )`;
      }
      if (data.address.save && context.userId) {
        await sql`insert into addresses (id, user_id, name, phone, line1, city, notes, is_default) values (
          ${nid("ad")}, ${context.userId}, ${data.address.name}, ${data.address.phone}, ${data.address.line1}, ${data.address.city}, ${data.address.notes}, true
        )`;
      }
      await notify(sql, {
        userId: context.userId,
        audience: "customer",
        kind: "order",
        title: "Your order is with Aznik",
        body: cod
          ? `${orderId} is confirmed for cash on delivery. Total ${quote.totalPkr} PKR.`
          : `${orderId} is awaiting payment. Nothing is made until the payment is verified. Total ${quote.totalPkr} PKR.`,
        orderId,
      });
      await notify(sql, {
        audience: "admin",
        kind: "order",
        title: `New order ${orderId}`,
        body: `${data.address.name} · ${data.paymentMethod} · Rs. ${quote.totalPkr}`,
        orderId,
      });
      if (data.email) {
        const pieces = quote.lines.map((line) => line.title).join(", ") || "your pieces";
        import("@/lib/shop/mail.server")
          .then((mail) =>
            mail.sendOrderEmail({
              to: data.email,
              orderId,
              name: data.address.name,
              pieces,
              totalPkr: quote.totalPkr,
            }),
          )
          .catch(() => undefined);
      }
      return { orderId, accessToken };
    } catch (error) {
      if (orderId) {
        await sql`delete from notifications where order_id = ${orderId}`;
        await sql`delete from order_items where order_id = ${orderId}`;
        await sql`delete from orders where id = ${orderId}`;
      }
      if (couponUsed) {
        await sql`update coupons set uses = greatest(0, uses - 1) where code = ${couponUsed}`;
      }
      for (const item of taken) {
        if (item.kind === "stock") {
          await sql`update products set stock = stock + ${item.qty} where id = ${item.id}`;
        } else {
          await sql`update mystery_tiers set qty_available = qty_available + ${item.qty} where id = ${item.id}`;
        }
      }
      throw error;
    }
  });

export const submitProof = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) =>
    parse(
      z.object({
        orderId: z.string().min(4).max(20),
        image: z.string().min(20).max(500000),
        note: z.string().max(300),
        token: z.string().max(80).optional().default(""),
        phone: z.string().max(20).optional().default(""),
      }),
      input,
    ),
  )
  .handler(async ({ data, context }) => {
    assertImage(data.image);
    const sql = await db();
    const orders = await sql<{ id: string; payment_method: string; payment_status: string; pay_on_delivery: boolean; user_id: string; access_token: string | null; customer_phone: string }>`select id, payment_method, payment_status, pay_on_delivery, user_id, access_token, customer_phone from orders where id = ${data.orderId} limit 1`;
    const order = orders[0];
    const allowed =
      order &&
      ((context.userId && order.user_id === context.userId) ||
        tokensEqual(data.token, order.access_token) ||
        phonesMatch(data.phone, order.customer_phone));
    if (!order || !allowed) throw new Error("That order was not found. Check the reference and the phone number from checkout.");
    if (flag(order.pay_on_delivery)) throw new Error("This order is cash on delivery. No transfer proof is needed yet.");
    if (!["awaiting", "rejected", "verifying"].includes(order.payment_status)) {
      throw new Error("Payment on this order can no longer be updated here.");
    }
    await sql`insert into payment_proofs (id, order_id, user_id, image_data, note, status) values (
      ${nid("pf")}, ${order.id}, ${context.userId ?? "guest"}, ${data.image}, ${data.note}, 'pending'
    )`;
    await sql`update orders set payment_status = 'verifying', payment_reference = case when ${data.note} <> '' then ${data.note} else payment_reference end where id = ${order.id}`;
    await notify(sql, {
      audience: "admin",
      kind: "payment",
      title: `Payment proof for ${order.id}`,
      body: "A customer uploaded a receipt. It is not paid until you verify it.",
      orderId: order.id,
    });
    await notify(sql, {
      userId: order.user_id === "guest" ? null : order.user_id,
      audience: "customer",
      kind: "payment",
      title: "Receipt received",
      body: `${order.id} is under verification. Making it does not start until Aznik confirms the payment.`,
      orderId: order.id,
    });
    return { ok: true };
  });

function shapeOrder(
  order: Record<string, unknown>,
  items: Array<Record<string, unknown>>,
  reveal: boolean,
) {
  return {
    id: String(order.id),
    kind: String(order.kind),
    paymentStatus: String(order.payment_status),
    fulfillmentStatus: String(order.fulfillment_status),
    paymentMethod: String(order.payment_method),
    payOnDelivery: flag(order.pay_on_delivery),
    subtotalPkr: num(order.subtotal_pkr),
    discountPkr: num(order.discount_pkr),
    shippingPkr: num(order.shipping_pkr),
    shippingDiscountPkr: num(order.shipping_discount_pkr),
    totalPkr: num(order.total_pkr),
    couponCode: order.coupon_code ? String(order.coupon_code) : null,
    shippingNote: String(order.shipping_note ?? ""),
    customerName: String(order.customer_name),
    customerPhone: String(order.customer_phone),
    customerEmail: String(order.customer_email),
    addressLine: String(order.address_line),
    addressCity: String(order.address_city),
    addressNotes: String(order.address_notes ?? ""),
    internalNote: String(order.internal_note ?? ""),
    trackingNumber: String(order.tracking_number ?? ""),
    carrier: String(order.carrier ?? ""),
    productionDays: num(order.production_days),
    createdAt: String(order.created_at ?? ""),
    items: items.map((item) => ({
      id: String(item.id),
      kind: String(item.kind),
      title: String(item.name_public),
      image: item.image ? String(item.image) : null,
      qty: num(item.qty),
      unitPkr: num(item.unit_pkr),
      linePkr: num(item.line_pkr),
      options: asArray<never>(null).length ? null : (typeof item.options === "string" ? JSON.parse(item.options) : item.options),
      revealed: reveal ? String(item.secret_name ?? "") : "",
      secretNote: reveal ? String(item.secret_note ?? "") : "",
      materialCostPkr: reveal ? num(item.material_cost_pkr) : 0,
      secretName: reveal ? String(item.secret_name ?? "") : "",
    })),
  };
}

export const myOrder = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) =>
    parse(
      z.object({
        id: z.string().min(4).max(20),
        token: z.string().max(80).optional().default(""),
        phone: z.string().max(20).optional().default(""),
      }),
      input,
    ),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    const orders = await sql<Record<string, unknown>>`select id, user_id, access_token, kind, payment_status, fulfillment_status, payment_method, pay_on_delivery, subtotal_pkr, discount_pkr, shipping_pkr, shipping_discount_pkr, total_pkr, coupon_code, shipping_note, customer_name, customer_phone, customer_email, address_line, address_city, address_notes, tracking_number, carrier, production_days, to_char(created_at, 'DD Mon YYYY, HH24:MI') as created_at from orders where id = ${data.id} limit 1`;
    const order = orders[0];
    if (!order) return null;
    const allowed =
      (context.userId && String(order.user_id) === context.userId) ||
      tokensEqual(data.token, order.access_token) ||
      phonesMatch(data.phone, String(order.customer_phone ?? ""));
    if (!allowed) return null;
    const reveal = order.fulfillment_status === "delivered";
    const items = await sql<Record<string, unknown>>`select id, kind, name_public, image, qty, unit_pkr, line_pkr, options, case when ${reveal} then secret_name else '' end as secret_name, case when ${reveal} then secret_note else '' end as secret_note from order_items where order_id = ${data.id}`;
    const proofs = await sql<{ id: string; status: string; note: string; admin_note: string; created_at: string }>`select id, status, note, admin_note, to_char(created_at, 'DD Mon HH24:MI') as created_at from payment_proofs where order_id = ${data.id} order by created_at desc`;
    const shaped = shapeOrder({ ...order, internal_note: "" }, items, reveal);
    return { ...shaped, proofs, accessToken: String(order.access_token ?? "") };
  });

export const myOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    return sql<{ id: string; kind: string; payment_status: string; fulfillment_status: string; total_pkr: number; created_at: string }>`select id, kind, payment_status, fulfillment_status, total_pkr, to_char(created_at, 'DD Mon YYYY') as created_at from orders where user_id = ${context.userId} order by created_at desc`;
  });

export const myAddresses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    return sql<{ id: string; name: string; phone: string; line1: string; city: string; notes: string }>`select id, name, phone, line1, city, notes from addresses where user_id = ${context.userId} order by is_default desc, created_at desc`;
  });

export const myNotes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    return sql<{ id: string; title: string; body: string; created_at: string; order_id: string | null }>`select id, title, body, order_id, to_char(created_at, 'DD Mon HH24:MI') as created_at from notifications where user_id = ${context.userId} and audience = 'customer' order by created_at desc limit 20`;
  });

export const toggleWish = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parse(z.object({ productId: z.string().min(1).max(80) }), input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    const existing = await sql<{ product_id: string }>`select product_id from wishlists where user_id = ${context.userId} and product_id = ${data.productId}`;
    if (existing.length) {
      await sql`delete from wishlists where user_id = ${context.userId} and product_id = ${data.productId}`;
      return { saved: false };
    }
    await sql`insert into wishlists (user_id, product_id) values (${context.userId}, ${data.productId})`;
    return { saved: true };
  });

export const myWishlist = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const rows = await sql<ProductRow>`select p.* from products p join wishlists w on w.product_id = p.id where w.user_id = ${context.userId} and p.status = 'published' order by w.created_at desc`;
    return rows.map((row) => card(row));
  });

export const wishIds = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const rows = await sql<{ product_id: string }>`select product_id from wishlists where user_id = ${context.userId}`;
    return rows.map((row) => row.product_id);
  });

const InquirySchema = z.object({
  productType: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(2000),
  colors: z.string().max(200),
  measurements: z.string().max(400),
  budgetPkr: z.number().int().min(0).max(500000),
  desiredDate: z.string().max(40),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((value) => value === "" || z.string().email().safeParse(value).success, "Enter a valid email, or leave it blank."),
  referenceImage: z.string().max(500000),
});

export const sendInquiry = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) => parse(InquirySchema, input))
  .handler(async ({ data, context }) => {
    const reference = data.referenceImage.trim();
    const concept = reference.startsWith("https://") && reference.length < 2000 ? reference : "";
    if (reference && !concept) assertImage(reference);
    const sql = await db();
    const id = nid("inq");
    const accessToken = newAccessToken();
    await sql`insert into inquiries (
      id, user_id, product_type, description, colors, measurements, budget_pkr, desired_date, name, phone, email, reference_image, access_token
    ) values (
      ${id}, ${context.userId ?? "guest"}, ${data.productType}, ${data.description}, ${data.colors}, ${data.measurements}, ${data.budgetPkr},
      ${data.desiredDate}, ${data.name}, ${data.phone}, ${data.email}, ${concept || reference}, ${accessToken}
    )`;
    await notify(sql, { audience: "admin", kind: "inquiry", title: "New design request", body: `${data.name} asked about ${data.productType}.`, orderId: null });
    return { id, accessToken };
  });

export const myInquiries = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    return sql<{
      id: string;
      product_type: string;
      description: string;
      status: string;
      quote_pkr: number | null;
      quote_days: number | null;
      quote_note: string;
      order_id: string | null;
      created_at: string;
    }>`select id, product_type, description, status, quote_pkr, quote_days, quote_note, order_id, to_char(created_at, 'DD Mon YYYY') as created_at from inquiries where user_id = ${context.userId} order by created_at desc`;
  });

export const acceptQuote = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) =>
    parse(
      z.object({
        inquiryId: z.string().min(4).max(40),
        token: z.string().max(80).optional().default(""),
        address: AddressSchema,
        email: z
          .string()
          .trim()
          .max(120)
          .refine((value) => value === "" || z.string().email().safeParse(value).success, "Enter a valid email, or leave it blank."),
        paymentMethod: z.enum(["bank", "easypaisa", "jazzcash", "cod"]),
      }),
      input,
    ),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    const rows = await sql<{
      id: string;
      status: string;
      quote_pkr: number | null;
      quote_days: number | null;
      product_type: string;
      description: string;
      reference_image: string;
      user_id: string;
      access_token: string | null;
    }>`select id, status, quote_pkr, quote_days, product_type, description, reference_image, user_id, access_token from inquiries where id = ${data.inquiryId} limit 1`;
    const inquiry = rows[0];
    const allowed = inquiry && ((context.userId && inquiry.user_id === context.userId) || tokensEqual(data.token, inquiry.access_token));
    if (!inquiry || !allowed || inquiry.status !== "quoted" || !inquiry.quote_pkr) throw new Error("There is no open quotation to accept.");
    const settings = await loadSettings(sql);
    const ship = shippingFor({
      method: "cod",
      shippingPkr: num(settings.shipping_pkr),
      freeOver: num(settings.free_shipping_over_pkr),
      subtotal: num(inquiry.quote_pkr),
      mysteryFreeEnabled: false,
      lines: [{ kind: "quote", linePkr: num(inquiry.quote_pkr), qualifiesMysteryFree: false }],
    });
    const orderId = orderNumber();
    const accessToken = newAccessToken();
    const total = num(inquiry.quote_pkr) + ship.shippingPkr;
    const userId = context.userId ?? (inquiry.user_id === "guest" ? "guest" : inquiry.user_id);
    await sql`insert into orders (
      id, user_id, kind, payment_status, fulfillment_status, payment_method, pay_on_delivery,
      subtotal_pkr, discount_pkr, shipping_pkr, shipping_discount_pkr, total_pkr, shipping_note,
      customer_name, customer_phone, customer_email, address_line, address_city, address_notes, production_days, breakdown, access_token
    ) values (
      ${orderId}, ${userId}, 'quote', 'awaiting', 'confirmed', 'cod', true,
      ${num(inquiry.quote_pkr)}, 0, ${ship.shippingPkr}, 0, ${total}, ${ship.note},
      ${data.address.name}, ${data.address.phone}, ${data.email}, ${data.address.line1}, ${data.address.city}, ${data.address.notes},
      ${num(inquiry.quote_days) || 14}, ${JSON.stringify({ inquiryId: inquiry.id })}::jsonb, ${accessToken}
    )`;
    const conceptImage = inquiry.reference_image?.startsWith("https://") ? inquiry.reference_image : "";
    await sql`insert into order_items (id, order_id, kind, name_public, image, unit_pkr, qty, line_pkr, options) values (
      ${nid("oi")}, ${orderId}, 'quote', ${`Custom ${inquiry.product_type}`}, ${conceptImage || null}, ${num(inquiry.quote_pkr)}, 1, ${num(inquiry.quote_pkr)},
      ${JSON.stringify({ description: inquiry.description, quoted: true, brief: inquiry.description, conceptImage, aiNotes: "" })}::jsonb
    )`;
    await sql`update inquiries set status = 'ordered', order_id = ${orderId} where id = ${inquiry.id}`;
    await notify(sql, {
      userId: userId === "guest" ? null : userId,
      audience: "customer",
      kind: "quote",
      title: "Quotation accepted",
      body: `${orderId} is awaiting payment. Work starts only after the payment is verified.`,
      orderId,
    });
    await notify(sql, { audience: "admin", kind: "quote", title: `Quote accepted ${orderId}`, body: inquiry.product_type, orderId });
    return { orderId, accessToken, totalPkr: total, shippingPkr: ship.shippingPkr, shippingNote: ship.note };
  });

export const declineQuote = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) => parse(z.object({ inquiryId: z.string().min(4).max(40), token: z.string().max(80).optional().default("") }), input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    const rows = await sql<{ user_id: string; access_token: string | null; status: string }>`select user_id, access_token, status from inquiries where id = ${data.inquiryId} limit 1`;
    const inquiry = rows[0];
    const allowed = inquiry && inquiry.status === "quoted" && ((context.userId && inquiry.user_id === context.userId) || tokensEqual(data.token, inquiry.access_token));
    if (!allowed) throw new Error("That quotation could not be declined.");
    await sql`update inquiries set status = 'declined' where id = ${data.inquiryId} and status = 'quoted'`;
    return { ok: true };
  });

export const addReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    parse(
      z.object({
        orderId: z.string().min(4).max(20),
        productId: z.string().max(80),
        rating: z.number().int().min(1).max(5),
        body: z.string().trim().min(8).max(600),
      }),
      input,
    ),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    const orders = await sql<{ customer_name: string }>`select customer_name from orders where id = ${data.orderId} and user_id = ${context.userId} and fulfillment_status = 'delivered' limit 1`;
    if (!orders[0]) throw new Error("Reviews open after the order is delivered.");
    const author = orders[0].customer_name.split(" ")[0] || "A friend";
    await sql`insert into reviews (id, user_id, order_id, product_id, rating, body, author_name) values (
      ${nid("rv")}, ${context.userId}, ${data.orderId}, ${data.productId || null}, ${data.rating}, ${data.body}, ${author}
    )`;
    return { ok: true };
  });

export const joinNewsletter = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(z.object({ email: z.string().trim().email().max(120) }), input))
  .handler(async ({ data }) => {
    const sql = await db();
    await sql`insert into newsletter (email) values (${data.email.toLowerCase()}) on conflict (email) do nothing`;
    return { ok: true };
  });

export const adminSession = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const rows = await sql<{ email: string }>`select email from "user" where id = ${context.userId} limit 1`;
    return { isAdmin: isShopOwner(rows[0]?.email), hasOwner: true };
  });

export const claimShop = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const rows = await sql<{ email: string }>`select email from "user" where id = ${context.userId} limit 1`;
    if (!isShopOwner(rows[0]?.email)) throw new Error("This desk already has an owner.");
    return { ok: true };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const [totals] = await sql<{
      gross: number;
      discounts: number;
      delivery: number;
      refunds: number;
      net: number;
      orders: number;
      paid: number;
      pending: number;
      production: number;
      ready: number;
      mystery: number;
    }>`select
      coalesce(sum(case when payment_status = 'paid' then subtotal_pkr else 0 end), 0) as gross,
      coalesce(sum(case when payment_status = 'paid' then discount_pkr else 0 end), 0) as discounts,
      coalesce(sum(case when payment_status = 'paid' then shipping_pkr else 0 end), 0) as delivery,
      coalesce(sum(case when payment_status = 'refunded' then total_pkr else 0 end), 0) as refunds,
      coalesce(sum(case when payment_status = 'paid' then total_pkr else 0 end), 0) as net,
      count(*) as orders,
      count(*) filter (where payment_status = 'paid') as paid,
      count(*) filter (where payment_status in ('awaiting', 'verifying', 'rejected') and fulfillment_status <> 'cancelled') as pending,
      count(*) filter (where fulfillment_status = 'in_production') as production,
      count(*) filter (where fulfillment_status = 'ready_to_ship') as ready,
      count(*) filter (where kind in ('mystery', 'mixed') and payment_status = 'paid') as mystery
    from orders`;
    const inquiries = await sql<{ count: number }>`select count(*) as count from inquiries where status in ('new', 'quoted')`;
    const low = await sql<ProductRow>`select * from products where status = 'published' and track_stock = true and stock <= 3 order by stock asc limit 8`;
    const recent = await sql<{ id: string; customer_name: string; total_pkr: number; payment_status: string; created_at: string }>`select id, customer_name, total_pkr, payment_status, to_char(created_at, 'DD Mon HH24:MI') as created_at from orders order by created_at desc limit 6`;
    const bestsellers = await sql<{ name_public: string; qty: number }>`select name_public, sum(qty) as qty from order_items where kind = 'ready' group by name_public order by sum(qty) desc limit 5`;
    const notes = await sql<{ id: string; title: string; body: string; created_at: string }>`select id, title, body, to_char(created_at, 'DD Mon HH24:MI') as created_at from notifications where audience = 'admin' order by created_at desc limit 8`;
    return {
      gross: num(totals?.gross),
      discounts: num(totals?.discounts),
      delivery: num(totals?.delivery),
      refunds: num(totals?.refunds),
      net: num(totals?.net),
      orders: num(totals?.orders),
      paid: num(totals?.paid),
      pending: num(totals?.pending),
      production: num(totals?.production),
      ready: num(totals?.ready),
      mystery: num(totals?.mystery),
      openInquiries: num(inquiries[0]?.count),
      low: low.map((row) => card(row, true)),
      recent,
      bestsellers,
      notes,
    };
  });

const ProductSchema = z.object({
  id: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/, "Use a short lowercase id, like daisy-clip."),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(2000),
  categoryId: z.string().min(2).max(40),
  collectionId: z.string().min(2).max(40),
  pricePkr: z.number().int().min(100).max(500000),
  status: z.enum(["published", "draft", "archived"]),
  madeToOrder: z.boolean(),
  trackStock: z.boolean(),
  stock: z.number().int().min(0).max(10000),
  productionDays: z.number().int().min(1).max(90),
  care: z.string().max(400),
  shippingNote: z.string().max(400),
  images: z.array(z.string()).max(4),
  colors: z.array(z.object({ name: z.string().min(1).max(40), hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/) })).max(8),
  sizes: z.array(z.string().min(1).max(40)).max(12),
  customizable: z.boolean(),
  mysteryEligible: z.boolean(),
  featured: z.boolean(),
  bestseller: z.boolean(),
  isNew: z.boolean(),
  materialCostPkr: z.number().int().min(0).max(500000),
});

export const adminProducts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const rows = await sql<ProductRow>`select * from products order by created_at desc`;
    return rows.map((row) => card(row, true));
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parse(ProductSchema, input))
  .handler(async ({ data, context }) => {
    for (const image of data.images) assertImage(image);
    const sql = await db();
    await assertAdmin(sql, context.userId);
    await sql`insert into products (
      id, name, description, category_id, collection_id, price_pkr, status, made_to_order, track_stock, stock,
      production_days, care, shipping_note, images, colors, sizes, customizable, mystery_eligible, featured, bestseller, is_new, material_cost_pkr
    ) values (
      ${data.id}, ${data.name}, ${data.description}, ${data.categoryId}, ${data.collectionId}, ${data.pricePkr}, ${data.status},
      ${data.madeToOrder}, ${data.trackStock}, ${data.stock}, ${data.productionDays}, ${data.care}, ${data.shippingNote},
      ${JSON.stringify(data.images)}::jsonb, ${JSON.stringify(data.colors)}::jsonb, ${JSON.stringify(data.sizes)}::jsonb,
      ${data.customizable}, ${data.mysteryEligible}, ${data.featured}, ${data.bestseller}, ${data.isNew}, ${data.materialCostPkr}
    ) on conflict (id) do update set
      name = excluded.name, description = excluded.description, category_id = excluded.category_id, collection_id = excluded.collection_id,
      price_pkr = excluded.price_pkr, status = excluded.status, made_to_order = excluded.made_to_order, track_stock = excluded.track_stock,
      stock = excluded.stock, production_days = excluded.production_days, care = excluded.care, shipping_note = excluded.shipping_note,
      images = excluded.images, colors = excluded.colors, sizes = excluded.sizes, customizable = excluded.customizable,
      mystery_eligible = excluded.mystery_eligible, featured = excluded.featured, bestseller = excluded.bestseller,
      is_new = excluded.is_new, material_cost_pkr = excluded.material_cost_pkr`;
    return { id: data.id };
  });

export const updateStockPrice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    parse(
      z.object({
        id: z.string().trim().min(2).max(80),
        pricePkr: z.number().int().min(100).max(500000),
        stock: z.number().int().min(0).max(10000),
      }),
      input,
    ),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const updated = await sql<{ id: string }>`update products set price_pkr = ${data.pricePkr}, stock = ${data.stock} where id = ${data.id} returning id`;
    if (!updated.length) throw new Error("That piece was not found.");
    return { ok: true };
  });

export const removeProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parse(z.object({ id: z.string().trim().min(2).max(80) }), input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    await sql`delete from wishlists where product_id = ${data.id}`;
    const removed = await sql<{ id: string }>`delete from products where id = ${data.id} returning id`;
    if (!removed.length) throw new Error("That piece was not found.");
    return { ok: true };
  });

const OrderListSchema = z.object({
  q: z.string().max(80).default(""),
  payment: z.string().max(40).default(""),
  fulfillment: z.string().max(40).default(""),
  kind: z.string().max(40).default(""),
  from: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).default(""),
  to: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).default(""),
  sort: z.enum(["newest", "oldest", "value"]).default("newest"),
  status: z.string().max(40).default(""),
});

function listFilter(data: z.infer<typeof OrderListSchema>): OrderFilter {
  return {
    q: data.q,
    payment: data.payment || (data.status && !data.status.includes("_") && data.status !== "in_production" ? data.status : ""),
    fulfillment: data.fulfillment || (data.status?.includes("_") || data.status === "in_production" ? data.status : ""),
    kind: data.kind,
    from: data.from,
    to: data.to,
  };
}

function orderKindMatches(orderKind: string, itemKinds: Set<string> | undefined, wanted: string): boolean {
  if (!wanted) return true;
  if (wanted === "mixed") return orderKind === "mixed";
  return orderKind === wanted || Boolean(itemKinds?.has(wanted));
}

export const adminOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parse(OrderListSchema, input ?? {}))
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const rows = await sql<Record<string, unknown>>`select id, kind, payment_status, fulfillment_status, payment_method, total_pkr, customer_name, customer_phone, customer_email, to_char(created_at at time zone 'Asia/Karachi', 'DD Mon YYYY HH24:MI') as created_at, to_char(created_at at time zone 'Asia/Karachi', 'YYYY-MM-DD') as created_day, to_char(created_at at time zone 'Asia/Karachi', 'YYYY-MM-DD HH24:MI:SS') as created_sort from orders order by created_at desc limit 500`;
    const itemKinds = await sql<{ order_id: string; kind: string }>`select order_id, kind from order_items`;
    const kindsByOrder = new Map<string, Set<string>>();
    for (const item of itemKinds) {
      const set = kindsByOrder.get(item.order_id) ?? new Set<string>();
      set.add(item.kind);
      kindsByOrder.set(item.order_id, set);
    }
    const filter = listFilter(data);
    const mapped = rows
      .map((row) => ({
        id: String(row.id),
        kind: String(row.kind),
        paymentStatus: String(row.payment_status),
        fulfillmentStatus: String(row.fulfillment_status),
        paymentMethod: String(row.payment_method),
        totalPkr: num(row.total_pkr),
        customerName: String(row.customer_name),
        customerPhone: String(row.customer_phone ?? ""),
        customerEmail: String(row.customer_email ?? ""),
        createdAt: String(row.created_at),
        createdDay: String(row.created_day),
        createdSort: String(row.created_sort),
      }))
      .filter((row) => {
        if (!orderKindMatches(row.kind, kindsByOrder.get(row.id), filter.kind)) return false;
        return orderMatches(
          {
            id: row.id,
            customerName: row.customerName,
            customerPhone: row.customerPhone,
            customerEmail: row.customerEmail,
            paymentStatus: row.paymentStatus,
            fulfillmentStatus: row.fulfillmentStatus,
            kind: "",
            createdDay: row.createdDay,
          },
          { ...filter, kind: "" },
        );
      });
    mapped.sort((a, b) => {
      if (data.sort === "value") return b.totalPkr - a.totalPkr;
      if (data.sort === "oldest") return a.createdSort.localeCompare(b.createdSort);
      return b.createdSort.localeCompare(a.createdSort);
    });
    return mapped;
  });

export const adminOrder = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parse(z.object({ id: z.string().min(4).max(20) }), input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const orders = await sql<Record<string, unknown>>`select *, to_char(created_at, 'DD Mon YYYY HH24:MI') as created_label from orders where id = ${data.id} limit 1`;
    const order = orders[0];
    if (!order) return null;
    const items = await sql<Record<string, unknown>>`select * from order_items where order_id = ${data.id}`;
    const proofs = await sql<Record<string, unknown>>`select id, image_data, note, status, admin_note, to_char(created_at, 'DD Mon HH24:MI') as created_at from payment_proofs where order_id = ${data.id} order by created_at desc`;
    const timeline = await sql<{ id: string; title: string; body: string; created_at: string }>`select id, title, body, to_char(created_at, 'DD Mon HH24:MI') as created_at from notifications where order_id = ${data.id} order by created_at`;
    return {
      ...shapeOrder({ ...order, created_at: order.created_label }, items, true),
      paymentReference: String(order.payment_reference ?? ""),
      timeline,
      proofs: proofs.map((proof) => ({
        id: String(proof.id),
        image: String(proof.image_data),
        note: String(proof.note ?? ""),
        status: String(proof.status),
        adminNote: String(proof.admin_note ?? ""),
        createdAt: String(proof.created_at),
      })),
    };
  });

const MAKING = new Set(["confirmed", "in_production", "quality_check", "ready_to_ship", "shipped", "delivered"]);

export const updateOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    parse(
      z.object({
        id: z.string().min(4).max(20),
        fulfillment: z.enum(["awaiting_payment", "confirmed", "in_production", "quality_check", "ready_to_ship", "shipped", "delivered", "cancelled"]),
        tracking: z.string().max(80),
        carrier: z.string().max(40),
        internalNote: z.string().max(800),
        assignments: z.array(z.object({
          itemId: z.string(),
          secretName: z.string().max(120),
          secretNote: z.string().max(400),
          materialCostPkr: z.number().int().min(0).max(500000),
        })).max(20),
      }),
      input,
    ),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const orders = await sql<{
      id: string;
      user_id: string;
      payment_status: string;
      fulfillment_status: string;
      pay_on_delivery: boolean;
      kind: string;
    }>`select id, user_id, payment_status, fulfillment_status, pay_on_delivery, kind from orders where id = ${data.id} limit 1`;
    const order = orders[0];
    if (!order) throw new Error("Order not found.");
    if (MAKING.has(data.fulfillment) && order.payment_status !== "paid" && !flag(order.pay_on_delivery)) {
      throw new Error("Verify payment before this order can be made or shipped. Custom work does not start while payment is pending.");
    }
    if (data.fulfillment === "cancelled" && ["shipped", "delivered"].includes(order.fulfillment_status)) {
      throw new Error("Shipped orders should be refunded rather than silently cancelled.");
    }
    if (data.fulfillment === "cancelled" && order.fulfillment_status !== "cancelled" && !["shipped", "delivered"].includes(order.fulfillment_status)) {
      const items = await sql<{ kind: string; product_id: string | null; tier_id: string | null; qty: number }>`select kind, product_id, tier_id, qty from order_items where order_id = ${order.id}`;
      for (const item of items) {
        if (item.kind === "ready" && item.product_id) {
          await sql`update products set stock = stock + ${num(item.qty)} where id = ${item.product_id} and track_stock = true`;
        }
        if (item.tier_id) {
          await sql`update mystery_tiers set qty_available = qty_available + ${num(item.qty)} where id = ${item.tier_id}`;
        }
      }
    }
    await sql`update orders set fulfillment_status = ${data.fulfillment}, tracking_number = ${data.tracking}, carrier = ${data.carrier}, internal_note = ${data.internalNote} where id = ${order.id}`;
    for (const assignment of data.assignments) {
      await sql`update order_items set secret_name = ${assignment.secretName}, secret_note = ${assignment.secretNote}, material_cost_pkr = ${assignment.materialCostPkr} where id = ${assignment.itemId} and order_id = ${order.id}`;
    }
    if (data.fulfillment !== order.fulfillment_status) {
      const safe =
        order.kind === "mystery" || order.kind === "mixed"
          ? data.fulfillment === "delivered"
            ? "Your little mystery has arrived. Open the order to see what was made for you."
            : "Your mystery gift moved forward. The surprise stays wrapped until delivery."
          : `Order ${order.id} is now ${data.fulfillment.replaceAll("_", " ")}.`;
      await notify(sql, { userId: order.user_id, audience: "customer", kind: "fulfillment", title: "An update from Aznik", body: safe, orderId: order.id });
    }
    return { ok: true };
  });

export const quickFulfillment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    parse(
      z.object({
        id: z.string().min(4).max(20),
        fulfillment: z.enum(["awaiting_payment", "confirmed", "in_production", "quality_check", "ready_to_ship", "shipped", "delivered", "cancelled"]),
      }),
      input,
    ),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const orders = await sql<{
      id: string;
      user_id: string;
      payment_status: string;
      fulfillment_status: string;
      pay_on_delivery: boolean;
      kind: string;
    }>`select id, user_id, payment_status, fulfillment_status, pay_on_delivery, kind from orders where id = ${data.id} limit 1`;
    const order = orders[0];
    if (!order) throw new Error("Order not found.");
    if (MAKING.has(data.fulfillment) && order.payment_status !== "paid" && !flag(order.pay_on_delivery)) {
      throw new Error("Verify payment before this order can be made or shipped. It is not in production while payment is awaiting verification.");
    }
    if (data.fulfillment === "cancelled" && ["shipped", "delivered"].includes(order.fulfillment_status)) {
      throw new Error("Shipped orders should be refunded rather than silently cancelled.");
    }
    if (data.fulfillment === "cancelled" && order.fulfillment_status !== "cancelled" && !["shipped", "delivered"].includes(order.fulfillment_status)) {
      const items = await sql<{ kind: string; product_id: string | null; tier_id: string | null; qty: number }>`select kind, product_id, tier_id, qty from order_items where order_id = ${order.id}`;
      for (const item of items) {
        if (item.kind === "ready" && item.product_id) {
          await sql`update products set stock = stock + ${num(item.qty)} where id = ${item.product_id} and track_stock = true`;
        }
        if (item.tier_id) {
          await sql`update mystery_tiers set qty_available = qty_available + ${num(item.qty)} where id = ${item.tier_id}`;
        }
      }
    }
    await sql`update orders set fulfillment_status = ${data.fulfillment} where id = ${order.id}`;
    return { ok: true, fulfillment: data.fulfillment };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    parse(
      z.object({
        orderId: z.string().min(4).max(20),
        decision: z.enum(["verify", "reject"]),
        note: z.string().max(500),
      }),
      input,
    ),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    if (data.decision === "reject" && data.note.trim().length < 3) throw new Error("Tell the customer why the payment was not confirmed.");
    const orders = await sql<{ id: string; user_id: string; fulfillment_status: string }>`select id, user_id, fulfillment_status from orders where id = ${data.orderId} limit 1`;
    const order = orders[0];
    if (!order) throw new Error("Order not found.");
    if (data.decision === "verify") {
      const nextFulfillment = order.fulfillment_status === "awaiting_payment" ? "confirmed" : order.fulfillment_status;
      await sql`update orders set payment_status = 'paid', paid_at = now(), fulfillment_status = ${nextFulfillment}, payment_reference = case when payment_reference = '' and ${data.note} <> '' then ${data.note} else payment_reference end where id = ${order.id}`;
      await sql`update payment_proofs set status = 'verified', admin_note = ${data.note} where order_id = ${order.id} and status = 'pending'`;
      await notify(sql, {
        userId: order.user_id,
        audience: "customer",
        kind: "payment",
        title: "Payment confirmed",
        body: `${order.id} is paid. Aznik can now make or pack it. This confirmation was recorded by the shop, not by the receipt upload alone.`,
        orderId: order.id,
      });
    } else {
      await sql`update orders set payment_status = 'rejected' where id = ${order.id} and payment_status <> 'paid'`;
      await sql`update payment_proofs set status = 'rejected', admin_note = ${data.note} where order_id = ${order.id} and status = 'pending'`;
      await notify(sql, {
        userId: order.user_id,
        audience: "customer",
        kind: "payment",
        title: "Payment was not confirmed",
        body: data.note,
        orderId: order.id,
      });
    }
    return { ok: true };
  });

export const markRefund = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    parse(z.object({ orderId: z.string(), status: z.enum(["refund_requested", "refunded"]) }), input),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const orders = await sql<{ user_id: string }>`select user_id from orders where id = ${data.orderId} limit 1`;
    if (!orders[0]) throw new Error("Order not found.");
    await sql`update orders set payment_status = ${data.status} where id = ${data.orderId}`;
    await notify(sql, {
      userId: orders[0].user_id,
      audience: "customer",
      kind: "refund",
      title: data.status === "refunded" ? "Refund recorded" : "Refund requested",
      body: `${data.orderId} was updated by the shop. Refunds are handled manually outside the website.`,
      orderId: data.orderId,
    });
    return { ok: true };
  });

export const exportOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    parse(
      OrderListSchema.extend({
        mode: z.enum(["summary", "items"]),
        scope: z.enum(["all", "filtered"]),
      }),
      input ?? {},
    ),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const lines = await collectExportLines(sql);
    const chosen = data.scope === "filtered" ? filterLines(lines, listFilter(data)) : lines;
    const csv = data.mode === "summary" ? summaryCsv(chosen) : itemsCsv(chosen);
    return {
      filename: exportFilename(data.mode === "summary" ? "orders" : "items"),
      csv,
      orders: new Set(chosen.map((line) => line.orderId)).size,
      rows: data.mode === "summary" ? new Set(chosen.map((line) => line.orderId)).size : chosen.length,
    };
  });

async function collectExportLines(sql: Sql): Promise<ExportLine[]> {
  const orders = await sql<Record<string, unknown>>`select id, kind, payment_status, fulfillment_status, payment_method, subtotal_pkr, discount_pkr, shipping_pkr, total_pkr, customer_name, customer_phone, customer_email, address_line, address_city, internal_note, tracking_number, carrier, payment_reference, to_char(created_at at time zone 'Asia/Karachi', 'YYYY-MM-DD HH24:MI') as created_at, to_char(created_at at time zone 'Asia/Karachi', 'YYYY-MM-DD') as created_day from orders order by created_at desc limit 5000`;
  const items = await sql<Record<string, unknown>>`select id, order_id, kind, product_id, tier_id, name_public, unit_pkr, qty, options, secret_name, secret_note from order_items`;
  const proofs = await sql<{ order_id: string; note: string }>`select order_id, note from payment_proofs where note <> '' order by created_at desc`;
  const proofByOrder = new Map<string, string>();
  for (const proof of proofs) if (!proofByOrder.has(proof.order_id)) proofByOrder.set(proof.order_id, proof.note);
  const itemsByOrder = new Map<string, Record<string, unknown>[]>();
  for (const item of items) {
    const id = String(item.order_id);
    const group = itemsByOrder.get(id) ?? [];
    group.push(item);
    itemsByOrder.set(id, group);
  }
  const lines: ExportLine[] = [];
  for (const order of orders) {
    const orderId = String(order.id);
    const group = itemsByOrder.get(orderId) ?? [];
    const shippingMethod =
      num(order.shipping_pkr) === 0 && (order.kind === "mystery" || group.some((item) => item.kind === "mystery"))
        ? "Free mystery delivery"
        : String(order.carrier || "Standard delivery");
    const shared = {
      orderId,
      createdAt: String(order.created_at ?? ""),
      createdDay: String(order.created_day ?? ""),
      customerName: String(order.customer_name ?? ""),
      customerPhone: String(order.customer_phone ?? ""),
      customerEmail: String(order.customer_email ?? ""),
      address: String(order.address_line ?? ""),
      city: String(order.address_city ?? ""),
      paymentMethod: String(order.payment_method ?? ""),
      paymentStatus: String(order.payment_status ?? ""),
      paymentReference: String(order.payment_reference || proofByOrder.get(orderId) || ""),
      fulfillmentStatus: String(order.fulfillment_status ?? ""),
      shippingMethod,
      tracking: String(order.tracking_number ?? ""),
      adminNotes: String(order.internal_note ?? ""),
      discountPkr: num(order.discount_pkr),
      deliveryPkr: num(order.shipping_pkr),
      subtotalPkr: num(order.subtotal_pkr),
      totalPkr: num(order.total_pkr),
      kind: String(order.kind ?? ""),
    };
    const source = group.length
      ? group
      : [{ kind: order.kind, name_public: "(no items recorded)", product_id: "", tier_id: "", qty: 0, unit_pkr: 0, options: {}, secret_name: "", secret_note: "" }];
    for (const item of source) {
      const details = fieldsFromItem({
        kind: String(item.kind ?? ""),
        name: String(item.name_public ?? ""),
        productId: item.product_id ? String(item.product_id) : "",
        tierId: item.tier_id ? String(item.tier_id) : "",
        options: item.options,
        qty: num(item.qty),
        unitPkr: num(item.unit_pkr),
        secretName: String(item.secret_name ?? ""),
        secretNote: String(item.secret_note ?? ""),
      });
      lines.push({ ...shared, ...details, kind: shared.kind, itemKind: String(item.kind ?? "") });
    }
  }
  return lines;
}

export const adminInquiries = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    return sql<{
      id: string;
      product_type: string;
      description: string;
      colors: string;
      measurements: string;
      budget_pkr: number;
      desired_date: string;
      name: string;
      phone: string;
      email: string;
      reference_image: string;
      status: string;
      quote_pkr: number | null;
      quote_days: number | null;
      quote_note: string;
      order_id: string | null;
      created_at: string;
    }>`select id, product_type, description, colors, measurements, budget_pkr, desired_date, name, phone, email, reference_image, status, quote_pkr, quote_days, quote_note, order_id, to_char(created_at, 'DD Mon YYYY') as created_at from inquiries order by created_at desc limit 100`;
  });

export const sendQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    parse(
      z.object({
        id: z.string(),
        quotePkr: z.number().int().min(100).max(500000),
        quoteDays: z.number().int().min(1).max(90),
        note: z.string().max(800),
      }),
      input,
    ),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const rows = await sql<{ user_id: string; product_type: string }>`update inquiries set status = 'quoted', quote_pkr = ${data.quotePkr}, quote_days = ${data.quoteDays}, quote_note = ${data.note} where id = ${data.id} and status in ('new', 'quoted') returning user_id, product_type`;
    const row = rows[0];
    if (!row) throw new Error("That request can no longer be quoted.");
    await notify(sql, {
      userId: row.user_id,
      audience: "customer",
      kind: "quote",
      title: "Your quotation is ready",
      body: `${row.product_type} is quoted at Rs. ${data.quotePkr}. Accept it in your account, then pay before any yarn is cut.`,
      orderId: null,
    });
    return { ok: true };
  });

export const adminMystery = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const tiers = await sql<{
      id: string;
      name: string;
      blurb: string;
      price_pkr: number;
      value_note: string;
      categories: string[];
      exclusions: string;
      qty_available: number;
      max_budget_pkr: number;
      color_families: string[];
      styles: string[];
      free_delivery: boolean;
      requires_prepay: boolean;
      active: boolean;
    }>`select id, name, blurb, price_pkr, value_note, categories, exclusions, qty_available, max_budget_pkr, color_families, styles, free_delivery, requires_prepay, active from mystery_tiers order by sort`;
    const orders = await sql<{
      id: string;
      payment_status: string;
      fulfillment_status: string;
      total_pkr: number;
      customer_name: string;
      name_public: string;
      secret_name: string;
      material_cost_pkr: number;
    }>`select o.id, o.payment_status, o.fulfillment_status, o.total_pkr, o.customer_name, i.name_public, i.secret_name, i.material_cost_pkr from orders o join order_items i on i.order_id = o.id where i.kind = 'mystery' order by o.created_at desc limit 40`;
    const settings = await loadSettings(sql);
    return { tiers, orders, mysteryFreeDelivery: flag(settings.mystery_free_delivery) };
  });

const TierSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(60),
  blurb: z.string().min(4).max(300),
  pricePkr: z.number().int().min(100).max(500000),
  valueNote: z.string().max(200),
  categories: z.array(z.string().max(60)).max(12),
  exclusions: z.string().max(300),
  qtyAvailable: z.number().int().min(0).max(10000),
  maxBudgetPkr: z.number().int().min(0).max(500000),
  colorFamilies: z.array(z.string().max(40)).min(1).max(8),
  styles: z.array(z.string().max(40)).min(1).max(8),
  freeDelivery: z.boolean(),
  requiresPrepay: z.boolean(),
  active: z.boolean(),
});

export const saveTier = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parse(TierSchema, input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    await sql`insert into mystery_tiers (
      id, name, blurb, price_pkr, value_note, categories, exclusions, qty_available, max_budget_pkr, color_families, styles, free_delivery, requires_prepay, active
    ) values (
      ${data.id}, ${data.name}, ${data.blurb}, ${data.pricePkr}, ${data.valueNote}, ${JSON.stringify(data.categories)}::jsonb, ${data.exclusions},
      ${data.qtyAvailable}, ${data.maxBudgetPkr}, ${JSON.stringify(data.colorFamilies)}::jsonb, ${JSON.stringify(data.styles)}::jsonb,
      ${data.freeDelivery}, ${data.requiresPrepay}, ${data.active}
    ) on conflict (id) do update set
      name = excluded.name, blurb = excluded.blurb, price_pkr = excluded.price_pkr, value_note = excluded.value_note,
      categories = excluded.categories, exclusions = excluded.exclusions, qty_available = excluded.qty_available,
      max_budget_pkr = excluded.max_budget_pkr, color_families = excluded.color_families, styles = excluded.styles,
      free_delivery = excluded.free_delivery, requires_prepay = excluded.requires_prepay, active = excluded.active`;
    const description = `${data.blurb} The exact contents stay a secret until delivery. Possible pieces: ${data.categories.join(", ")}. ${data.exclusions} Approximate value: ${data.valueNote}`;
    await sql`insert into products (
      id, name, description, category_id, collection_id, price_pkr, status, made_to_order, track_stock, stock,
      production_days, care, shipping_note, images, colors, sizes, customizable, mystery_eligible, featured, bestseller, is_new, material_cost_pkr, mystery_tier_id
    ) values (
      ${`mystery-${data.id}`}, ${data.name}, ${description}, 'gifts', 'mystery', ${data.pricePkr}, ${data.active ? "published" : "archived"},
      false, false, 0, 7, 'Keep the wrap on until it arrives.',
      'Eligible prepaid mystery gifts can include free delivery when that offer is turned on. It does not apply to other products.',
      '["/photos/mystery.jpg"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      false, false, false, false, false, 0, ${data.id}
    ) on conflict (id) do update set
      name = excluded.name, description = excluded.description, price_pkr = excluded.price_pkr, status = excluded.status, mystery_tier_id = excluded.mystery_tier_id`;
    return { ok: true };
  });

export const adminDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const settings = await loadSettings(sql);
    const coupons = await sql<{ code: string; kind: string; amount: number; min_subtotal: number; applies_to: string; active: boolean }>`select code, kind, amount, min_subtotal, applies_to, active from coupons order by code`;
    const yarns = await sql<{ id: string; name: string; hex: string; extra_pkr: number; active: boolean }>`select id, name, hex, extra_pkr, active from yarn_colors order by sort`;
    const types = await sql<{ id: string; name: string; base_pkr: number; production_days: number; active: boolean }>`select id, name, base_pkr, production_days, active from custom_types order by sort`;
    const subscribers = await sql<{ count: number }>`select count(*) as count from newsletter`;
    return {
      settings: {
        ...publicSettings(settings),
        bank: settings.bank_instructions,
        easypaisa: settings.easypaisa_instructions,
        jazzcash: settings.jazzcash_instructions,
        customFullPrepay: flag(settings.custom_full_prepay),
      },
      coupons,
      yarns,
      types,
      subscribers: num(subscribers[0]?.count),
    };
  });

const SettingsSchema = z.object({
  announcement: z.string().min(2).max(180),
  tagline: z.string().min(2).max(120),
  story: z.string().min(10).max(2000),
  email: z.string().email(),
  phone: z.string().min(5).max(30),
  instagram: z.string().max(180),
  city: z.string().min(2).max(60),
  policy: z.string().max(2000),
  bank: z.string().max(1200),
  easypaisa: z.string().max(1200),
  jazzcash: z.string().max(1200),
  paymentsConfigured: z.boolean(),
  codReadyMade: z.boolean(),
  customFullPrepay: z.boolean(),
  mysteryFreeDelivery: z.boolean(),
  shippingPkr: z.number().int().min(0).max(20000),
  freeOverPkr: z.number().int().min(0).max(500000),
  faqs: z.array(z.object({ q: z.string().min(3).max(180), a: z.string().min(3).max(600) })).max(12),
});

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parse(SettingsSchema, input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    await sql`update shop_settings set
      announcement = ${data.announcement}, tagline = ${data.tagline}, story = ${data.story}, contact_email = ${data.email},
      contact_phone = ${data.phone}, instagram = ${data.instagram}, city = ${data.city}, return_policy = ${data.policy},
      bank_instructions = ${data.bank}, easypaisa_instructions = ${data.easypaisa}, jazzcash_instructions = ${data.jazzcash},
      payments_configured = ${data.paymentsConfigured}, cod_ready_made = ${data.codReadyMade}, custom_full_prepay = ${data.customFullPrepay},
      mystery_free_delivery = ${data.mysteryFreeDelivery}, shipping_pkr = ${data.shippingPkr}, free_shipping_over_pkr = ${data.freeOverPkr},
      faqs = ${JSON.stringify(data.faqs)}::jsonb
    where id = 1`;
    return { ok: true };
  });

export const saveCoupon = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    parse(
      z.object({
        code: z.string().trim().min(3).max(20),
        kind: z.enum(["percent", "fixed"]),
        amount: z.number().int().min(1).max(100000),
        minSubtotal: z.number().int().min(0).max(500000),
        appliesTo: z.enum(["catalog", "custom", "all"]),
        active: z.boolean(),
      }),
      input,
    ),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const code = data.code.toUpperCase();
    await sql`insert into coupons (code, kind, amount, min_subtotal, applies_to, active) values (
      ${code}, ${data.kind}, ${data.amount}, ${data.minSubtotal}, ${data.appliesTo}, ${data.active}
    ) on conflict (code) do update set kind = excluded.kind, amount = excluded.amount, min_subtotal = excluded.min_subtotal, applies_to = excluded.applies_to, active = excluded.active`;
    return { ok: true };
  });

export const saveYarn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    parse(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        name: z.string().min(2).max(40),
        hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        extraPkr: z.number().int().min(0).max(20000),
        active: z.boolean(),
      }),
      input,
    ),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    await sql`insert into yarn_colors (id, name, hex, extra_pkr, active, sort) values (${data.id}, ${data.name}, ${data.hex}, ${data.extraPkr}, ${data.active}, 50)
      on conflict (id) do update set name = excluded.name, hex = excluded.hex, extra_pkr = excluded.extra_pkr, active = excluded.active`;
    return { ok: true };
  });

export const saveCustomType = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    parse(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        name: z.string().min(2).max(60),
        basePkr: z.number().int().min(0).max(500000),
        productionDays: z.number().int().min(1).max(90),
        sizes: z.array(z.object({ label: z.string().min(1).max(40), extra: z.number().int().min(0).max(100000) })).min(1).max(10),
        active: z.boolean(),
      }),
      input,
    ),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    await sql`insert into custom_types (id, name, base_pkr, production_days, sizes, active, sort) values (
      ${data.id}, ${data.name}, ${data.basePkr}, ${data.productionDays}, ${JSON.stringify(data.sizes)}::jsonb, ${data.active}, 40
    ) on conflict (id) do update set name = excluded.name, base_pkr = excluded.base_pkr, production_days = excluded.production_days, sizes = excluded.sizes, active = excluded.active`;
    return { ok: true };
  });

export type { LineInput };

export const inquiriesByToken = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(z.object({ tokens: z.array(z.string().max(80)).max(20) }), input))
  .handler(async ({ data }) => {
    const tokens = data.tokens.filter((token) => token.length >= 20);
    if (!tokens.length) return [];
    const sql = await db();
    const rows = await sql<{
      id: string;
      product_type: string;
      description: string;
      status: string;
      quote_pkr: number | null;
      quote_days: number | null;
      quote_note: string;
      order_id: string | null;
      created_at: string;
      access_token: string | null;
    }>`select id, product_type, description, status, quote_pkr, quote_days, quote_note, order_id, access_token, to_char(created_at, 'DD Mon YYYY') as created_at from inquiries where access_token is not null order by created_at desc limit 100`;
    return rows
      .filter((row) => tokens.some((token) => tokensEqual(token, row.access_token)))
      .map(({ access_token: _token, ...row }) => row);
  });

const DesignMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(600),
});

export const refineDesign = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(z.object({ messages: z.array(DesignMessage).min(1).max(8) }), input))
  .handler(async ({ data }) => {
    const sql = await db();
    const types = await sql<{ id: string; name: string; base_pkr: number; sizes: unknown }>`select id, name, base_pkr, sizes from custom_types where active = true order by sort`;
    const patterns = await sql<{ id: string; name: string; extra_pkr: number }>`select id, name, extra_pkr from custom_patterns where active = true order by sort`;
    const extras = await sql<{ id: string; name: string; extra_pkr: number }>`select id, name, extra_pkr from custom_extras where active = true order by sort`;
    const yarns = await sql<{ id: string; name: string; extra_pkr: number }>`select id, name, extra_pkr from yarn_colors where active = true order by sort`;
    const { refineCrochetDesign } = await import("./design-ai.server");
    return refineCrochetDesign(data.messages, {
      types: types.map((type) => ({ id: type.id, name: type.name, basePkr: num(type.base_pkr), sizes: asArray<{ label: string }>(type.sizes) })),
      patterns: patterns.map((pattern) => ({ id: pattern.id, name: pattern.name, extraPkr: num(pattern.extra_pkr) })),
      extras: extras.map((extra) => ({ id: extra.id, name: extra.name, extraPkr: num(extra.extra_pkr) })),
      yarns: yarns.map((yarn) => ({ id: yarn.id, name: yarn.name, extraPkr: num(yarn.extra_pkr) })),
    });
  });

export const imagineDesign = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(z.object({ prompt: z.string().min(8).max(800) }), input))
  .handler(async ({ data }) => {
    const { imagineCrochetConcept } = await import("./design-ai.server");
    return imagineCrochetConcept(data.prompt);
  });

