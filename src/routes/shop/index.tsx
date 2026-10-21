import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ProductCard } from "@/components/site/ui";
import { getCatalog, getChrome } from "@/lib/shop/server";

type Search = {
  q: string;
  category: string;
  collection: string;
  color: string;
  size: string;
  min: number;
  max: number;
  sort: "featured" | "newest" | "price-asc" | "price-desc";
};

export const Route = createFileRoute("/shop/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: typeof search.q === "string" ? search.q : "",
    category: typeof search.category === "string" ? search.category : "",
    collection: typeof search.collection === "string" ? search.collection : "",
    color: typeof search.color === "string" ? search.color : "",
    size: typeof search.size === "string" ? search.size : "",
    min: Number(search.min) || 0,
    max: Number(search.max) || 0,
    sort: search.sort === "newest" || search.sort === "price-asc" || search.sort === "price-desc" || search.sort === "featured" ? search.sort : "featured",
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [catalog, chrome] = await Promise.all([getCatalog({ data: deps }), getChrome()]);
    return { catalog, categories: chrome.categories };
  },
  component: ShopPage,
});

function ShopPage() {
  const search = Route.useSearch();
  const { catalog, categories } = Route.useLoaderData();
  const navigate = useNavigate({ from: "/shop/" });
  const set = (patch: Partial<Search>) => navigate({ search: { ...search, ...patch } });
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-4">
        <h1 className="font-display text-4xl">The shop</h1>
        <label className="block text-sm text-cocoa">
          Category
          <select className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-paper px-3" value={search.category} onChange={(event) => set({ category: event.target.value })}>
            <option value="">All</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="block text-sm text-cocoa">
          Colour
          <select className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-paper px-3" value={search.color} onChange={(event) => set({ color: event.target.value })}>
            <option value="">Any</option>
            {catalog.colors.map((color) => <option key={color}>{color}</option>)}
          </select>
        </label>
        <label className="block text-sm text-cocoa">
          Size
          <select className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-paper px-3" value={search.size} onChange={(event) => set({ size: event.target.value })}>
            <option value="">Any</option>
            {catalog.sizes.map((size) => <option key={size}>{size}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm text-cocoa">Min PKR
            <input type="number" className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-paper px-3" value={search.min || ""} onChange={(event) => set({ min: Number(event.target.value) || 0 })} />
          </label>
          <label className="text-sm text-cocoa">Max PKR
            <input type="number" className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-paper px-3" value={search.max || ""} onChange={(event) => set({ max: Number(event.target.value) || 0 })} />
          </label>
        </div>
      </aside>
      <section>
        {search.collection === "mystery" ? (
          <p className="mt-3 max-w-2xl text-sm text-cocoa">These are shop products. Each one shows the price, the kinds of pieces it might contain, and the terms. The exact gift stays a secret until delivery. Free delivery, when it is turned on in the shop desk, applies only to a parcel of eligible mystery gifts that is paid in advance — and not while that payment is still awaiting verification.</p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-cocoa">{catalog.products.length} pieces {search.q ? `for “${search.q}”` : ""}</p>
          <select className="min-h-11 rounded-full border border-line bg-paper px-3" value={search.sort} onChange={(event) => set({ sort: event.target.value as Search["sort"] })}>
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
          </select>
        </div>
        {catalog.products.length === 0 ? (
          <p className="mt-8 text-cocoa">Nothing matches. <Link to="/atelier" className="text-berry">Design one instead.</Link></p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
            {catalog.products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </main>
  );
}
