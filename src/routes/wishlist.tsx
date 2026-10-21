import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Empty, ProductCard } from "@/components/site/ui";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { myWishlist } from "@/lib/shop/server";

export const Route = createFileRoute("/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const { user, isPending } = useCurrentUserState();
  const [items, setItems] = useState<Awaited<ReturnType<typeof myWishlist>>>([]);
  useEffect(() => {
    if (!user) return;
    myWishlist().then(setItems).catch(() => setItems([]));
  }, [user?.id]);
  if (isPending) return <main className="min-h-[40vh]" />;
  if (!user) return <RedirectToSignIn />;
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-5xl">Wishlist</h1>
      {items.length === 0 ? <div className="mt-6"><Empty title="Nothing saved yet" body="Hearts on a product stay with your account." /></div> : (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
    </main>
  );
}
