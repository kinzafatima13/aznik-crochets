import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Field, Panel, Price } from "@/components/site/ui";
import { orderPhone, orderToken, rememberOrder, rememberPhone } from "@/lib/shop/access";
import { customerStatus, paymentLabel, fulfillmentLabel, pkr, describePiece } from "@/lib/shop/format";
import { addReview, myOrder } from "@/lib/shop/server";

export const Route = createFileRoute("/order/$id")({
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Awaited<ReturnType<typeof myOrder>> | undefined>(undefined);
  const [error, setError] = useState("");
  const [review, setReview] = useState("");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");

  function load(nextToken = token, nextPhone = phone) {
    myOrder({ data: { id, token: nextToken, phone: nextPhone } })
      .then((found) => {
        if (found?.accessToken) {
          rememberOrder(found.id, found.accessToken);
          setToken(found.accessToken);
        }
        setOrder(found);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    const savedToken = orderToken(id);
    const savedPhone = orderPhone(id);
    setToken(savedToken);
    setPhone(savedPhone);
    load(savedToken, savedPhone);
    // The order reference in the path is the lookup key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  if (error) return <main className="px-4 py-10">{error}</main>;
  if (order === undefined) return <main className="px-4 py-10">Looking up your order…</main>;
  if (!order) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-display text-4xl">Check this order</h1>
        <p className="mt-2 text-cocoa">Enter the phone number used at checkout for {id}. No account is required.</p>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            rememberPhone(id, phone);
            load(token, phone);
          }}
        >
          <Field label="Phone number" value={phone} onChange={(event) => setPhone(event.target.value)} required />
          <Button type="submit">Show order</Button>
        </form>
        <p className="mt-4 text-sm"><Link to="/track" className="text-berry">Look up a different reference</Link></p>
      </main>
    );
  }
  const mystery = order.items.some((item) => item.kind === "mystery");
  const custom = order.items.some((item) => item.kind === "custom");
  const delivered = order.fulfillmentStatus === "delivered";
  const thanks = order.items
    .map((item) => (item.kind === "mystery" && !delivered ? "a mystery gift" : item.title))
    .filter(Boolean);
  const thanksFor =
    thanks.length === 0 ? "your pieces" : thanks.length === 1 ? thanks[0] : `${thanks.slice(0, -1).join(", ")} and ${thanks.at(-1)}`;
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {mystery && !delivered ? (
        <Panel className="mb-6 bg-blush">
          <p className="font-display text-4xl">Your little mystery is getting ready</p>
          <p className="mt-2 text-cocoa">The gift stays wrapped. This page will not name it until it is delivered. Estimated making window: about {order.productionDays} days after payment is verified.</p>
          <img src="/photos/mystery.jpg" alt="Wrapped gift" className="mt-4 aspect-video w-full rounded-3xl object-cover" />
        </Panel>
      ) : null}
      <p className="text-xs uppercase tracking-widest text-berry">{order.id}</p>
      <h1 className="font-display text-5xl">Thank you for your order of {thanksFor}</h1>
      <p className="mt-2 text-cocoa">{customerStatus(order)}</p>
      <p className="mt-2 text-sm text-cocoa">{paymentLabel(order.paymentStatus)} · {fulfillmentLabel(order.fulfillmentStatus)} · {order.createdAt}</p>
      {order.payOnDelivery ? (
        <p className="mt-3 text-sm text-cocoa">Please keep {pkr(order.totalPkr)} ready for the courier. That includes the cash-on-delivery charge.</p>
      ) : custom ? (
        <p className="mt-3 text-sm text-cocoa">Your custom piece is not started until the shop verifies your payment.</p>
      ) : null}
      <div className="mt-6 space-y-3">
        {order.items.map((item) => (
          <article key={item.id} className="flex gap-3 rounded-3xl bg-paper p-3">
            {item.image ? (
              <img src={item.image} alt="" className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-blush px-1 text-center text-xs text-cocoa">
                {item.kind === "custom" ? "No concept" : "No photo"}
              </div>
            )}
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-cocoa">{item.kind === "mystery" && !delivered ? "The exact piece is still a secret." : describePiece(item.kind, item.options)}</p>
              {item.kind === "custom" && optionsText(item.options, "brief") ? <p className="text-sm">Brief: {optionsText(item.options, "brief")}</p> : null}
              {item.kind === "custom" && optionsText(item.options, "conceptImage").startsWith("https://") ? <p className="text-xs text-muted">A design concept was saved with this order. It is not a photo of the finished piece.</p> : null}
              {delivered && item.revealed ? <p className="text-sm">Inside: {item.revealed}</p> : null}
            </div>
            <Price value={item.linePkr} className="ml-auto" />
          </article>
        ))}
      </div>
      <Panel className="mt-4 text-sm">
        <p className="flex justify-between"><span>Subtotal</span><Price value={order.subtotalPkr} /></p>
        <p className="flex justify-between"><span>Discount</span><Price value={order.discountPkr} /></p>
        <p className="flex justify-between"><span>Delivery</span><Price value={order.shippingPkr} /></p>
        {order.shippingDiscountPkr > 0 ? <p>Prepaid mystery delivery discount {pkr(order.shippingDiscountPkr)}</p> : null}
        <p className="text-cocoa">{order.shippingNote}</p>
        <p className="mt-2 text-xl">Total <Price value={order.totalPkr} /></p>
        <p className="mt-2">{order.customerName}, {order.addressLine}, {order.addressCity}</p>
        {order.trackingNumber ? <p>Tracking {order.carrier} {order.trackingNumber}</p> : <p>Tracking appears when the parcel is handed to a courier.</p>}
      </Panel>
      {delivered ? (
        <form
          className="mt-6 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            addReview({ data: { orderId: order.id, productId: "", rating: 5, body: review } })
              .then(() => toast.success("Thank you. Your note can appear on the shop."))
              .catch((err: Error) => toast.error(err.message));
          }}
        >
          <p className="font-display text-2xl">How did it feel?</p>
          <textarea value={review} onChange={(event) => setReview(event.target.value)} className="min-h-24 w-full rounded-2xl border border-line bg-paper p-3" required />
          <Button type="submit">Share a review</Button>
        </form>
      ) : null}
    </main>
  );
}

function optionsText(options: unknown, key: string): string {
  if (!options || typeof options !== "object" || !(key in options)) return "";
  const value = (options as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
