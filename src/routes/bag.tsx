import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Empty, Price } from "@/components/site/ui";
import { rehydrateCart, useCart } from "@/lib/shop/cart";
import { quoteCart } from "@/lib/shop/server";
import { blankShopSearch } from "@/lib/shop/search";
import { lineQty } from "@/lib/shop/types";
import type { Quote } from "@/lib/shop/types";

export const Route = createFileRoute("/bag")({
  component: BagPage,
});

function BagPage() {
  const lines = useCart((state) => state.lines);
  const setQty = useCart((state) => state.setQty);
  const remove = useCart((state) => state.remove);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    rehydrateCart();
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || lines.length === 0) {
      setQuote(null);
      return;
    }
    quoteCart({
      data: {
        lines: lines.map((line) => line.input),
        coupon: "",
        paymentMethod: "bank",
      },
    })
      .then((next) => {
        setQuote(next);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, [lines, ready]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-5xl">Your bag</h1>
      {!ready || lines.length === 0 ? (
        <div className="mt-6">
          <Empty title="The bag is light" body="Shop a ready piece, design one, or pick a mystery." />
          <Link to="/shop" search={blankShopSearch} className="mt-4 inline-block"><Button>Shop handmade</Button></Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {lines.map((line, index) => (
            <article key={line.key} className="flex gap-4 rounded-3xl bg-paper p-3">
              {quote?.lines[index]?.image || line.image ? (
                <img src={quote?.lines[index]?.image || line.image} alt="" className="h-24 w-24 rounded-2xl object-cover" />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-blush px-2 text-center text-xs text-cocoa">
                  {line.input.kind === "custom" ? "No concept image" : "No photo"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl">{line.title}</p>
                <p className="text-sm text-cocoa">{quote?.lines[index]?.detail || line.detail}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" className="min-h-11 min-w-11 rounded-full border border-line" onClick={() => setQty(line.key, lineQty(line.input) - 1)}>-</button>
                  <span>{lineQty(line.input)}</span>
                  <button type="button" className="min-h-11 min-w-11 rounded-full border border-line" onClick={() => setQty(line.key, lineQty(line.input) + 1)}>+</button>
                  <button type="button" className="ml-auto text-sm text-berry" onClick={() => remove(line.key)}>Remove</button>
                </div>
              </div>
              <Price value={quote?.lines[index]?.linePkr ?? 0} />
            </article>
          ))}
          {error ? <p className="text-berry">{error}</p> : null}
          {quote ? (
            <div className="rounded-3xl bg-blush p-5 text-sm">
              <Row label="Pieces" value={quote.subtotalPkr} />
              <Row label="Delivery" value={quote.shippingPkr} />
              {quote.lines.some((line) => line.mystery) ? (
                <p className="mt-2 text-sage-deep">
                  {quote.freeMysteryDelivery
                    ? "Free delivery is included because this is an eligible mystery gift paid in advance. It does not apply if you add other products. The order is not marked paid until the shop verifies the transfer."
                    : quote.shippingNote}
                </p>
              ) : quote.shippingDiscountPkr > 0 ? <p className="text-sage-deep">Free delivery with prepaid mystery gifts · {quote.shippingNote}</p> : <p className="text-cocoa">{quote.shippingNote}</p>}
              <p className="mt-2 text-xl">Estimated total <Price value={quote.totalPkr} /></p>
              <p className="text-cocoa">Final total is confirmed at checkout with your payment method. Prices come from the shop, not this page.</p>
            </div>
          ) : null}
          <Link to="/checkout"><Button>Checkout</Button></Link>
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return <p className="flex justify-between"><span>{label}</span><Price value={value} /></p>;
}
