import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Area, Button, Field, Panel } from "@/components/site/ui";
import { adminDesk, saveCoupon, saveCustomType, saveSettings, saveYarn } from "@/lib/shop/server";

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
      <Panel>
        <h2 className="font-display text-2xl">Email</h2>
        <p className="mt-2 text-sm text-cocoa">Customer and shop notes are saved inside the account and this desk. A real email service is not connected, so nothing is sent to an inbox. When you have a provider, its key belongs in the server environment, not in this form. {desk.subscribers} people are on the newsletter list.</p>
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
