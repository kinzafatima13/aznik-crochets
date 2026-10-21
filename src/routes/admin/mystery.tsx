import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Field, Panel, Price } from "@/components/site/ui";
import { adminMystery, saveTier } from "@/lib/shop/server";

export const Route = createFileRoute("/admin/mystery")({
  component: MysteryDesk,
});

function MysteryDesk() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminMystery>> | null>(null);
  useEffect(() => {
    adminMystery().then(setData).catch(() => setData(null));
  }, []);
  if (!data) return <p>Opening mystery gifts…</p>;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Mystery gifts</h1>
      <p className="text-sm text-cocoa">Free prepaid delivery is {data.mysteryFreeDelivery ? "on" : "off"}. Change it in settings. Assign the real contents on each order — customers do not see that field until delivery.</p>
      {data.tiers.map((tier) => <TierEditor key={String(tier.id)} tier={tier as Record<string, unknown>} onSaved={() => adminMystery().then(setData)} />)}
      <h2 className="font-display text-2xl">Orders</h2>
      <ul className="space-y-2 text-sm">
        {data.orders.map((order) => (
          <li key={`${order.id}-${order.name_public}`} className="rounded-2xl bg-paper p-3">
            {String(order.id)} · {String(order.customer_name)} · {String(order.name_public)} · <Price value={Number(order.total_pkr)} /> · {String(order.payment_status)} / {String(order.fulfillment_status)}
            <span className="block text-cocoa">Assigned privately: {String(order.secret_name || "not yet")} · materials Rs. {String(order.material_cost_pkr || 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TierEditor({ tier, onSaved }: { tier: Record<string, unknown>; onSaved: () => void }) {
  const list = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
  const [form, setForm] = useState({
    id: String(tier.id),
    name: String(tier.name),
    blurb: String(tier.blurb),
    pricePkr: Number(tier.price_pkr),
    valueNote: String(tier.value_note),
    categories: list(tier.categories).join(", "),
    exclusions: String(tier.exclusions),
    qtyAvailable: Number(tier.qty_available),
    maxBudgetPkr: Number(tier.max_budget_pkr),
    colorFamilies: list(tier.color_families).join(", "),
    styles: list(tier.styles).join(", "),
    freeDelivery: Boolean(tier.free_delivery),
    requiresPrepay: Boolean(tier.requires_prepay),
    active: Boolean(tier.active),
  });
  return (
    <Panel>
      <div className="grid gap-2 md:grid-cols-2">
        <Field label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Field label="Price PKR" type="number" value={form.pricePkr} onChange={(event) => setForm({ ...form, pricePkr: Number(event.target.value) })} />
        <Field label="Blurb" value={form.blurb} onChange={(event) => setForm({ ...form, blurb: event.target.value })} />
        <Field label="Value note" value={form.valueNote} onChange={(event) => setForm({ ...form, valueNote: event.target.value })} />
        <Field label="Categories, comma separated" value={form.categories} onChange={(event) => setForm({ ...form, categories: event.target.value })} />
        <Field label="Exclusions" value={form.exclusions} onChange={(event) => setForm({ ...form, exclusions: event.target.value })} />
        <Field label="Quantity available" type="number" value={form.qtyAvailable} onChange={(event) => setForm({ ...form, qtyAvailable: Number(event.target.value) })} />
        <Field label="Max materials budget PKR" type="number" value={form.maxBudgetPkr} onChange={(event) => setForm({ ...form, maxBudgetPkr: Number(event.target.value) })} />
        <Field label="Colour families" value={form.colorFamilies} onChange={(event) => setForm({ ...form, colorFamilies: event.target.value })} />
        <Field label="Styles" value={form.styles} onChange={(event) => setForm({ ...form, styles: event.target.value })} />
      </div>
      <label className="mt-2 block text-sm"><input type="checkbox" checked={form.freeDelivery} onChange={(event) => setForm({ ...form, freeDelivery: event.target.checked })} /> Free delivery when prepaid</label>
      <label className="block text-sm"><input type="checkbox" checked={form.requiresPrepay} onChange={(event) => setForm({ ...form, requiresPrepay: event.target.checked })} /> Require advance payment</label>
      <label className="block text-sm"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Available in the shop</label>
      <Button className="mt-3" onClick={() => saveTier({
        data: {
          ...form,
          categories: split(form.categories),
          colorFamilies: split(form.colorFamilies),
          styles: split(form.styles),
        },
      }).then(() => { toast.success("Tier saved"); onSaved(); }).catch((error: Error) => toast.error(error.message))}>Save tier</Button>
    </Panel>
  );
}

function split(value: string) {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}
