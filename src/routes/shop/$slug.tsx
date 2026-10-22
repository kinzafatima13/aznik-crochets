import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Price, ProductCard } from "@/components/site/ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useCart } from "@/lib/shop/cart";
import { pkr } from "@/lib/shop/format";
import { getProduct, toggleWish } from "@/lib/shop/server";

export const Route = createFileRoute("/shop/$slug")({
  loader: ({ params }) => getProduct({ data: { id: params.slug } }),
  component: ProductPage,
});

function ProductPage() {
  const data = Route.useLoaderData();
  const add = useCart((state) => state.add);
  const { user } = useCurrentUserState();
  const [color, setColor] = useState(data?.product.colors[0]?.name ?? "");
  const [size, setSize] = useState(data?.product.sizes[0] ?? "");
  const [image, setImage] = useState(data?.product.image ?? "");
  const initialTier = data?.product.mystery ? data.product.tier : null;
  const [colorFamily, setColorFamily] = useState(initialTier?.colorFamilies[0] ?? "");
  const [style, setStyle] = useState(initialTier?.styles[0] ?? "");
  const [recipient, setRecipient] = useState("");
  const [preferences, setPreferences] = useState("");
  const [giftNote, setGiftNote] = useState("");
  if (!data) {
    return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="font-display text-4xl">This piece has left the shelf.</h1></main>;
  }
  const { product, related } = data;
  const tier = product.mystery && product.tier ? product.tier : null;
  const soldOut = product.trackStock && product.stock < 1;
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2">
      <div>
        <img src={image || product.image} alt={product.name} loading="eager" fetchPriority="high" decoding="async" className="aspect-square w-full rounded-3xl object-cover" />
        {product.images.length > 1 ? (
          <div className="mt-3 flex gap-2">
            {product.images.map((src) => (
              <button key={src} type="button" onClick={() => setImage(src)} className="overflow-hidden rounded-2xl">
                <img src={src} alt="" loading="lazy" decoding="async" className="h-16 w-16 object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-berry">{tier ? "Mystery gift" : product.madeToOrder ? "Made to order" : "Ready when you are"}</p>
        <h1 className="mt-2 font-display text-5xl">{product.name}</h1>
        <p className="mt-3 text-2xl"><Price value={product.pricePkr} /></p>
        <p className="mt-4 text-cocoa">{product.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {tier ? null : product.colors.map((swatch) => (
            <button key={swatch.name} type="button" onClick={() => setColor(swatch.name)} className={`min-h-11 rounded-full border px-3 ${color === swatch.name ? "border-berry bg-blush" : "border-line bg-paper"}`}>
              <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: swatch.hex }} />
              {swatch.name}
            </button>
          ))}
        </div>
        {tier ? (
          <div className="mt-5 space-y-4">
            {tier.offerOn ? (
              <p className="rounded-2xl bg-butter px-4 py-3 text-sm">Free delivery on this mystery gift when you pay in advance and the parcel contains only eligible mystery gifts. The offer is controlled in the shop settings and is not applied to other products. The order is not paid until the shop verifies the transfer.</p>
            ) : (
              <p className="rounded-2xl bg-paper px-4 py-3 text-sm">This tier does not include the free-delivery offer.</p>
            )}
            <p className="text-sm text-cocoa">Possible pieces: {tier.categories.join(", ")}. {tier.exclusions} {tier.valueNote}</p>
            <Chooser label="Colour family" options={tier.colorFamilies} value={colorFamily} onChange={setColorFamily} />
            <Chooser label="Style" options={tier.styles} value={style} onChange={setStyle} />
            <label className="block text-sm text-cocoa">Who is it for?
              <input value={recipient} onChange={(event) => setRecipient(event.target.value)} className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-paper px-3" />
            </label>
            <label className="block text-sm text-cocoa">Wishes, not a specific product
              <input value={preferences} onChange={(event) => setPreferences(event.target.value)} className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-paper px-3" />
            </label>
            <label className="block text-sm text-cocoa">Gift note
              <textarea value={giftNote} onChange={(event) => setGiftNote(event.target.value)} className="mt-1 min-h-24 w-full rounded-2xl border border-line bg-paper p-3" />
            </label>
            <Button
              disabled={soldOut}
              onClick={() => {
                add({
                  key: `mystery:${crypto.randomUUID()}`,
                  title: tier.name,
                  detail: `${colorFamily} · ${style}`,
                  image: "/photos/mystery.jpg",
                  input: { kind: "mystery", tierId: tier.id, colorFamily, style, recipient, preferences, giftNote, qty: 1 },
                });
                toast.success("Mystery added. Pay in advance. The contents stay a secret until delivery.");
              }}
            >
              {soldOut ? "Sold out" : <>Add mystery · {pkr(product.pricePkr)}</>}
            </Button>
            <p className="text-sm text-cocoa">{tier.qtyAvailable} available. Advance payment is required. Cash on delivery does not apply.</p>
          </div>
        ) : (
        <>
        <div className="mt-3 flex flex-wrap gap-2">
          {product.sizes.map((option) => (
            <button key={option} type="button" onClick={() => setSize(option)} className={`min-h-11 rounded-full border px-4 ${size === option ? "border-berry bg-blush" : "border-line bg-paper"}`}>{option}</button>
          ))}
        </div>
        <p className="mt-4 text-sm text-cocoa">
          {product.trackStock ? `${product.stock} in stock` : "Made after your order"} · about {product.productionDays} days on the hook · {product.shippingNote}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            disabled={soldOut}
            onClick={() => {
              if (soldOut) return;
              add({
                key: `ready:${product.id}:${color}:${size}`,
                title: product.name,
                detail: [color, size].filter(Boolean).join(" · "),
                image: product.image,
                input: { kind: "ready", productId: product.id, qty: 1, color, size },
              });
              toast.success("Tucked into your bag");
            }}
          >
            {soldOut ? "Sold out" : <>Add to bag · {pkr(product.pricePkr)}</>}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (!user) {
                toast.error("Sign in to keep a wishlist.");
                return;
              }
              toggleWish({ data: { productId: product.id } })
                .then((result) => toast.success(result.saved ? "Saved to your wishlist" : "Removed from your wishlist"))
                .catch((error: Error) => toast.error(error.message));
            }}
          >
            Wishlist
          </Button>
        </div>
        {product.customizable ? (
          <p className="mt-4 text-sm"><Link to="/atelier" className="text-berry">Design a custom version in the atelier</Link></p>
        ) : null}
        <div className="mt-6 space-y-2 text-sm text-cocoa">
          <p><strong className="text-ink">Care.</strong> {product.care}</p>
          <p><strong className="text-ink">Shipping.</strong> {product.shippingNote} Standard delivery is calculated at checkout in PKR.</p>
          {product.madeToOrder ? <p>This piece is paid for before it is made. Cash on delivery does not apply.</p> : null}
        </div>
        </>
        )}
      </div>
      {related.length ? (
        <section className="lg:col-span-2">
          <h2 className="font-display text-3xl">You may also love</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Chooser({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="text-sm text-cocoa">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} type="button" onClick={() => onChange(option)} className={`min-h-11 rounded-full border px-3 ${value === option ? "border-berry bg-blush" : "border-line bg-paper"}`}>{option}</button>
        ))}
      </div>
    </div>
  );
}
