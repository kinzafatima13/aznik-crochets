import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Price } from "@/components/site/ui";
import { fulfillmentLabel, paymentLabel } from "@/lib/shop/format";
import { adminOrders, exportOrders, quickFulfillment } from "@/lib/shop/server";

export const Route = createFileRoute("/admin/orders/")({
  component: OrdersPage,
});

const emptyFilters = {
  q: "",
  payment: "",
  fulfillment: "",
  kind: "",
  from: "",
  to: "",
  sort: "newest" as const,
  status: "",
};

function OrdersPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof adminOrders>>>([]);
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState("");

  function load(next = filters) {
    adminOrders({ data: next })
      .then(setRows)
      .catch((error: Error) => {
        setRows([]);
        setMessage(error.message);
      });
  }

  useEffect(() => {
    load();
    // Initial desk load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function download(mode: "summary" | "items", scope: "all" | "filtered") {
    const key = `${scope}-${mode}`;
    setExporting(key);
    setMessage("");
    exportOrders({ data: { ...filters, mode, scope } })
      .then((file) => {
        if (!file.csv) throw new Error("The export did not return a file.");
        const blob = new Blob([file.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.filename;
        link.click();
        URL.revokeObjectURL(url);
        setMessage(`Downloaded ${file.filename} · ${file.orders} orders, ${file.rows} rows. Item files list the order total only on the first row. Use the summary file for revenue.`);
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setExporting(""));
  }

  const filtersActive = Boolean(filters.q || filters.payment || filters.fulfillment || filters.kind || filters.from || filters.to);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Orders</h1>
          <p className="text-sm text-cocoa">Search by reference, name, or phone. The order total is written once per order in the summary file, and only on the first item row in the items file, so revenue is not counted twice. Exports are real orders and stay on the shop desk.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={exporting !== ""} onClick={() => download("items", filtersActive ? "filtered" : "all")}>{exporting.endsWith("items") && exporting.startsWith(filtersActive ? "filtered" : "all") ? "Exporting…" : "Export Orders CSV"}</Button>
        <Button variant="ghost" disabled={exporting !== ""} onClick={() => download("summary", "all")}>{exporting === "all-summary" ? "Exporting…" : "Order summary, all"}</Button>
        <Button variant="ghost" disabled={exporting !== ""} onClick={() => download("items", "all")}>{exporting === "all-items" ? "Exporting…" : "Order items, all"}</Button>
        <Button variant="ghost" disabled={exporting !== ""} onClick={() => download("summary", "filtered")}>{exporting === "filtered-summary" ? "Exporting…" : "Order summary, filtered"}</Button>
        <Button variant="ghost" disabled={exporting !== ""} onClick={() => download("items", "filtered")}>{exporting === "filtered-items" ? "Exporting…" : "Order items, filtered"}</Button>
      </div>
      {message ? <p className="mt-3 text-sm text-cocoa">{message}</p> : null}
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Reference, name, or phone" className="min-h-11 rounded-full border border-line bg-paper px-4" />
        <select value={filters.payment} onChange={(event) => setFilters({ ...filters, payment: event.target.value })} className="min-h-11 rounded-full border border-line bg-paper px-3">
          <option value="">Any payment</option>
          <option value="awaiting">Awaiting payment</option>
          <option value="verifying">Awaiting verification</option>
          <option value="paid">Paid</option>
          <option value="rejected">Not confirmed</option>
          <option value="refunded">Refunded</option>
        </select>
        <select value={filters.fulfillment} onChange={(event) => setFilters({ ...filters, fulfillment: event.target.value })} className="min-h-11 rounded-full border border-line bg-paper px-3">
          <option value="">Any order status</option>
          <option value="awaiting_payment">Awaiting payment</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_production">In production</option>
          <option value="ready_to_ship">Ready to ship</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={filters.kind} onChange={(event) => setFilters({ ...filters, kind: event.target.value })} className="min-h-11 rounded-full border border-line bg-paper px-3">
          <option value="">Any product type</option>
          <option value="ready">Ready-made</option>
          <option value="custom">Custom</option>
          <option value="mystery">Mystery</option>
          <option value="quote">Quoted</option>
          <option value="mixed">Mixed</option>
        </select>
        <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className="min-h-11 rounded-full border border-line bg-paper px-3" />
        <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className="min-h-11 rounded-full border border-line bg-paper px-3" />
        <select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value as typeof filters.sort })} className="min-h-11 rounded-full border border-line bg-paper px-3">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="value">Order value</option>
        </select>
        <Button onClick={() => load()}>Apply filters</Button>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {rows.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-48 flex-1">
              <Link to="/admin/orders/$id" params={{ id: order.id }} className="font-medium text-berry">{order.id}</Link>
              <p className="text-sm text-cocoa">{order.customerName} · {order.customerPhone}</p>
              <p className="text-xs text-muted">{order.createdAt} · {order.paymentMethod} · {order.kind}</p>
            </div>
            <Status payment={order.paymentStatus} fulfillment={order.fulfillmentStatus} />
            <Price value={order.totalPkr} />
            <select
              value={order.fulfillmentStatus}
              aria-label={`Status for ${order.id}`}
              className="min-h-11 rounded-full border border-line bg-paper px-3"
              onChange={(event) => {
                const fulfillment = event.target.value as "awaiting_payment" | "confirmed" | "in_production" | "quality_check" | "ready_to_ship" | "shipped" | "delivered" | "cancelled";
                quickFulfillment({ data: { id: order.id, fulfillment } })
                  .then(() => {
                    toast.success(`${order.id} is now ${fulfillmentLabel(fulfillment)}.`);
                    load();
                  })
                  .catch((error: Error) => toast.error(error.message));
              }}
            >
              {["awaiting_payment", "confirmed", "in_production", "quality_check", "ready_to_ship", "shipped", "delivered", "cancelled"].map((status) => (
                <option key={status} value={status}>{fulfillmentLabel(status)}</option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="mt-6 text-cocoa">No orders match these filters.</p> : null}
    </div>
  );
}

function Status({ payment, fulfillment }: { payment: string; fulfillment: string }) {
  const verifying = payment === "verifying";
  const tone = verifying ? "bg-butter" : payment === "paid" ? "bg-blush" : payment === "rejected" ? "bg-paper text-berry" : "bg-paper";
  return (
    <div className="flex flex-col gap-1">
      <span className={`rounded-full px-3 py-1 text-xs ${tone}`}>{verifying ? "Awaiting verification" : paymentLabel(payment)}</span>
      <span className="rounded-full bg-paper px-3 py-1 text-xs text-cocoa">{fulfillmentLabel(fulfillment)}</span>
    </div>
  );
}
