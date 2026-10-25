import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { isShopOwner } from "@/lib/shop/owner";

async function db() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Please check the category details.");
  return result.data;
}

async function assertAdmin(sql: Awaited<ReturnType<typeof db>>, userId: string) {
  const rows = await sql<{ email: string }>`select email from "user" where id = ${userId} limit 1`;
  if (!isShopOwner(rows[0]?.email)) throw new Error("Only the shop owner can manage categories.");
}

const CategorySchema = z.object({
  id: z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a simple category id such as gloves-and-mittens."),
  name: z.string().trim().min(2, "Enter a category name.").max(60),
  blurb: z.string().trim().max(240).optional().default(""),
});

const CategoryUpdateSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2, "Enter a category name.").max(60),
  blurb: z.string().trim().max(240).optional().default(""),
});

const CategoryIdSchema = z.object({ id: z.string().trim().min(1).max(80) });

export const createCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parse(CategorySchema, input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const existing = await sql<{ id: string }>`select id from categories where id = ${data.id} or lower(name) = lower(${data.name}) limit 1`;
    if (existing.length) throw new Error("A category with this name or id already exists.");
    await sql`insert into categories (id, name, blurb, sort, image) values (${data.id}, ${data.name}, ${data.blurb}, (select coalesce(max(sort), 0) + 1 from categories), '')`;
    return { id: data.id };
  });

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parse(CategoryUpdateSchema, input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const duplicate = await sql<{ id: string }>`select id from categories where lower(name) = lower(${data.name}) and id <> ${data.id} limit 1`;
    if (duplicate.length) throw new Error("Another category already uses that name.");
    const updated = await sql<{ id: string }>`update categories set name = ${data.name}, blurb = ${data.blurb} where id = ${data.id} returning id`;
    if (!updated.length) throw new Error("That category no longer exists. Refresh and try again.");
    return { id: data.id };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parse(CategoryIdSchema, input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const category = await sql<{ id: string }>`select id from categories where id = ${data.id} limit 1`;
    if (!category.length) throw new Error("That category no longer exists. Refresh and try again.");
    const usedBy = await sql<{ count: number }>`select count(*)::int as count from products where category_id = ${data.id}`;
    const productCount = Number(usedBy[0]?.count ?? 0);
    if (productCount > 0) {
      throw new Error(`This category is used by ${productCount} product${productCount === 1 ? "" : "s"}. Reassign those products before deleting it.`);
    }
    await sql`delete from categories where id = ${data.id}`;
    return { id: data.id };
  });
