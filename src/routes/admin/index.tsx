import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Price } from "@/components/site/ui";
import { pkr } from "@/lib/shop/format";
import { adminOverview } from "@/lib/shop/server";

export const Route = createFileRoute("/admin/")({
  component: Overview,
});

function Overview() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminOverview>> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminOverview().then(setData).catch((err: Error) => setError(err.message));
  }, []);
  if (error) return <p>{error}</p>;
  if (!data) return <p>Counting the till…</p>;
  const stats = [
    ["Net from verified payments", pkr(data.net)],
    ["Gross sales", pkr(data.gross)],
    ["Discounts", pkr(data.discounts)],
    ["Delivery collected", pkr(data.delivery)],
    ["Refunds recorded", pkr(data.refunds)],
    ["Orders", String(data.orders)],
    ["Paid", String(data.paid)],
    ["Pending payment", String(data.pending)],
    ["In production", String(data.production)],
    ["Ready to ship", String(data.ready)],
    ["Paid mystery orders", String(data.mystery)],
    ["Open requests", String(data.openInquiries)],
  ];
  return (
    <div>
      <h1 className="font-display text-4xl">Desk</h1>
      <p className="text-sm text-cocoa">Revenue counts only verified payments. Uploaded screenshots are not included.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <article key={label} className="rounded-3xl bg-paper p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-xl tabular-nums">{value}</p>
          </article>
        ))}
      </div>
      <h2 className="mt-8 font-display text-2xl">Recent orders</h2>
      <ul className="mt-2 space-y-2">
        {data.recent.map((order) => (
          <li key={order.id}><Link to="/admin/orders/$id" params={{ id: order.id }} className="text-berry">{order.id}</Link> · {order.customer_name} · <Price value={Number(order.total_pkr)} /> · {order.payment_status}</li>
        ))}
      </ul>
      <h2 className="mt-6 font-display text-2xl">Low stock</h2>
      <ul className="mt-2 text-sm">{data.low.map((product) => <li key={product.id}>{product.name} · {product.stock} left</li>)}</ul>
      <h2 className="mt-6 font-display text-2xl">Inbox</h2>
      <ul className="mt-2 space-y-2 text-sm">{data.notes.map((note) => <li key={note.id}><strong>{note.title}</strong> — {note.body}</li>)}</ul>
    </div>
  );
}
