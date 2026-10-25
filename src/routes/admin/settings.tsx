import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Area, Button, Field, Panel } from "@/components/site/ui";
import { compressImage } from "@/lib/shop/images";
import { adminDesk, getChrome, saveCategoryCover, saveCoupon, saveCustomType, saveSettings, saveYarn } from "@/lib/shop/server";
import { createCategory, deleteCategory, updateCategory } from "@/lib/shop/category-admin";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [desk, setDesk] = useState<Awaited<ReturnType<typeof adminDesk>> | null>(null);
  useEffect(() => {
    adminDesk().then(setDesk).catch((error: Error) => toast.error(error.message));
  }, []);
  if (!desk) return <p>Opening settings…</p>;
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">Settings</h1>
      <ShopForm initial={desk.settings} />
      <CategoryManager />
      <CategoryCoverForm />
      <Panel>
        <h2 className="font-display text-2xl">Email</h2>
        <p className="mt-2 text-sm text-cocoa">Order emails send only after a mailbox is connected. Create a new Gmail for the shop, then add SMTP_HOST, SMTP_USER, SMTP_PASS, and ORDER_FROM_EMAIL in the Vercel project. Until those exist, orders are saved here and no email is sent. {desk.subscribers} people are on the newsletter list.</p>
      </Panel>
      <Panel>
        <h2 className="font-display text-2xl">Online cards</h2>
        <p className="mt-2 text-sm text-cocoa">No card gateway is connected, and this shop will not pretend a payment succeeded. Bank transfer, Easypaisa, and JazzCash are manual: the customer uploads a receipt and you verify it. Card numbers are never stored.</p>
      </Panel>
      <CouponForm />
      <YarnForm />
      <TypeForm />
    </div>
  );
}


function CategoryCoverForm() {
  const [categories, setCategories] = useState<Array<{ id: string; name: string; blurb: string; image: string }>>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChrome()
      .then((chrome) => setCategories(chrome.categories))
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  async function chooseImage(id: string, file?: File) {
    if (!file) return;
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Choose a JPG, PNG, or WebP image.");
      }
      const image = await compressImage(file, 900);
      setDrafts((current) => ({ ...current, [id]: image }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that image.");
    }
  }

  async function saveCover(category: { id: string; name: string; image: string }) {
    const image = drafts[category.id];
    if (!image) {
      toast.error("Choose a new category cover image first.");
      return;
    }
    try {
      await saveCategoryCover({ data: { id: category.id, image } });
      setCategories((current) => current.map((item) => item.id === category.id ? { ...item, image } : item));
      setDrafts((current) => {
        const next = { ...current };
        delete next[category.id];
        return next;
      });
      toast.success(`Saved the ${category.name} cover`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this cover.");
    }
  }

  return (
    <Panel>
      <h2 className="font-display text-2xl">Category cover images</h2>
      <p className="mt-2 text-sm text-cocoa">Choose a dedicated cover for each product category. Covers are independent of product photos. All categories from the shop are listed below.</p>
      {loading ? <p className="mt-4 text-sm text-cocoa">Loading categories…</p> : (
        <>
          <p className="mt-3 text-xs text-cocoa">{categories.length} categor{categories.length === 1 ? "y" : "ies"} available</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => {
              const preview = drafts[category.id] ?? category.image;
              return (
                <article key={category.id} className="min-w-0 rounded-xl border border-line bg-paper p-3">
                  <img src={preview} alt={`${category.name} category cover preview`} className="h-24 w-full rounded-lg object-cover" />
                  <h3 className="mt-2 truncate font-display text-lg" title={category.name}>{category.name}</h3>
                  <label className="mt-2 block text-xs text-cocoa">
                    Choose cover image
                    <input
                      className="mt-1 block w-full min-w-0 text-xs file:mr-2 file:rounded-full file:border-0 file:bg-berry file:px-3 file:py-1.5 file:text-white"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => { void chooseImage(category.id, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={!drafts[category.id]}
                    onClick={() => void saveCover(category)}
                    className="mt-2 min-h-9 rounded-full bg-berry px-4 text-sm text-paper disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save cover
                  </button>
                  {drafts[category.id] ? <p className="mt-1 text-xs text-cocoa">Selected — save to publish.</p> : null}
                </article>
              );
            })}
            {categories.length === 0 ? <p className="text-sm text-cocoa">No product categories were found in the shop database.</p> : null}
          </div>
        </>
      )}
    </Panel>
  );
}


function CategoryManager() {
  type Category = { id: string; name: string; blurb: string; image: string };
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState({ name: "", blurb: "" });
  const [edits, setEdits] = useState<Record<string, { name: string; blurb: string }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function refreshCategories() {
    const chrome = await getChrome();
    setCategories(chrome.categories);
  }

  useEffect(() => {
    refreshCategories()
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  function categoryId(name: string) {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    const id = categoryId(name);
    if (!id) {
      toast.error("Use an English category name to create its short link id.");
      return;
    }
    setSaving(true);
    try {
      await createCategory({ data: { id, name, blurb: draft.blurb.trim() } });
      await refreshCategories();
      setDraft({ name: "", blurb: "" });
      toast.success("Category added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add category.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(category: Category) {
    const values = edits[category.id] ?? { name: category.name, blurb: category.blurb };
    setSaving(true);
    try {
      await updateCategory({ data: { id: category.id, name: values.name.trim(), blurb: values.blurb.trim() } });
      await refreshCategories();
      setEditingId(null);
      setEdits((current) => {
        const next = { ...current };
        delete next[category.id];
        return next;
      });
      toast.success("Category updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update category.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(category: Category) {
    if (!window.confirm(`Delete “${category.name}”? Categories with products cannot be deleted. This does not delete any products.`)) return;
    setSaving(true);
    try {
      await deleteCategory({ data: { id: category.id } });
      await refreshCategories();
      toast.success("Category deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel>
      <h2 className="font-display text-2xl">Product categories</h2>
      <p className="mt-2 text-sm text-cocoa">Add, rename, or delete categories here. Existing product assignments are preserved; a category cannot be deleted while products still use it.</p>
      <form className="mt-4 grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-2" onSubmit={addCategory}>
        <Field label="New category name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        <Field label="Short description (optional)" value={draft.blurb} onChange={(event) => setDraft({ ...draft, blurb: event.target.value })} />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving || draft.name.trim().length < 2}>Add category</Button>
        </div>
      </form>
      {loading ? <p className="mt-4 text-sm text-cocoa">Loading categories…</p> : (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-cocoa">{categories.length} categor{categories.length === 1 ? "y" : "ies"}</p>
          {categories.map((category) => {
            const values = edits[category.id] ?? { name: category.name, blurb: category.blurb };
            const isEditing = editingId === category.id;
            return (
              <article key={category.id} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1fr_auto] sm:items-start">
                <div className="min-w-0">
                  {isEditing ? (
                    <div className="grid gap-2">
                      <Field label="Category name" value={values.name} onChange={(event) => setEdits((current) => ({ ...current, [category.id]: { ...values, name: event.target.value } }))} />
                      <Field label="Short description" value={values.blurb} onChange={(event) => setEdits((current) => ({ ...current, [category.id]: { ...values, blurb: event.target.value } }))} />
                      <p className="text-xs text-cocoa">Link id stays “{category.id}” so existing product assignments are not changed.</p>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="mt-1 text-sm text-cocoa">{category.blurb || "No description"}</p>
                      <p className="mt-1 text-xs text-cocoa">ID: {category.id}</p>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {isEditing ? (
                    <>
                      <Button disabled={saving || values.name.trim().length < 2} onClick={() => void saveEdit(category)}>Save</Button>
                      <Button disabled={saving} onClick={() => setEditingId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button disabled={saving} onClick={() => { setEditingId(category.id); setEdits((current) => ({ ...current, [category.id]: { name: category.name, blurb: category.blurb } })); }}>Edit</Button>
                  )}
                  <button type="button" disabled={saving} onClick={() => void removeCategory(category)} className="min-h-10 rounded-full border border-red-300 px-4 text-sm text-red-700 disabled:opacity-50">Delete</button>
                </div>
              </article>
            );
          })}
          {categories.length === 0 ? <p className="text-sm text-cocoa">No categories yet. Add your first category above.</p> : null}
        </div>
      )}
    </Panel>
  );
}

function ShopForm({ initial }: { initial: Awaited<ReturnType<typeof adminDesk>>["settings"] }) {
  const [form, setForm] = useState({ ...initial, faqs: initial.faqs });
  return (
    <form className="grid gap-3" onSubmit={(event) => {
      event.preventDefault();
      saveSettings({ data: form }).then(() => toast.success("Settings saved")).catch((error: Error) => toast.error(error.message));
    }}>
      <Field label="Announcement" value={form.announcement} onChange={(event) => setForm({ ...form, announcement: event.target.value })} />
      <Field label="Tagline" value={form.tagline} onChange={(event) => setForm({ ...form, tagline: event.target.value })} />
      <Area label="Story" value={form.story} onChange={(event) => setForm({ ...form, story: event.target.value })} />
      <Field label="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <Field label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      <Field label="Instagram URL" value={form.instagram} onChange={(event) => setForm({ ...form, instagram: event.target.value })} />
      <Field label="City" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
      <Area label="Bank instructions" value={form.bank} onChange={(event) => setForm({ ...form, bank: event.target.value })} />
      <Area label="Easypaisa instructions" value={form.easypaisa} onChange={(event) => setForm({ ...form, easypaisa: event.target.value })} />
      <Area label="JazzCash instructions" value={form.jazzcash} onChange={(event) => setForm({ ...form, jazzcash: event.target.value })} />
      <Area label="Return policy" value={form.policy} onChange={(event) => setForm({ ...form, policy: event.target.value })} />
      <Field label="Cash on delivery charge (PKR). Advance payment is free." type="number" value={form.shippingPkr} onChange={(event) => setForm({ ...form, shippingPkr: Number(event.target.value) })} />
      <Field label="Free delivery over (0 = off)" type="number" value={form.freeOverPkr} onChange={(event) => setForm({ ...form, freeOverPkr: Number(event.target.value) })} />
      <label className="text-sm"><input type="checkbox" checked={form.paymentsConfigured} onChange={(event) => setForm({ ...form, paymentsConfigured: event.target.checked })} /> I replaced the sample payment details with my real accounts</label>
      <label className="text-sm"><input type="checkbox" checked={form.codReadyMade} onChange={(event) => setForm({ ...form, codReadyMade: event.target.checked })} /> Allow cash on delivery for in-stock ready-made pieces</label>
      <label className="text-sm"><input type="checkbox" checked={form.customFullPrepay} onChange={(event) => setForm({ ...form, customFullPrepay: event.target.checked })} /> Custom orders require full advance payment</label>
      <label className="text-sm"><input type="checkbox" checked={form.mysteryFreeDelivery} onChange={(event) => setForm({ ...form, mysteryFreeDelivery: event.target.checked })} /> Free delivery on eligible prepaid mystery gifts</label>
      <Button type="submit">Save shop settings</Button>
    </form>
  );
}

function CouponForm() {
  const [form, setForm] = useState({ code: "", kind: "percent" as const, amount: 10, minSubtotal: 2000, appliesTo: "catalog" as const, active: true });
  return (
    <Panel>
      <h2 className="font-display text-2xl">Coupon</h2>
      <div className="mt-3 grid gap-2">
        <Field label="Code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
        <Field label="Amount" type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} />
        <Field label="Minimum on eligible pieces" type="number" value={form.minSubtotal} onChange={(event) => setForm({ ...form, minSubtotal: Number(event.target.value) })} />
        <Button onClick={() => saveCoupon({ data: form }).then(() => toast.success("Coupon saved")).catch((error: Error) => toast.error(error.message))}>Save coupon</Button>
      </div>
    </Panel>
  );
}

function YarnForm() {
  const [form, setForm] = useState({ id: "", name: "", hex: "#F3C1C8", extraPkr: 0, active: true });
  return (
    <Panel>
      <h2 className="font-display text-2xl">Yarn colour</h2>
      <div className="mt-3 grid gap-2">
        <Field label="Id" value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} />
        <Field label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Field label="Hex" value={form.hex} onChange={(event) => setForm({ ...form, hex: event.target.value })} />
        <Field label="Extra PKR" type="number" value={form.extraPkr} onChange={(event) => setForm({ ...form, extraPkr: Number(event.target.value) })} />
        <Button onClick={() => saveYarn({ data: form }).then(() => toast.success("Yarn saved")).catch((error: Error) => toast.error(error.message))}>Save yarn</Button>
      </div>
    </Panel>
  );
}

function TypeForm() {
  const [form, setForm] = useState({ id: "", name: "", basePkr: 2000, productionDays: 7, sizesText: "One size:0", active: true });
  return (
    <Panel>
      <h2 className="font-display text-2xl">Custom product type</h2>
      <p className="text-sm text-cocoa">Sizes as Label:extra, separated by commas. Example: S:0, M:0, Custom measurements:800</p>
      <div className="mt-3 grid gap-2">
        <Field label="Id" value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} />
        <Field label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Field label="Base PKR (0 means quotation only)" type="number" value={form.basePkr} onChange={(event) => setForm({ ...form, basePkr: Number(event.target.value) })} />
        <Field label="Days" type="number" value={form.productionDays} onChange={(event) => setForm({ ...form, productionDays: Number(event.target.value) })} />
        <Field label="Sizes" value={form.sizesText} onChange={(event) => setForm({ ...form, sizesText: event.target.value })} />
        <Button onClick={() => saveCustomType({
          data: {
            id: form.id,
            name: form.name,
            basePkr: form.basePkr,
            productionDays: form.productionDays,
            active: form.active,
            sizes: form.sizesText.split(",").map((part) => {
              const [label, extra] = part.split(":");
              return { label: (label ?? "").trim(), extra: Number(extra ?? 0) || 0 };
            }).filter((size) => size.label),
          },
        }).then(() => toast.success("Product type saved")).catch((error: Error) => toast.error(error.message))}>Save type</Button>
      </div>
    </Panel>
  );
}
