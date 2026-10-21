import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Field, Panel, Price } from "@/components/site/ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { rememberOrder } from "@/lib/shop/access";
import { rehydrateCart, useCart } from "@/lib/shop/cart";
import { getPayInfo, placeOrder, quoteCart } from "@/lib/shop/server";
import { blankShopSearch } from "@/lib/shop/search";
import type { PayMethod, Quote } from "@/lib/shop/types";

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
  const [method, setMethod] = useState<PayMethod>("bank");
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
    quoteCart({ data: { lines: lines.map((line) => line.input), coupon, paymentMethod: method } })
      .then((next) => {
        setQuote(next);
        setError("");
        if (!next.codAllowed && method === "cod") setMethod("bank");
      })
      .catch((err: Error) => {
        setQuote(null);
        setError(err.message);
      });
  }, [lines, coupon, method, ready]);

  const instructions =
    method === "cod"
      ? `Pay the courier Rs. ${pay.shippingPkr.toLocaleString("en-PK")} when the ready-made parcel arrives. Custom, made-to-order, and mystery pieces cannot use cash on delivery. They are paid in full before they are made.`
      : method === "bank"
        ? pay.bank
        : method === "easypaisa"
          ? pay.easypaisa
          : pay.jazzcash;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-5xl">Checkout</h1>
      <p className="mt-2 text-cocoa">No account is needed. You will see the exact total before the order is placed. Keep your order reference and phone number to check the status. Custom pieces stay unmade until payment is verified.</p>
      {!pay.paymentsConfigured ? (
        <p className="mt-4 rounded-3xl bg-butter p-4 text-sm">Manual payment details are still sample placeholders. Do not send real money until the shop owner replaces them in settings. Uploading a screenshot does not mark an order paid.</p>
      ) : null}
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
        {(["bank", "easypaisa", "jazzcash"] as const).map((option) => (
          <label key={option} className="flex min-h-11 items-center gap-3 rounded-2xl bg-paper px-3">
            <input type="radio" name="pay" checked={method === option} onChange={() => setMethod(option)} />
            {option === "bank" ? "Bank transfer" : option === "easypaisa" ? "Easypaisa (manual)" : "JazzCash (manual)"}
          </label>
        ))}
        <label className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 ${quote?.codAllowed ? "bg-paper" : "bg-ivory text-muted"}`}>
          <input type="radio" name="pay" disabled={!quote?.codAllowed} checked={method === "cod"} onChange={() => setMethod("cod")} />
          Cash on delivery · Rs. {pay.shippingPkr.toLocaleString("en-PK")}
          {quote?.codAllowed ? "" : " — only for in-stock ready-made pieces. Custom work is paid first."}
        </label>
        <p className="text-sm text-cocoa">Bank transfer, Easypaisa, and JazzCash include free delivery. Cash on delivery adds Rs. {pay.shippingPkr.toLocaleString("en-PK")}.</p>
      </fieldset>
      <Panel className="mt-4">
        <p className="whitespace-pre-wrap text-sm text-cocoa">{instructions}</p>
        {quote?.freeMysteryDelivery ? <p className="mt-3 text-sm text-sage-deep">Free delivery applies to this prepaid mystery gift only. It is not given to other products. The order is not treated as paid until the shop verifies the transfer.</p> : null}
      </Panel>
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
                  paymentMethod: method,
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
          <p className="mt-3 text-sm text-cocoa">
            {method === "cod"
              ? "The courier collects the total, including the delivery charge. This is only for pieces already in stock."
              : "Placing the order does not mean it is paid. Upload the receipt on the next page. Custom work is made only after payment is verified."}
          </p>
      </div>
    </main>
  );
}
