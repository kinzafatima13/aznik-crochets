import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Field, Area } from "@/components/site/ui";
import { compressImage } from "@/lib/shop/images";
import { getChrome, saveProduct } from "@/lib/shop/server";

type ProductFormValue = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  collectionId: string;
  pricePkr: number;
  status: "published" | "draft" | "archived";
  madeToOrder: boolean;
  trackStock: boolean;
  stock: number;
  productionDays: number;
  care: string;
  shippingNote: string;
  images: string[];
  colors: Array<{ name: string; hex: string }>;
  sizes: string[];
  customizable: boolean;
  mysteryEligible: boolean;
  featured: boolean;
  bestseller: boolean;
  isNew: boolean;
  materialCostPkr: number;
};

export function ProductForm({ initial }: { initial: ProductFormValue }) {
  const [form, setForm] = useState(initial);
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#F3C1C8");
  const [size, setSize] = useState("");
  const [lists, setLists] = useState<{ categories: Array<{ id: string; name: string }>; collections: Array<{ id: string; name: string }> }>({
    categories: [],
    collections: [],
  });
  useEffect(() => {
    getChrome()
      .then((chrome) => setLists({ categories: chrome.categories, collections: chrome.collections }))
      .catch(() => undefined);
  }, []);

  function slugFrom(name: string) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    return slug.length >= 2 ? slug : "handmade-piece";
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const name = form.name.trim();
        const id = (form.id.trim() || slugFrom(name)).toLowerCase();
        if (name.length < 2) {
          toast.error("Give the piece a name, at least 2 letters.");
          return;
        }
        if (!/^[a-z0-9-]+$/.test(id) || id.length < 2) {
          toast.error("The name needs letters or numbers so the shop can save a link, like daisy-clip.");
          return;
        }
        const images = form.images.filter((image) => image.startsWith("data:image/") || image.startsWith("/photos/"));
        saveProduct({ data: { ...form, id, name, images } })
          .then(() => {
            setForm((current) => ({ ...current, id, name }));
            toast.success("Saved to the shop");
          })
          .catch((error: Error) => toast.error(error.message));
      }}
    >
      <Field label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value, id: initial.id || slugFrom(event.target.value) })} />
      <Field label="Short link name" value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48) })} />
      <p className="-mt-2 text-xs text-cocoa">Used in the product link, for example: daisy-clip. This fills automatically from the name, and you can edit it.</p>
      <Area label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      <label className="text-sm">Category
        <select className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-paper px-3" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
          {lists.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="text-sm">Collection
        <select className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-paper px-3" value={form.collectionId} onChange={(event) => setForm({ ...form, collectionId: event.target.value })}>
          {lists.collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
        </select>
      </label>
      <Field label="Price PKR" type="number" value={form.pricePkr} onChange={(event) => setForm({ ...form, pricePkr: Number(event.target.value) })} />
      <label className="text-sm">Status
        <select className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-paper px-3" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProductFormValue["status"] })}>
          <option value="published">Published</option>
          <option value="draft">Unpublished draft</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <Field label="Stock" type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })} />
      <Field label="Production days" type="number" value={form.productionDays} onChange={(event) => setForm({ ...form, productionDays: Number(event.target.value) })} />
      <Field label="Material cost PKR" type="number" value={form.materialCostPkr} onChange={(event) => setForm({ ...form, materialCostPkr: Number(event.target.value) })} />
      <Field label="Care" value={form.care} onChange={(event) => setForm({ ...form, care: event.target.value })} />
      <Field label="Shipping note" value={form.shippingNote} onChange={(event) => setForm({ ...form, shippingNote: event.target.value })} />
      <div className="flex flex-wrap gap-3 text-sm">
        <label><input type="checkbox" checked={form.madeToOrder} onChange={(event) => setForm({ ...form, madeToOrder: event.target.checked })} /> Made to order</label>
        <label><input type="checkbox" checked={form.trackStock} onChange={(event) => setForm({ ...form, trackStock: event.target.checked })} /> Track stock</label>
        <label><input type="checkbox" checked={form.customizable} onChange={(event) => setForm({ ...form, customizable: event.target.checked })} /> Customizable</label>
        <label><input type="checkbox" checked={form.mysteryEligible} onChange={(event) => setForm({ ...form, mysteryEligible: event.target.checked })} /> Mystery eligible</label>
        <label><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /> Featured</label>
        <label><input type="checkbox" checked={form.bestseller} onChange={(event) => setForm({ ...form, bestseller: event.target.checked })} /> Bestseller</label>
        <label><input type="checkbox" checked={form.isNew} onChange={(event) => setForm({ ...form, isNew: event.target.checked })} /> New</label>
      </div>
      <section className="space-y-3 rounded-2xl border border-line p-4">
        <div>
          <h2 className="font-display text-2xl">Available colours</h2>
          <p className="text-sm text-cocoa">Customers can choose from these colours on the product page. Add up to 8.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <label className="text-sm">Colour name
            <input value={colorName} onChange={(event) => setColorName(event.target.value)} placeholder="e.g. Sage green" maxLength={40} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-paper px-3" />
          </label>
          <label className="text-sm">Swatch
            <input type="color" aria-label="Colour swatch" value={colorHex} onChange={(event) => setColorHex(event.target.value)} className="mt-1 block h-11 w-16 rounded-xl border border-line bg-paper p-1" />
          </label>
          <div className="self-end">
            <Button type="button" variant="ghost" disabled={!colorName.trim() || form.colors.length >= 8 || form.colors.some((item) => item.name.toLowerCase() === colorName.trim().toLowerCase())} onClick={() => {
              const next = { name: colorName.trim(), hex: colorHex };
              setForm((current) => ({ ...current, colors: [...current.colors, next] }));
              setColorName("");
            }}>Add colour</Button>
          </div>
        </div>
        {form.colors.length ? <ul className="flex flex-wrap gap-2">{form.colors.map((color) => (
          <li key={color.name} className="flex items-center gap-2 rounded-full border border-line bg-paper py-1 pl-2 pr-1 text-sm">
            <span aria-hidden="true" className="size-4 rounded-full border border-line" style={{ backgroundColor: color.hex }} />
            {color.name}
            <button type="button" aria-label={`Remove ${color.name}`} onClick={() => setForm((current) => ({ ...current, colors: current.colors.filter((item) => item.name !== color.name) }))} className="grid size-7 place-items-center rounded-full text-berry">×</button>
          </li>
        ))}</ul> : <p className="text-sm text-cocoa">No colours listed. Customers can only request a custom colour if Customizable is enabled.</p>}
      </section>
      <section className="space-y-3 rounded-2xl border border-line p-4">
        <div>
          <h2 className="font-display text-2xl">Available sizes</h2>
          <p className="text-sm text-cocoa">Examples: Small, Medium, Large, or One size. Add up to 12.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="min-w-0 flex-1 text-sm">Size name
            <input value={size} onChange={(event) => setSize(event.target.value)} maxLength={40} placeholder="e.g. Medium" className="mt-1 min-h-11 w-full rounded-xl border border-line bg-paper px-3" />
          </label>
          <div className="self-end">
            <Button type="button" variant="ghost" disabled={!size.trim() || form.sizes.length >= 12 || form.sizes.some((item) => item.toLowerCase() === size.trim().toLowerCase())} onClick={() => {
              const next = size.trim();
              setForm((current) => ({ ...current, sizes: [...current.sizes, next] }));
              setSize("");
            }}>Add size</Button>
          </div>
        </div>
        {form.sizes.length ? <ul className="flex flex-wrap gap-2">{form.sizes.map((item) => (
          <li key={item} className="flex items-center gap-1 rounded-full border border-line bg-paper py-1 pl-3 pr-1 text-sm">
            {item}
            <button type="button" aria-label={`Remove size ${item}`} onClick={() => setForm((current) => ({ ...current, sizes: current.sizes.filter((value) => value !== item) }))} className="grid size-7 place-items-center rounded-full text-berry">×</button>
          </li>
        ))}</ul> : <p className="text-sm text-cocoa">No sizes listed. Add at least one if customers need to choose a size.</p>}
      </section>
      <label className="text-sm">Photos
        <input type="file" accept="image/*" className="mt-1 block" onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          compressImage(file).then((image) => setForm((current) => ({ ...current, images: [...current.images, image].slice(0, 4) }))).catch((error: Error) => toast.error(error.message));
        }} />
      </label>
      <div className="flex flex-wrap gap-2">{form.images.map((image, index) => (
        <div key={`${image.slice(0, 24)}-${index}`} className="relative">
          <img src={image} alt="" className="h-16 w-16 rounded-xl object-cover" />
          <button type="button" className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-berry text-xs text-paper" onClick={() => setForm({ ...form, images: form.images.filter((_, item) => item !== index) })}>×</button>
        </div>
      ))}</div>
      <Button type="submit">Save product</Button>
    </form>
  );
}

export const blankProduct: ProductFormValue = {
  id: "",
  name: "",
  description: "Handmade by Aznik, described with care and a little room to breathe.",
  categoryId: "gifts",
  collectionId: "little-gifts",
  pricePkr: 2500,
  status: "draft",
  madeToOrder: false,
  trackStock: true,
  stock: 1,
  productionDays: 5,
  care: "Spot clean and reshape while damp.",
  shippingNote: "Dispatched from Islamabad after payment.",
  images: [],
  colors: [{ name: "Blush", hex: "#F3C1C8" }],
  sizes: ["One size"],
  customizable: false,
  mysteryEligible: false,
  featured: false,
  bestseller: false,
  isNew: true,
  materialCostPkr: 0,
};
