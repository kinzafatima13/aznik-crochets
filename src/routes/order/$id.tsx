import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Field, Panel, Price } from "@/components/site/ui";
import { orderPhone, orderToken, rememberOrder, rememberPhone } from "@/lib/shop/access";
import { customerStatus, paymentLabel, fulfillmentLabel, pkr, describePiece } from "@/lib/shop/format";
import { compressImage } from "@/lib/shop/images";
import { addReview, myOrder, submitProof } from "@/lib/shop/server";

export const Route = createFileRoute("/order/$id")({
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Awaited<ReturnType<typeof myOrder>> | undefined>(undefined);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
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
  const delivered = order.fulfillmentStatus === "delivered";
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
      <h1 className="font-display text-5xl">{customerStatus(order)}</h1>
      <p className="mt-2 text-sm text-cocoa">{paymentLabel(order.paymentStatus)} · {fulfillmentLabel(order.fulfillmentStatus)} · {order.createdAt}</p>
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
      {!order.payOnDelivery && ["awaiting", "rejected", "verifying"].includes(order.paymentStatus) ? (
        <form
          className="mt-4 rounded-3xl bg-butter p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const file = (event.currentTarget.elements.namedItem("proof") as HTMLInputElement).files?.[0];
            if (!file) return;
            compressImage(file)
              .then((image) => submitProof({ data: { orderId: order.id, image, note, token, phone } }))
              .then(() => myOrder({ data: { id, token, phone } }))
              .then((next) => {
                setOrder(next);
                toast.success("Receipt sent for verification. This does not mean it is paid.");
              })
              .catch((err: Error) => toast.error(err.message));
          }}
        >
          <p className="font-medium">Upload payment proof</p>
          <p className="text-sm text-cocoa">A screenshot is a claim. The order stays under verification until the shop confirms the money arrived. Production does not start before that.</p>
          <input name="proof" type="file" accept="image/*" required className="mt-3 block" />
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reference number, if you have one" className="mt-2 min-h-11 w-full rounded-2xl border border-line bg-paper px-3" />
          <Button type="submit" className="mt-3">Submit for verification</Button>
        </form>
      ) : null}
      {order.proofs.length ? (
        <ul className="mt-4 text-sm text-cocoa">
          {order.proofs.map((proof) => <li key={proof.id}>{proof.created_at}: {proof.status} {proof.admin_note ? `— ${proof.admin_note}` : ""}</li>)}
        </ul>
      ) : null}
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
