import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Field, Price } from "@/components/site/ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { rememberOrder } from "@/lib/shop/access";
import { rehydrateCart, useCart } from "@/lib/shop/cart";
import { getPayInfo, placeOrder, quoteCart } from "@/lib/shop/server";
import { blankShopSearch } from "@/lib/shop/search";
import type { Quote } from "@/lib/shop/types";

export const Route = createFileRoute("/checkout")({
  loader: () => getPayInfo(),
  component: CheckoutPage,
});

function CheckoutPage() {
  const pay = Route.useLoaderData();
  const { user } = useCurrentUserState();
  const lines = useCart((state) => state.lines);
  const clear = useCart((state) => state.clear);
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({ name: "", phone: "", line1: "", city: "Islamabad", notes: "", email: "", save: true });

  useEffect(() => {
    rehydrateCart();
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || lines.length === 0) return;
    quoteCart({ data: { lines: lines.map((line) => line.input), coupon, paymentMethod: "cod" } })
      .then((next) => {
        setQuote(next);
        setError("");
      })
      .catch((err: Error) => {
        setQuote(null);
        setError(err.message);
      });
  }, [lines, coupon, ready]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-5xl">Checkout</h1>
      <p className="mt-2 text-cocoa">No account is needed. Pay the courier when the parcel arrives. Delivery is Rs. {pay.shippingPkr.toLocaleString("en-PK")}. Keep your order reference and phone number.</p>
      {lines.length === 0 ? <p className="mt-6">Your bag is empty. <Link to="/shop" search={blankShopSearch} className="text-berry">Return to the shop.</Link></p> : null}
      <div className="mt-6 grid gap-3">
        <Field label="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Field label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <Field label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <Field label="Address" value={form.line1} onChange={(event) => setForm({ ...form, line1: event.target.value })} />
        <Field label="City" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
        <Field label="Notes for the courier" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        {user ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.save} onChange={(event) => setForm({ ...form, save: event.target.checked })} /> Save this address to my account</label> : <p className="text-sm text-cocoa">Checking out as a guest. Your name, phone, address, and city are saved with the order only.</p>}
        <Field label="Coupon" value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="WELCOME10" />
      </div>
      <fieldset className="mt-6 space-y-2">
        <legend className="font-display text-2xl">Payment</legend>
        <p className="rounded-2xl bg-paper px-3 py-3 text-sm">Cash on delivery · Rs. {pay.shippingPkr.toLocaleString("en-PK")} courier charge. No receipt to upload.</p>
      </fieldset>
      {error ? <p className="mt-4 text-berry">{error}</p> : null}
      {quote ? (
        <div className="mt-4 space-y-1 text-sm">
          {quote.lines.map((line, index) => (
            <p key={`${line.title}-${index}`} className="flex justify-between gap-3"><span>{line.title} × {line.qty}<span className="block text-cocoa">{line.detail}</span></span><Price value={line.linePkr} /></p>
          ))}
          <p className="flex justify-between"><span>Subtotal</span><Price value={quote.subtotalPkr} /></p>
          <p className="flex justify-between"><span>Discount</span><Price value={quote.discountPkr} /></p>
          <p className="flex justify-between"><span>Delivery</span><Price value={quote.shippingPkr} /></p>
          {quote.shippingDiscountPkr > 0 ? <p className="text-sage-deep">Delivery discount {quote.shippingDiscountPkr} PKR · {quote.shippingNote}</p> : <p className="text-cocoa">{quote.shippingNote}</p>}
          {quote.couponNote ? <p className="text-cocoa">{quote.couponNote}</p> : null}
          <p className="pt-2 text-2xl">Total <Price value={quote.totalPkr} /></p>
        </div>
      ) : null}
      <div className="mt-6">
          <Button
            disabled={!quote || busy}
            onClick={() => {
              if (!quote) return;
              setBusy(true);
              placeOrder({
                data: {
                  lines: lines.map((line) => line.input),
                  coupon,
                  paymentMethod: "cod",
                  email: form.email,
                  requestId,
                  address: { ...form, save: Boolean(user) && form.save },
                },
              })
                .then((result) => {
                  if (result.accessToken) rememberOrder(result.orderId, result.accessToken);
                  clear();
                  navigate({ to: "/order/$id", params: { id: result.orderId } });
                })
                .catch((err: Error) => {
                  setError(err.message);
                  setBusy(false);
                });
            }}
          >
            Place order
          </Button>
          <p className="mt-3 text-sm text-cocoa">The courier collects the total, including Rs. {pay.shippingPkr.toLocaleString("en-PK")} for delivery.</p>
      </div>
    </main>
  );
}
