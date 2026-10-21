import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Panel, Price } from "@/components/site/ui";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { customerStatus, paymentLabel } from "@/lib/shop/format";
import { adminSession, myInquiries, myNotes, myOrders } from "@/lib/shop/server";

export const Route = createFileRoute("/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user, isPending } = useCurrentUserState();
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof myOrders>>>([]);
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof myNotes>>>([]);
  const [inquiries, setInquiries] = useState<Awaited<ReturnType<typeof myInquiries>>>([]);
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!user) return;
    myOrders().then(setOrders).catch(() => setOrders([]));
    myNotes().then(setNotes).catch(() => setNotes([]));
    myInquiries().then(setInquiries).catch(() => setInquiries([]));
    adminSession().then((session) => setAdmin(session.isAdmin)).catch(() => setAdmin(false));
  }, [user?.id]);
  if (isPending) return <main className="min-h-[40vh]" />;
  if (!user) return <RedirectToSignIn />;
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-5xl">Hello{user.displayName ? `, ${user.displayName}` : ""}</h1>
      <p className="text-cocoa">{user.primaryEmail}</p>
      {admin ? <Link to="/admin" className="mt-4 inline-block"><Button variant="sage">Open the shop desk</Button></Link> : <Link to="/admin" className="mt-4 inline-block text-sm text-berry">Claim or open the shop desk</Link>}
      <h2 className="mt-8 font-display text-3xl">Orders</h2>
      <div className="mt-3 space-y-3">
        {orders.length === 0 ? <p className="text-cocoa">No orders yet.</p> : orders.map((order) => (
          <Link key={order.id} to="/order/$id" params={{ id: order.id }} className="block rounded-3xl bg-paper p-4">
            <span className="font-medium">{order.id}</span>
            <span className="mt-1 block text-sm text-cocoa">{customerStatus({ paymentStatus: order.payment_status, fulfillmentStatus: order.fulfillment_status })} · {order.created_at}</span>
            <Price value={Number(order.total_pkr)} />
          </Link>
        ))}
      </div>
      <h2 className="mt-8 font-display text-3xl">Quotations</h2>
      <div className="mt-3 space-y-3">
        {inquiries.length === 0 ? <p className="text-cocoa">No design requests. <Link to="/quote" className="text-berry">Ask for one</Link></p> : inquiries.map((inquiry) => (
          <Panel key={String(inquiry.id)}>
            <p className="font-medium">{String(inquiry.product_type)}</p>
            <p className="text-sm text-cocoa">{String(inquiry.status)} {inquiry.quote_pkr ? `· Rs. ${inquiry.quote_pkr}` : ""}</p>
            {inquiry.status === "quoted" ? <Link to="/quote" className="text-sm text-berry">Review the quotation</Link> : null}
            {inquiry.order_id ? <Link to="/order/$id" params={{ id: String(inquiry.order_id) }} className="block text-sm text-berry">Open order</Link> : null}
          </Panel>
        ))}
      </div>
      <h2 className="mt-8 font-display text-3xl">Notes from the shop</h2>
      <div className="mt-3 space-y-3">
        {notes.length === 0 ? <p className="text-cocoa">Updates will collect here. Email delivery is not connected yet.</p> : notes.map((note) => (
          <article key={note.id} className="rounded-3xl bg-paper p-4">
            <p className="font-medium">{note.title}</p>
            <p className="text-sm text-cocoa">{note.body}</p>
            <p className="text-xs text-muted">{note.created_at}</p>
          </article>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted">Payment label reference stays separate from making. {paymentLabel("verifying")} is not the same as paid.</p>
    </main>
  );
}
