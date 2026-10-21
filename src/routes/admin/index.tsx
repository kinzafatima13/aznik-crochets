import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Inbox, Package, RefreshCw, ShoppingBag, Wallet } from "lucide-react";
import { Price } from "@/components/site/ui";
import { pkr } from "@/lib/shop/format";
import { adminOverview } from "@/lib/shop/server";

export const Route = createFileRoute("/admin/")({
  component: Overview,
});

type OverviewData = Awaited<ReturnType<typeof adminOverview>>;

function Overview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError("");
    adminOverview()
      .then((result) => { if (active) setData(result); })
      .catch((err: Error) => { if (active) setError(err.message || "We couldn't load the shop desk."); });
    return () => { active = false; };
  }, [refreshKey]);

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <section className="rounded-3xl border border-line bg-paper p-6 sm:p-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-berry">Shop desk</p>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl">We couldn’t open your overview.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-cocoa">{error}</p>
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-berry px-5 text-sm font-medium text-paper transition hover:-translate-y-0.5 hover:bg-berry-deep">
            <RefreshCw className="size-4" /> Try again
          </button>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12" aria-busy="true" aria-label="Loading shop overview">
        <div className="animate-pulse">
          <div className="h-3 w-28 rounded-full bg-blush" />
          <div className="mt-4 h-10 max-w-sm rounded-xl bg-blush" />
          <div className="mt-3 h-4 max-w-md rounded-full bg-line/70" />
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 rounded-3xl bg-paper" />)}
          </div>
        </div>
        <p className="sr-only" role="status">Loading your shop overview…</p>
      </main>
    );
  }

  const moneyStats = [
    ["Net from verified payments", pkr(data.net)],
    ["Gross sales", pkr(data.gross)],
    ["Discounts", pkr(data.discounts)],
    ["Delivery collected", pkr(data.delivery)],
    ["Refunds recorded", pkr(data.refunds)],
  ];
  const orderStats = [
    ["All orders", data.orders],
    ["Paid", data.paid],
    ["Pending payment", data.pending],
    ["In production", data.production],
    ["Ready to ship", data.ready],
    ["Paid mystery orders", data.mystery],
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-berry px-6 py-7 text-paper sm:px-9 sm:py-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full border border-paper/15" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-1 -top-3 size-36 rounded-full border border-paper/15" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-paper/70">Aznik Crochets · Owner desk</p>
            <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">A little overview.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-paper/80">Orders, payments and stock — all together, so you can spend more time making.</p>
          </div>
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-paper/30 px-4 text-sm transition hover:bg-paper/10 sm:self-auto">
            <RefreshCw className="size-4" /> Refresh overview
          </button>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="money-heading">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-blush text-berry"><Wallet className="size-5" /></span>
          <div>
            <h2 id="money-heading" className="font-display text-2xl">Money at a glance</h2>
            <p className="text-xs text-cocoa">Revenue counts verified payments only.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {moneyStats.map(([label, value], index) => (
            <article key={label} className={`rounded-3xl border border-line/70 bg-paper p-4 transition duration-200 hover:-translate-y-1 hover:shadow-soft sm:p-5 ${index === 0 ? "sm:col-span-2 lg:col-span-1" : ""}`}>
              <p className="text-xs leading-5 text-cocoa">{label}</p>
              <p className="mt-2 break-words text-xl font-medium tabular-nums text-ink">{value}</p>
              {index === 0 ? <p className="mt-2 text-[11px] text-muted">After recorded refunds</p> : null}
            </article>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">Uploaded payment screenshots are not counted as verified revenue.</p>
      </section>

      <section className="mt-9" aria-labelledby="orders-heading">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-lilac text-berry"><ShoppingBag className="size-5" /></span>
          <div>
            <h2 id="orders-heading" className="font-display text-2xl">Order pulse</h2>
            <p className="text-xs text-cocoa">See what needs attention next.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {orderStats.map(([label, value]) => (
            <article key={label} className="rounded-3xl border border-line/70 bg-paper p-4 transition duration-200 hover:-translate-y-1 hover:shadow-soft">
              <p className="text-xs leading-5 text-cocoa">{label}</p>
              <p className="mt-2 font-display text-3xl tabular-nums text-ink">{value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-3xl border border-line/70 bg-paper p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-ivory text-berry"><Package className="size-5" /></span>
              <div>
                <h2 className="font-display text-2xl">Recent orders</h2>
                <p className="text-xs text-cocoa">Your latest customer activity</p>
              </div>
            </div>
            <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm font-medium text-berry transition hover:gap-2">View all <ArrowUpRight className="size-4" /></Link>
          </div>
          {data.recent.length ? (
            <ul className="mt-5 divide-y divide-line">
              {data.recent.map((order) => (
                <li key={order.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link to="/admin/orders/$id" params={{ id: order.id }} className="font-medium text-berry underline-offset-4 hover:underline">{order.id}</Link>
                    <p className="mt-1 truncate text-sm text-cocoa">{order.customer_name}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1">
                    <Price value={Number(order.total_pkr)} className="font-medium text-ink" />
                    <span className="rounded-full bg-ivory px-3 py-1 text-xs text-cocoa">{order.payment_status}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-line px-5 py-8 text-center">
              <ShoppingBag className="mx-auto size-6 text-muted" />
              <p className="mt-3 font-display text-xl">No orders just yet</p>
              <p className="mt-1 text-sm text-cocoa">New customer orders will show up here.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-line/70 bg-paper p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-blush text-berry"><Package className="size-5" /></span>
              <div>
                <h2 className="font-display text-2xl">Low stock</h2>
                <p className="text-xs text-cocoa">Items to keep an eye on</p>
              </div>
            </div>
            {data.low.length ? (
              <ul className="mt-4 space-y-3">
                {data.low.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-3 rounded-2xl bg-ivory/80 px-3 py-3">
                    <span className="min-w-0 truncate text-sm text-ink">{product.name}</span>
                    <span className="shrink-0 rounded-full bg-blush px-3 py-1 text-xs font-medium text-berry">{product.stock} left</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-4 rounded-2xl bg-ivory/80 p-4 text-sm text-cocoa">No low-stock alerts right now.</p>}
          </section>

          <section className="rounded-3xl border border-line/70 bg-paper p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-lilac text-berry"><Inbox className="size-5" /></span>
              <div>
                <h2 className="font-display text-2xl">Inbox</h2>
                <p className="text-xs text-cocoa">{data.openInquiries} open request{data.openInquiries === 1 ? "" : "s"}</p>
              </div>
            </div>
            {data.notes.length ? (
              <ul className="mt-4 space-y-3">
                {data.notes.map((note) => (
                  <li key={note.id} className="rounded-2xl bg-ivory/80 p-4">
                    <p className="text-sm font-medium text-ink">{note.title}</p>
                    <p className="mt-1 text-sm leading-5 text-cocoa">{note.body}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-4 rounded-2xl bg-ivory/80 p-4 text-sm text-cocoa">Your inbox is clear for now.</p>}
          </section>
        </div>
      </section>
    </main>
  );
}
