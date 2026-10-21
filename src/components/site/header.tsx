import { Link, useRouteContext, useRouterState } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { rehydrateCart, useCart } from "@/lib/shop/cart";
import { blankShopSearch } from "@/lib/shop/search";
import { lineQty } from "@/lib/shop/types";
import { Wordmark } from "./ui";

const links = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop All" },
  { to: "/collections", label: "Collections" },
  { to: "/atelier", label: "Customize Yours" },
  { to: "/story", label: "Our Story" },
] as const;

export function Header() {
  const { chrome } = useRouteContext({ from: "__root__" });
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const count = useCart((state) => state.lines.reduce((sum, line) => sum + lineQty(line.input), 0));
  useEffect(() => {
    rehydrateCart();
    setReady(true);
  }, []);
  useEffect(() => setOpen(false), [path]);

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-ivory/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <button type="button" className="min-h-11 min-w-11 rounded-full lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu className="mx-auto" />
        </button>
        <Wordmark />
        <nav className="ml-6 hidden items-center gap-5 lg:flex">
          {links.slice(1).map((link) => (
            <Link key={link.to} to={link.to} search={link.to === "/shop" ? blankShopSearch : undefined} className="text-sm text-cocoa hover:text-berry">
              {link.label}
            </Link>
          ))}
          <Link to="/shop" search={{ ...blankShopSearch, collection: "mystery" }} className="text-sm text-cocoa hover:text-berry">Mystery Gifts</Link>
          <Link to="/admin" className="rounded-full bg-berry px-4 py-2 text-sm text-paper hover:bg-berry-deep">Shop desk</Link>
        </nav>
        <form action="/shop" className="ml-auto hidden min-w-0 flex-1 md:block md:max-w-xs">
          <label className="relative block">
            <span className="sr-only">Search</span>
            <Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted" />
            <input
              name="q"
              placeholder="Search the little shop"
              className="min-h-11 w-full rounded-full border border-line bg-paper pr-4 pl-10 text-sm outline-none focus:border-berry"
            />
          </label>
        </form>
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <Link to="/admin" className="rounded-full bg-berry px-3 py-2 text-sm text-paper hover:bg-berry-deep lg:hidden">Desk</Link>
          <Link to="/shop" search={blankShopSearch} className="grid min-h-11 min-w-11 place-items-center rounded-full md:hidden" aria-label="Search">
            <Search className="size-5" />
          </Link>
          <Link to="/wishlist" className="grid min-h-11 min-w-11 place-items-center rounded-full" aria-label="Wishlist">
            <Heart className="size-5" />
          </Link>
          <Link to="/account" className="grid min-h-11 min-w-11 place-items-center rounded-full" aria-label="Account">
            <UserRound className="size-5" />
          </Link>
          <Link to="/bag" className="relative grid min-h-11 min-w-11 place-items-center rounded-full" aria-label="Shopping bag">
            <ShoppingBag className="size-5" />
            {ready && count > 0 ? (
              <span className="absolute top-1 right-0 grid h-5 min-w-5 place-items-center rounded-full bg-berry px-1 text-xs text-paper">
                {count}
              </span>
            ) : null}
          </Link>
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <Link to="/login" search={{ next: "/account" }} className="hidden text-sm text-cocoa sm:inline">
              Sign in
            </Link>
          </SignedOut>
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 bg-ivory px-6 py-5 lg:hidden">
          <div className="flex items-center justify-between">
            <Wordmark />
            <button type="button" className="grid min-h-11 min-w-11 place-items-center" aria-label="Close menu" onClick={() => setOpen(false)}>
              <X />
            </button>
          </div>
          <nav className="mt-8 flex flex-col gap-2">
            <Link to="/admin" className="font-display text-4xl text-berry">Shop desk</Link>
            {links.map((link) => (
              <Link key={link.to} to={link.to} search={link.to === "/shop" ? blankShopSearch : undefined} className="font-display text-4xl">
                {link.label}
              </Link>
            ))}
            <Link to="/shop" search={{ ...blankShopSearch, collection: "mystery" }} className="font-display text-4xl">Mystery Gifts</Link>
          </nav>
          <p className="mt-8 text-sm text-cocoa">{chrome.settings.tagline}</p>
        </div>
      ) : null}
    </header>
  );
}

export function Announcement() {
  const { chrome } = useRouteContext({ from: "__root__" });
  return (
    <div className="bg-berry px-4 py-2 text-center text-sm text-paper">{chrome.settings.announcement}</div>
  );
}

export function Footer() {
  const { chrome } = useRouteContext({ from: "__root__" });
  const { settings, collections } = chrome;
  return (
    <footer className="mt-20 border-t border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-3xl italic">Aznik Crochets</p>
          <p className="mt-2 text-cocoa">{settings.tagline}</p>
          <p className="mt-4 text-sm text-cocoa">
            {settings.city}
            <br />
            {settings.phone}
            <br />
            {settings.email}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Visit</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link to="/shop" search={blankShopSearch}>Shop all</Link>
            <Link to="/atelier">The little atelier</Link>
            <Link to="/shop" search={{ ...blankShopSearch, collection: "mystery" }}>Mystery gifts</Link>
            <Link to="/story">Our story</Link>
            <Link to="/quote">Ask for a quotation</Link>
            <Link to="/track">Check an order</Link>
            <Link to="/admin" className="font-medium text-berry">Shop desk</Link>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Collections</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            {collections.slice(0, 6).map((collection) => (
              <Link key={collection.id} to="/collections/$slug" params={{ slug: collection.id }}>
                {collection.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Care</p>
          <p className="mt-3 text-sm text-cocoa">
            Custom pieces and mystery gifts are paid in full before they are made. Prices are in Pakistani rupees.
          </p>
          <a className="mt-3 inline-block text-sm text-berry" href={settings.instagram}>
            Instagram
          </a>
        </div>
      </div>
      <p className="px-4 pb-8 text-center text-xs text-muted">Handmade in small batches. Every stitch tells a story.</p>
    </footer>
  );
}
