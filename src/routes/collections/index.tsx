import { createFileRoute, Link } from "@tanstack/react-router";
import { getChrome } from "@/lib/shop/server";

export const Route = createFileRoute("/collections/")({
  loader: () => getChrome(),
  component: CollectionsPage,
});

function CollectionsPage() {
  const data = Route.useLoaderData();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-5xl">Collections</h1>
      <p className="mt-2 max-w-xl text-cocoa">Little worlds of colour. Each one is a mood you can shop.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.collections.map((collection) => (
          <Link key={collection.id} to="/collections/$slug" params={{ slug: collection.id }} className="overflow-hidden rounded-3xl bg-paper shadow-soft">
            <img src={collection.image} alt="" className="aspect-[4/3] w-full object-cover" />
            <span className="block p-4">
              <span className="font-display text-2xl">{collection.name}</span>
              <span className="mt-1 block text-sm text-cocoa">{collection.blurb}</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
