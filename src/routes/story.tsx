import { createFileRoute } from "@tanstack/react-router";
import { getHome } from "@/lib/shop/server";

export const Route = createFileRoute("/story")({
  loader: () => getHome(),
  component: StoryPage,
});

function StoryPage() {
  const { settings } = Route.useLoaderData();
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2">
      <img src="/photos/gallery.jpg" alt="Crochet pieces in window light" className="aspect-[3/4] w-full rounded-3xl object-cover" />
      <div>
        <p className="text-xs uppercase tracking-widest text-berry">Our story</p>
        <h1 className="mt-2 font-display text-5xl">Made by hand, dreamed by you.</h1>
        <p className="mt-4 whitespace-pre-wrap text-lg text-cocoa">{settings.story}</p>
        <p className="mt-6 text-cocoa">The shop is in {settings.city}. Write to {settings.email} or call {settings.phone}.</p>
        <h2 className="mt-10 font-display text-3xl">Returns and care</h2>
        <p className="mt-3 text-cocoa">{settings.policy}</p>
      </div>
    </main>
  );
}
