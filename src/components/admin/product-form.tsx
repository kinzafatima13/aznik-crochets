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
  const [colorName, setColorName] = useState("Blush");
  const [colorHex, setColorHex] = useState("#F3C1C8");
  const [size, setSize] = useState("One size");
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
      <div className="flex gap-2">
        <input value={colorName} onChange={(event) => setColorName(event.target.value)} className="min-h-11 rounded-2xl border border-line px-3" />
        <input value={colorHex} onChange={(event) => setColorHex(event.target.value)} className="min-h-11 rounded-2xl border border-line px-3" />
        <Button type="button" variant="ghost" onClick={() => setForm({ ...form, colors: [...form.colors, { name: colorName, hex: colorHex }] })}>Add colour</Button>
      </div>
      <p className="text-sm">{form.colors.map((color) => color.name).join(", ") || "No colours yet"}</p>
      <div className="flex gap-2">
        <input value={size} onChange={(event) => setSize(event.target.value)} className="min-h-11 rounded-2xl border border-line px-3" />
        <Button type="button" variant="ghost" onClick={() => setForm({ ...form, sizes: [...form.sizes, size] })}>Add size</Button>
      </div>
      <p className="text-sm">{form.sizes.join(", ")}</p>
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
