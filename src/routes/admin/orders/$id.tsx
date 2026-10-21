import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Price } from "@/components/site/ui";
import { describePiece, FULFILLMENT_OPTIONS, fulfillmentLabel, paymentLabel, pkr } from "@/lib/shop/format";
import { adminOrder, markRefund, updateOrder, verifyPayment } from "@/lib/shop/server";

export const Route = createFileRoute("/admin/orders/$id")({
  component: OrderDesk,
});

function OrderDesk() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Awaited<ReturnType<typeof adminOrder>>>(null);
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [fulfillment, setFulfillment] = useState("awaiting_payment");
  const [assignments, setAssignments] = useState<Array<{ itemId: string; secretName: string; secretNote: string; materialCostPkr: number }>>([]);
  const [message, setMessage] = useState("");

  function load() {
    adminOrder({ data: { id } })
      .then((next) => {
        setOrder(next);
        if (!next) return;
        setTracking(next.trackingNumber);
        setCarrier(next.carrier);
        setInternalNote(next.internalNote);
        setFulfillment(next.fulfillmentStatus);
        setAssignments(next.items.map((item) => ({
          itemId: item.id,
          secretName: item.secretName,
          secretNote: item.secretNote,
          materialCostPkr: item.materialCostPkr,
        })));
      })
      .catch((error: Error) => setMessage(error.message));
  }
  useEffect(load, [id]);
  if (!order) return <p>{message || "Opening the order…"}</p>;
  const verifying = order.paymentStatus === "verifying" || (order.paymentStatus === "awaiting" && !order.payOnDelivery);
  return (
    <div>
      <h1 className="font-display text-4xl">{order.id}</h1>
      <p className="text-sm text-cocoa">{paymentLabel(order.paymentStatus)} · {fulfillmentLabel(order.fulfillmentStatus)} · {order.paymentMethod}</p>
      {verifying ? <p className="mt-3 rounded-2xl bg-butter px-4 py-3 text-sm">Awaiting manual payment verification. Do not start production until this is marked paid.</p> : null}
      {message ? <p className="mt-2 text-sm text-berry">{message}</p> : null}
      <p className="mt-2">{order.customerName} · {order.customerPhone} · {order.customerEmail}</p>
      <p>{order.addressLine}, {order.addressCity}</p>
      {order.addressNotes ? <p className="text-sm text-cocoa">{order.addressNotes}</p> : null}
      <div className="mt-4 space-y-3">
        {order.items.map((item, index) => (
          <article key={item.id} className="rounded-3xl bg-paper p-4">
            <p className="font-medium">{item.title} × {item.qty} · <Price value={item.linePkr} /></p>
            <p className="text-sm text-cocoa">{item.kind} · {describePiece(item.kind, item.options)}</p>
            {textOf(item.options, "brief") ? <p className="mt-2 text-sm">Design brief: {textOf(item.options, "brief")}</p> : null}
            {textOf(item.options, "aiNotes") ? <p className="text-sm text-cocoa">Studio note: {textOf(item.options, "aiNotes")}</p> : null}
            {textOf(item.options, "conceptImage").startsWith("https://") ? (
              <figure className="mt-2">
                <img src={textOf(item.options, "conceptImage")} alt="Design concept, not the finished handmade piece" className="max-h-56 rounded-2xl" />
                <figcaption className="text-xs text-muted">Concept only. Not a guaranteed picture of the finished piece.</figcaption>
              </figure>
            ) : null}
            {item.kind === "mystery" || item.kind === "quote" ? (
              <div className="mt-2 grid gap-2">
                <input value={assignments[index]?.secretName ?? ""} onChange={(event) => setAssignments((current) => current.map((row, i) => i === index ? { ...row, secretName: event.target.value } : row))} placeholder="Private contents, hidden from the customer until delivery" className="min-h-11 rounded-2xl border border-line px-3" />
                <input value={assignments[index]?.secretNote ?? ""} onChange={(event) => setAssignments((current) => current.map((row, i) => i === index ? { ...row, secretNote: event.target.value } : row))} placeholder="Packing note" className="min-h-11 rounded-2xl border border-line px-3" />
                <input type="number" value={assignments[index]?.materialCostPkr ?? 0} onChange={(event) => setAssignments((current) => current.map((row, i) => i === index ? { ...row, materialCostPkr: Number(event.target.value) } : row))} className="min-h-11 rounded-2xl border border-line px-3" />
              </div>
            ) : null}
          </article>
        ))}
      </div>
      <p className="mt-4 text-xl">Total {pkr(order.totalPkr)} · delivery {pkr(order.shippingPkr)} · discount {pkr(order.discountPkr)}</p>
      <p className="text-sm text-cocoa">{order.shippingNote}</p>
      {order.paymentReference ? <p className="mt-2 text-sm">Payment reference: {order.paymentReference}</p> : null}
      <div className="mt-4 space-y-3">
        {order.proofs.length === 0 ? <p className="text-sm text-cocoa">No payment proof has been uploaded.</p> : null}
        {order.proofs.map((proof) => (
          <figure key={proof.id} className="rounded-3xl bg-paper p-3">
            <img src={proof.image} alt="Payment proof submitted by the customer" className="max-h-80 rounded-2xl" />
            <figcaption className="mt-2 text-sm">{proof.status} · {proof.note} {proof.adminNote ? `· ${proof.adminNote}` : ""} · {proof.createdAt}</figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        <Button onClick={() => verifyPayment({ data: { orderId: order.id, decision: "verify", note } }).then(() => { toast.success("Marked paid. Production can start."); setMessage("Payment verified."); load(); }).catch((error: Error) => { toast.error(error.message); setMessage(error.message); })}>Verify payment</Button>
        <Button variant="ghost" onClick={() => verifyPayment({ data: { orderId: order.id, decision: "reject", note } }).then(() => { toast.success("Payment rejected"); setMessage("Payment was not confirmed."); load(); }).catch((error: Error) => { toast.error(error.message); setMessage(error.message); })}>Reject proof</Button>
        <Button variant="soft" onClick={() => markRefund({ data: { orderId: order.id, status: "refund_requested" } }).then(() => { toast.success("Refund requested"); load(); }).catch((error: Error) => toast.error(error.message))}>Refund requested</Button>
        <Button variant="ghost" onClick={() => markRefund({ data: { orderId: order.id, status: "refunded" } }).then(() => { toast.success("Marked refunded"); load(); }).catch((error: Error) => toast.error(error.message))}>Mark refunded</Button>
      </div>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note to the customer if you reject the proof" className="mt-3 min-h-20 w-full rounded-2xl border border-line bg-paper p-3 print:hidden" />
      <div className="mt-4 grid gap-2 print:hidden">
        <select value={fulfillment} onChange={(event) => setFulfillment(event.target.value)} className="min-h-11 rounded-2xl border border-line bg-paper px-3">
          {FULFILLMENT_OPTIONS.map((option) => <option key={option} value={option}>{fulfillmentLabel(option)}</option>)}
        </select>
        <input value={carrier} onChange={(event) => setCarrier(event.target.value)} placeholder="Courier" className="min-h-11 rounded-2xl border border-line px-3" />
        <input value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="Tracking number" className="min-h-11 rounded-2xl border border-line px-3" />
        <textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Internal note" className="min-h-20 rounded-2xl border border-line p-3" />
        <Button onClick={() => updateOrder({
          data: {
            id: order.id,
            fulfillment: fulfillment as typeof FULFILLMENT_OPTIONS[number],
            tracking,
            carrier,
            internalNote,
            assignments,
          },
        }).then(() => { toast.success("Order updated"); setMessage("Fulfillment saved."); load(); }).catch((error: Error) => { toast.error(error.message); setMessage(error.message); })}>Save fulfillment</Button>
        <Button variant="ghost" onClick={() => window.print()}>Print packing slip</Button>
      </div>
      {order.timeline?.length ? (
        <ol className="mt-6 space-y-2 text-sm print:hidden">
          {order.timeline.map((event) => (
            <li key={event.id}><span className="text-cocoa">{event.created_at}</span> · {event.title} — {event.body}</li>
          ))}
        </ol>
      ) : null}
      <section className="mt-6 hidden print:block">
        <h2>Packing slip {order.id}</h2>
        <p>{order.customerName} · {order.customerPhone}</p>
        <p>{order.addressLine}, {order.addressCity}</p>
        {order.items.map((item) => <p key={item.id}>{item.title} × {item.qty} {item.secretName ? `· contents: ${item.secretName}` : ""} {describePiece(item.kind, item.options)}</p>)}
        <p>Total {pkr(order.totalPkr)} · {paymentLabel(order.paymentStatus)}</p>
      </section>
    </div>
  );
}

function textOf(options: unknown, key: string): string {
  if (!options || typeof options !== "object" || !(key in options)) return "";
  const value = (options as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
