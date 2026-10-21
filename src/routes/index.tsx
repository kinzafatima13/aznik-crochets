import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Empty, Panel, ProductCard } from "@/components/site/ui";
import { getHome, joinNewsletter } from "@/lib/shop/server";
import { blankShopSearch } from "@/lib/shop/search";

export const Route = createFileRoute("/")({
  loader: () => getHome(),
  component: Home,
});

function Home() {
  const data = Route.useLoaderData();
  const bestsellers = data.products.filter((product) => product.bestseller).slice(0, 4);
  const arrivals = data.products.filter((product) => product.isNew).slice(0, 4);
  const matching = data.products.filter((product) => product.collectionId === "strawberry-girl");
  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-2 lg:py-16">
        <div>
          <p className="text-xs uppercase tracking-widest text-berry">Little loops, lovely things</p>
          <h1 className="mt-3 font-display text-5xl leading-tight text-ink sm:text-6xl">
            Welcome to the little world of Aznik
          </h1>
          <p className="mt-4 max-w-md text-lg text-cocoa">
            Dreamy crochet creations, made with love and a little bit of magic.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/shop" search={blankShopSearch}><Button>Shop Handmade</Button></Link>
            <Link to="/atelier"><Button variant="ghost">Design Your Own</Button></Link>
          </div>
        </div>
        <img src={data.settings.heroImage} alt="A table of handmade crochet pieces and a wrapped gift" className="aspect-video w-full rounded-3xl object-cover shadow-soft" />
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <h2 className="font-display text-4xl">Shop by category</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.categories.map((category) => (
            <Link
              key={category.id}
              to={category.id === "custom" ? "/atelier" : "/shop"}
              search={category.id === "custom" ? undefined : { ...blankShopSearch, category: category.id }}
              className="overflow-hidden rounded-3xl bg-paper shadow-soft"
            >
              <img src={category.image} alt="" className="aspect-square w-full object-cover" />
              <span className="block px-3 py-3 text-sm">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl">Featured collections</h2>
          <Link to="/collections" className="text-sm text-berry">See all</Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {data.collections.filter((collection) => collection.id !== "mystery").slice(0, 6).map((collection) => (
            <Link key={collection.id} to="/collections/$slug" params={{ slug: collection.id }} className="relative overflow-hidden rounded-3xl">
              <img src={collection.image} alt="" className="aspect-[4/5] w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-ink/55 px-4 py-4 text-paper">
                <span className="block font-display text-2xl">{collection.name}</span>
                <span className="text-sm text-blush">{collection.blurb}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Shelf title="Bestsellers" products={bestsellers} />
      <Shelf title="New arrivals" products={arrivals} />

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <Panel>
          <p className="text-xs uppercase tracking-widest text-berry">The little crochet atelier</p>
          <h2 className="mt-2 font-display text-4xl">Your imagination, stitched with love.</h2>
          <p className="mt-3 max-w-2xl text-cocoa">
            Describe a piece in your own words, then choose a size, yarn, and material. The price comes from the shop’s list. Nothing is made until payment is verified.
          </p>
          <Link to="/atelier" className="mt-5 inline-block"><Button>Open the atelier</Button></Link>
        </Panel>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <h2 className="font-display text-4xl">Matching sets</h2>
        <p className="text-cocoa">Strawberry Girl, meant to be worn and gifted together.</p>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {matching.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <h2 className="font-display text-4xl">How handmade works</h2>
        <ol className="mt-6 grid gap-3 md:grid-cols-4">
          {[
            ["01", "Choose", "A ready piece, a custom design, or a mystery tier."],
            ["02", "Pay first", "Custom work and mystery gifts start only after payment is verified."],
            ["03", "On the hook", "Aznik crochets, checks, and wraps it."],
            ["04", "To your door", "Tracking appears when a courier number exists."],
          ].map(([n, title, body]) => (
            <li key={n} className="rounded-3xl bg-paper p-5">
              <p className="text-xs text-berry">{n}</p>
              <p className="mt-2 font-display text-2xl">{title}</p>
              <p className="mt-2 text-sm text-cocoa">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <h2 className="font-display text-4xl">From the worktable</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {["/photos/gallery.jpg", "/photos/bouquet.jpg", "/photos/scarf.jpg", "/photos/bunny.jpg", "/photos/cushion.jpg", "/photos/fairy.jpg", "/photos/mystery.jpg", "/photos/tote.jpg"].map((src) => (
            <img key={src} src={src} alt="Handmade crochet in the Aznik studio" className="aspect-[3/4] w-full rounded-3xl object-cover" />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <h2 className="font-display text-4xl">Notes from people who received a piece</h2>
        {data.reviews.length === 0 ? (
          <div className="mt-6">
            <Empty title="No reviews yet" body="Genuine notes appear here after a delivered order. Nothing on this shelf is invented." />
          </div>
        ) : (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {data.reviews.map((review) => (
              <blockquote key={review.id} className="rounded-3xl bg-paper p-5">
                <p className="text-berry">{"♡".repeat(review.rating)}</p>
                <p className="mt-2">{review.body}</p>
                <p className="mt-3 text-sm text-cocoa">{review.author_name}</p>
              </blockquote>
            ))}
          </div>
        )}
      </section>

      <section id="faq" className="mx-auto mt-16 grid max-w-6xl gap-8 px-4 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-4xl">Questions, kindly answered</h2>
          <div className="mt-4 divide-y divide-line">
            {data.settings.faqs.map((faq) => (
              <details key={faq.q} className="py-3">
                <summary className="cursor-pointer font-medium">{faq.q}</summary>
                <p className="mt-2 text-cocoa">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
        <Newsletter />
      </section>
    </main>
  );
}

function Shelf({ title, products }: { title: string; products: Array<{ id: string; name: string; pricePkr: number; image: string }> }) {
  if (!products.length) return null;
  return (
    <section className="mx-auto mt-16 max-w-6xl px-4">
      <h2 className="font-display text-4xl">{title}</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  return (
    <Panel>
      <h2 className="font-display text-3xl">A note when something new is finished</h2>
      <p className="mt-2 text-cocoa">No spam, no pretend coupons. Just the shop, occasionally.</p>
      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          joinNewsletter({ data: { email } })
            .then(() => {
              toast.success("You are on the list.");
              setEmail("");
            })
            .catch((error: Error) => toast.error(error.message));
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="min-h-11 flex-1 rounded-full border border-line bg-ivory px-4"
        />
        <Button type="submit">Join</Button>
      </form>
    </Panel>
  );
}
