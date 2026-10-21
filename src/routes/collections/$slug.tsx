import { createFileRoute, Link } from "@tanstack/react-router";
import { ProductCard } from "@/components/site/ui";
import { getCatalog, getChrome } from "@/lib/shop/server";

export const Route = createFileRoute("/collections/$slug")({
  loader: async ({ params }) => {
    const [catalog, chrome] = await Promise.all([
      getCatalog({ data: { q: "", category: "", collection: params.slug, color: "", size: "", min: 0, max: 0, sort: "featured" } }),
      getChrome(),
    ]);
    return { catalog, collection: chrome.collections.find((item) => item.id === params.slug) ?? null };
  },
  component: CollectionPage,
});

function CollectionPage() {
  const { catalog, collection } = Route.useLoaderData();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm text-cocoa"><Link to="/collections">Collections</Link></p>
      <h1 className="mt-2 font-display text-5xl">{collection?.name ?? "Collection"}</h1>
      <p className="mt-2 max-w-xl text-cocoa">{collection?.blurb}</p>
      {collection?.id === "mystery" ? <p className="mt-3 max-w-xl text-cocoa">These gifts are part of the shop. The price, possible pieces, and terms are on each product. The exact contents stay a secret until delivery.</p> : null}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {catalog.products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </main>
  );
}
