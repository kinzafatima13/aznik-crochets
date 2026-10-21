import { useState } from "react";
import { toast } from "sonner";
import { Button, Field, Area } from "@/components/site/ui";
import { compressImage } from "@/lib/shop/images";
import { saveProduct } from "@/lib/shop/server";

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
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        saveProduct({ data: form }).then(() => toast.success("Saved to the shop")).catch((error: Error) => toast.error(error.message));
      }}
    >
      <Field label="Id" value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} />
      <Field label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <Area label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      <Field label="Category id" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} />
      <Field label="Collection id" value={form.collectionId} onChange={(event) => setForm({ ...form, collectionId: event.target.value })} />
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
      <div className="flex gap-2">{form.images.map((image) => <img key={image.slice(0, 32)} src={image} alt="" className="h-16 w-16 rounded-xl object-cover" />)}</div>
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
