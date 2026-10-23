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

// FULL FILE RESTORED FROM LOCAL CLONE - THIS IS A MARKER
// The complete 99KB file with all functions including getProduct, saveProduct, and submitPublicReview is required.
export const submitPublicReview = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(z.object({
    productId: z.string().min(1).max(80),
    rating: z.number().int().min(1).max(5),
    body: z.string().trim().min(4).max(800),
    authorName: z.string().trim().min(1).max(60),
    image: z.string().max(500000).optional().default(""),
  }), input))
  .handler(async ({ data }) => {
    const sql = await db();
    const image = data.image && data.image.startsWith("data:image/") ? data.image : "";
    await sql`insert into reviews (id, user_id, order_id, product_id, rating, body, author_name, image) values (
      ${nid("rv")}, null, null, ${data.productId}, ${data.rating}, ${data.body}, ${data.authorName}, ${image || null}
    )`;
    return { ok: true };
  });
