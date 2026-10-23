import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Price, ProductCard } from "@/components/site/ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useCart } from "@/lib/shop/cart";
import { pkr } from "@/lib/shop/format";
import { getProduct, toggleWish, submitPublicReview } from "@/lib/shop/server";

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
  const [requestCustomColor, setRequestCustomColor] = useState(false);
  const [customColorName, setCustomColorName] = useState("");
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
        {!tier ? (
          <div className="mt-5">
            <p className="mb-2 text-sm text-cocoa">Choose a colour</p>
            {product.colors.length ? (
            <div className="flex flex-wrap gap-2">
              {product.colors.map((swatch) => (
                <button key={swatch.name} type="button" onClick={() => { setColor(swatch.name); setRequestCustomColor(false); }} aria-pressed={!requestCustomColor && color === swatch.name} className={`min-h-11 rounded-full border px-3 ${!requestCustomColor && color === swatch.name ? "border-berry bg-blush" : "border-line bg-paper"}`}>
                  <span className="mr-2 inline-block h-3 w-3 rounded-full border border-line" style={{ background: swatch.hex }} />
                  {swatch.name}
                </button>
              ))}
            </div>
            ) : (
              <p className="text-sm text-cocoa">No colour options are listed for this piece yet. Please ask us about available yarn colours before ordering.</p>
            )}
          </div>
        ) : null}
        {!tier ? (
          <div className="mt-3 rounded-2xl border border-line p-3">
            <button type="button" aria-pressed={requestCustomColor} onClick={() => {
              setRequestCustomColor((current) => {
                const next = !current;
                if (next) setColor("");
                else setColor(product.colors[0]?.name ?? "");
                return next;
              });
            }} className={`min-h-11 rounded-full border px-4 text-sm ${requestCustomColor ? "border-berry bg-blush" : "border-line bg-paper"}`}>
              {requestCustomColor ? "✓ Request a different colour" : "Want another colour? Request one"}
            </button>
            {requestCustomColor ? (
              <label className="mt-3 block text-sm">
                Which colour?
                <input value={customColorName} onChange={(event) => setCustomColorName(event.target.value.slice(0, 40))} maxLength={40} placeholder="e.g. navy blue, mustard, lavender" className="mt-1 min-h-11 w-full rounded-xl border border-line bg-paper px-3" />
              </label>
            ) : null}
          </div>
        ) : null}
        {tier ? (
          <div className="mt-5 space-y-3">
            <Chooser label="Colour family" options={tier.colorFamilies} value={colorFamily} onChange={setColorFamily} />
            <Chooser label="Style" options={tier.styles} value={style} onChange={setStyle} />
            <label className="text-sm">Recipient (optional)
              <input value={recipient} onChange={(event) => setRecipient(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-paper px-3" />
            </label>
            <label className="text-sm">Preferences
              <input value={preferences} onChange={(event) => setPreferences(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-paper px-3" />
            </label>
            <label className="text-sm">Gift note
              <input value={giftNote} onChange={(event) => setGiftNote(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-paper px-3" />
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
        <p className="mt-4 mb-2 text-sm text-cocoa">Choose a size</p>
        {product.sizes.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {product.sizes.map((option) => (
            <button key={option} type="button" onClick={() => setSize(option)} className={`min-h-11 rounded-full border px-4 ${size === option ? "border-berry bg-blush" : "border-line bg-paper"}`}>{option}</button>
          ))}
        </div>
        ) : (
          <p className="text-sm text-cocoa">No size options are listed for this piece yet. We’ll confirm the best fit with you if needed.</p>
        )}
        <p className="mt-4 text-sm text-cocoa">
          {product.trackStock ? `${product.stock} in stock` : "Made after your order"} · about {product.productionDays} days on the hook · {product.shippingNote}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            disabled={soldOut}
            onClick={() => {
              if (soldOut) return;
              const chosenColor = requestCustomColor ? customColorName.trim() : color;
              if (requestCustomColor && !chosenColor) {
                toast.error("Tell us which colour you would like.");
                return;
              }
              add({
                key: `ready:${product.id}:${requestCustomColor ? `custom-${chosenColor}` : color}:${size}`,
                title: product.name,
                detail: [...(requestCustomColor ? [`Custom colour requested: ${chosenColor}`] : [color]), size].filter(Boolean).join(" · "),
                image: product.image,
                input: { kind: "ready", productId: product.id, qty: 1, color: chosenColor, size, customColorRequest: requestCustomColor },
              });
              toast.success(requestCustomColor ? "Colour request added. We’ll confirm availability before making it." : "Tucked into your bag");
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
          <a
            href={`https://wa.me/92319558199?text=${encodeURIComponent(`Hi! I would like to order the ${product.name}${color ? ` in ${color}` : ""}${size ? ` size ${size}` : ""}. Can you help?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-paper px-5 text-sm font-medium text-ink hover:border-berry"
          >
            Order on WhatsApp
          </a>
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
      <section className="lg:col-span-2 mt-12 border-t border-line pt-8">
        <h2 className="font-display text-3xl">Reviews</h2>
        {data.reviews?.length ? (
          <div className="mt-4 space-y-4">
            {data.reviews.map((review: { rating: number; body: string; author_name: string; image?: string }, idx: number) => (
              <div key={idx} className="rounded-2xl border border-line bg-paper p-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-berry">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                  <span className="text-cocoa">{review.author_name}</span>
                </div>
                <p className="mt-2 text-ink">{review.body}</p>
                {review.image ? <img src={review.image} alt="" className="mt-2 h-32 rounded-xl object-cover" /> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-cocoa">No reviews yet. Be the first to share how it looks on you.</p>
        )}
        <form
          className="mt-6 grid gap-3 max-w-xl"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const rating = Number((form.elements.namedItem("rating") as HTMLSelectElement).value);
            const body = (form.elements.namedItem("body") as HTMLTextAreaElement).value.trim();
            const authorName = (form.elements.namedItem("authorName") as HTMLInputElement).value.trim();
            const file = (form.elements.namedItem("photo") as HTMLInputElement).files?.[0];
            if (body.length < 4 || !authorName) {
              toast.error("Please add your name and a short review.");
              return;
            }
            const submit = (image = "") => {
              submitPublicReview({ data: { productId: product.id, rating, body, authorName, image } })
                .then(() => {
                  toast.success("Thank you — your review is live.");
                  form.reset();
                  window.location.reload();
                })
                .catch((error: Error) => toast.error(error.message));
            };
            if (file) {
              const reader = new FileReader();
              reader.onload = () => submit(String(reader.result || ""));
              reader.readAsDataURL(file);
            } else {
              submit();
            }
          }}
        >
          <p className="text-sm font-medium">Write a review</p>
          <label className="text-sm">Your name
            <input name="authorName" required maxLength={60} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-paper px-3" />
          </label>
          <label className="text-sm">Rating
            <select name="rating" defaultValue="5" className="mt-1 min-h-11 w-full rounded-xl border border-line bg-paper px-3">
              <option value="5">5 ★ Excellent</option>
              <option value="4">4 ★ Great</option>
              <option value="3">3 ★ Good</option>
              <option value="2">2 ★ Okay</option>
              <option value="1">1 ★ Not for me</option>
            </select>
          </label>
          <label className="text-sm">Your review
            <textarea name="body" required minLength={4} maxLength={800} rows={3} className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2" placeholder="How did it look? Would you order again?" />
          </label>
          <label className="text-sm">Photo (optional)
            <input name="photo" type="file" accept="image/*" className="mt-1 block" />
          </label>
          <Button type="submit">Share review</Button>
        </form>
      </section>

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
