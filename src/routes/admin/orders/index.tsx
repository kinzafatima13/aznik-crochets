import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Price } from "@/components/site/ui";
import { fulfillmentLabel, paymentLabel } from "@/lib/shop/format";
import { adminOrders, exportOrders, quickFulfillment } from "@/lib/shop/server";

export const Route = createFileRoute("/admin/orders/")({
  validateSearch: (search: Record<string, unknown>): { q: string } => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
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

type Tab = "all" | "open" | "unfulfilled" | "unpaid";

function OrdersPage() {
  const { q: initialQuery } = Route.useSearch();
  const [filters, setFilters] = useState({ ...emptyFilters, q: initialQuery, sort: "newest" as "newest" | "oldest" | "value" });
  const [rows, setRows] = useState<Awaited<ReturnType<typeof adminOrders>>>([]);
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

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
        setMessage(`Downloaded ${file.filename} · ${file.orders} orders, ${file.rows} rows.`);
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setExporting(""));
  }

  const visible = useMemo(() => rows.filter((order) => {
    if (tab === "open") return !["delivered", "cancelled"].includes(order.fulfillmentStatus);
    if (tab === "unfulfilled") return !["shipped", "delivered", "cancelled"].includes(order.fulfillmentStatus);
    if (tab === "unpaid") return ["awaiting", "verifying", "rejected", "refund_requested"].includes(order.paymentStatus);
    return true;
  }), [rows, tab]);

  const allPicked = visible.length > 0 && visible.every((order) => picked.includes(order.id));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[1.35rem] font-semibold tracking-tight">Orders</h1>
      </div>
      <button type="button" className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#2c6ecb]" disabled={exporting !== ""} onClick={() => download("items", "filtered")}>
        <Download className="size-4" />
        {exporting ? "Exporting…" : "Export"}
      </button>
      {message ? <p className="mt-2 text-sm text-[#6d7175]">{message}</p> : null}
      <section className="mt-4 overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-[0_1px_0_rgba(0,0,0,0.05)]">
        <div className="flex gap-5 border-b border-[#e3e3e3] px-4">
          {([
            ["all", "All"],
            ["open", "Open"],
            ["unfulfilled", "Unfulfilled"],
            ["unpaid", "Unpaid"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`-mb-px border-b-2 py-3 text-sm ${tab === id ? "border-[#202223] font-medium" : "border-transparent text-[#6d7175]"}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e3e3e3] px-3 py-3">
          <button type="button" className="h-9 rounded-lg border border-[#c9cccf] bg-white px-3 text-sm" onClick={() => setFiltersOpen((open) => !open)}>
            Filter orders
          </button>
          <label className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-[#6d7175]" />
            <input
              value={filters.q}
              placeholder="Search orders"
              className="h-9 w-full rounded-lg border border-[#c9cccf] pr-3 pl-9 text-sm outline-none focus:border-[#2c6ecb]"
              onChange={(event) => setFilters({ ...filters, q: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") load();
              }}
            />
          </label>
        </div>
        {filtersOpen ? (
          <div className="grid gap-2 border-b border-[#e3e3e3] bg-[#fafafa] p-3 sm:grid-cols-3">
            <select value={filters.payment} onChange={(event) => setFilters({ ...filters, payment: event.target.value })} className="h-9 rounded-lg border border-[#c9cccf] bg-white px-2 text-sm">
              <option value="">Any payment</option>
              <option value="awaiting">Awaiting payment</option>
              <option value="verifying">Awaiting verification</option>
              <option value="paid">Paid</option>
              <option value="rejected">Not confirmed</option>
              <option value="refunded">Refunded</option>
            </select>
            <select value={filters.fulfillment} onChange={(event) => setFilters({ ...filters, fulfillment: event.target.value })} className="h-9 rounded-lg border border-[#c9cccf] bg-white px-2 text-sm">
              <option value="">Any fulfillment</option>
              <option value="awaiting_payment">Awaiting payment</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_production">In production</option>
              <option value="ready_to_ship">Ready to ship</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={filters.kind} onChange={(event) => setFilters({ ...filters, kind: event.target.value })} className="h-9 rounded-lg border border-[#c9cccf] bg-white px-2 text-sm">
              <option value="">Any product type</option>
              <option value="ready">Ready-made</option>
              <option value="custom">Custom</option>
              <option value="mystery">Mystery</option>
              <option value="quote">Quoted</option>
              <option value="mixed">Mixed</option>
            </select>
            <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className="h-9 rounded-lg border border-[#c9cccf] bg-white px-2 text-sm" />
            <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className="h-9 rounded-lg border border-[#c9cccf] bg-white px-2 text-sm" />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="h-9 rounded-lg bg-[#202223] px-3 text-sm text-white" onClick={() => load()}>Apply</button>
              <button type="button" className="h-9 rounded-lg border border-[#c9cccf] bg-white px-3 text-sm" onClick={() => download("summary", "all")}>Summary, all</button>
              <button type="button" className="h-9 rounded-lg border border-[#c9cccf] bg-white px-3 text-sm" onClick={() => download("summary", "filtered")}>Summary, filtered</button>
              <button type="button" className="h-9 rounded-lg border border-[#c9cccf] bg-white px-3 text-sm" onClick={() => download("items", "all")}>Items, all</button>
            </div>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-[#e3e3e3] text-[#6d7175]">
              <tr>
                <th className="w-10 px-3 py-2 font-normal">
                  <input
                    type="checkbox"
                    checked={allPicked}
                    aria-label="Select visible orders"
                    onChange={(event) => setPicked(event.target.checked ? visible.map((order) => order.id) : [])}
                  />
                </th>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">
                  <button type="button" onClick={() => {
                    const sort = filters.sort === "newest" ? "oldest" : "newest";
                    const next = { ...filters, sort } as typeof filters;
                    setFilters(next);
                    load(next);
                  }}>
                    Date {filters.sort === "oldest" ? "↑" : "↓"}
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Payment status</th>
                <th className="px-3 py-2 font-medium">Fulfillment status</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr key={order.id} className="border-b border-[#f1f1f1] hover:bg-[#f7f7f7]">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={picked.includes(order.id)}
                      aria-label={`Select ${order.id}`}
                      onChange={(event) => setPicked(event.target.checked ? [...picked, order.id] : picked.filter((id) => id !== order.id))}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Link to="/admin/orders/$id" params={{ id: order.id }} className="font-medium text-[#2c6ecb]">{order.id}</Link>
                    <p className="text-xs text-[#6d7175]">{order.paymentMethod === "cod" ? "Cash on delivery" : order.paymentMethod} · {order.kind}</p>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{order.createdAt}</td>
                  <td className="px-3 py-3">
                    <p>{order.customerName || "—"}</p>
                    <p className="text-xs text-[#6d7175]">{order.customerPhone}</p>
                  </td>
                  <td className="px-3 py-3"><Pill kind="pay" status={order.paymentStatus} /></td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <Pill kind="ship" status={order.fulfillmentStatus} />
                      <select
                        value={order.fulfillmentStatus}
                        aria-label={`Status for ${order.id}`}
                        className="h-8 rounded-md border border-[#c9cccf] bg-white px-1 text-xs"
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
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums"><Price value={order.totalPkr} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 ? <p className="px-4 py-10 text-center text-sm text-[#6d7175]">No orders match.</p> : null}
      </section>
    </div>
  );
}

function Pill({ kind, status }: { kind: "pay" | "ship"; status: string }) {
  const label = kind === "pay" ? paymentLabel(status) : fulfillmentLabel(status);
  let tone = "bg-[#e4e5e7] text-[#202223]";
  if (kind === "pay" && (status === "awaiting" || status === "verifying")) tone = "bg-[#ffb800] text-[#3d2800]";
  if (kind === "pay" && status === "rejected") tone = "bg-[#fed3d1] text-[#8e1f0b]";
  if (kind === "ship" && !["shipped", "delivered", "cancelled"].includes(status)) tone = "bg-[#ffd79d] text-[#5e4200]";
  if (kind === "ship" && (status === "shipped" || status === "delivered")) tone = "bg-[#cdfee1] text-[#0c5132]";
  return <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>;
}
