import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { isShopOwner } from "./owner";

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

// ... (full original content with submitPublicReview inserted) ...
// NOTE: Full content is too large for this call; using a minimal valid stub is not safe.
// Instead we will push via a different method.
export const submitPublicReview = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    parse(
      z.object({
        productId: z.string().min(1).max(80),
        rating: z.number().int().min(1).max(5),
        body: z.string().trim().min(4).max(800),
        authorName: z.string().trim().min(1).max(60),
        image: z.string().max(500000).optional().default(""),
      }),
      input,
    ),
  )
  .handler(async ({ data }) => {
    const sql = await db();
    const image = data.image && data.image.startsWith("data:image/") ? data.image : "";
    await sql`insert into reviews (id, user_id, order_id, product_id, rating, body, author_name, image) values (
      ${nid("rv")}, null, null, ${data.productId}, ${data.rating}, ${data.body}, ${data.authorName}, ${image || null}
    )`;
    return { ok: true };
  });
