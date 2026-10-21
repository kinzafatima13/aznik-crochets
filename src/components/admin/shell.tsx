import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Flower2, Inbox, LayoutDashboard, Package, Settings, ShoppingBag, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/site/ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { adminSession, claimShop } from "@/lib/shop/server";

const links = [
  { to: "/admin", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag, exact: false },
  { to: "/admin/products", label: "Products", icon: Package, exact: false },
  { to: "/admin/inquiries", label: "Requests", icon: Inbox, exact: false },
  { to: "/admin/mystery", label: "Mystery", icon: Sparkles, exact: false },
  { to: "/admin/settings", label: "Settings", icon: Settings, exact: false },
] as const;

export function AdminGate({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [session, setSession] = useState<{ isAdmin: boolean; hasOwner: boolean } | null>(null);
  const navigate = useNavigate();
  const path = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    if (!user) return;
    adminSession().then(setSession).catch(() => setSession({ isAdmin: false, hasOwner: true }));
  }, [user?.id]);
  if (isPending || (user && !session)) return <main className="grid min-h-screen place-items-center bg-[#f1f1f1] text-[#6d7175]">Opening the desk…</main>;
  if (!user) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-4xl">The shop desk</h1>
        <p className="mt-3 text-cocoa">Sign in with email first. Then come back here and claim the boutique. The first account becomes the only admin.</p>
        <Link to="/login" search={{ next: "/admin" }} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-berry px-5 text-sm text-paper">Sign in</Link>
        <Link to="/" className="mt-6 block text-sm text-cocoa">Back to the shop</Link>
      </main>
    );
  }
  if (!session?.isAdmin) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-4xl">The shop desk</h1>
        {session?.hasOwner ? (
          <p className="mt-3 text-cocoa">This boutique already has an owner. Customer accounts cannot manage orders.</p>
        ) : (
          <>
            <p className="mt-3 text-cocoa">No owner yet. The first signed-in person to claim it becomes the only admin. Do this with the account that will run Aznik Crochets.</p>
            <Button className="mt-4" onClick={() => claimShop().then(() => navigate({ to: "/admin" })).then(() => window.location.reload())}>Claim this boutique</Button>
          </>
        )}
        <Link to="/" className="mt-6 block text-sm text-berry">Back to the shop</Link>
      </main>
    );
  }
  return (
    <div className="min-h-screen bg-[#f1f2f4] text-[#202223]">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-[#1a1c36] px-3 text-white sm:px-4">
        <Link to="/admin" className="flex items-center gap-2 font-display text-xl italic">
          <Flower2 className="size-5" />
          Aznik
        </Link>
        <form action="/admin/orders" className="mx-auto hidden min-w-0 flex-1 sm:block sm:max-w-xl">
          <input name="q" placeholder="Search" className="h-9 w-full rounded-lg border border-white/10 bg-[#2c3154] px-3 text-sm text-white outline-none placeholder:text-white/50" />
        </form>
        <Link to="/" className="ml-auto text-sm text-white/80 hover:text-white">View store</Link>
      </header>
      <div className="lg:grid lg:grid-cols-[220px_1fr]">
        <aside className="flex gap-1 overflow-x-auto border-b border-[#e3e3e3] bg-[#f7f7f7] px-2 py-2 lg:block lg:min-h-[calc(100vh-3.5rem)] lg:border-r lg:border-b-0 lg:px-3 lg:py-4">
          {links.map((link) => {
            const active = link.exact ? path === link.to : path.startsWith(link.to);
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm ${active ? "bg-[#e3e3e3] font-medium text-[#202223]" : "text-[#202223] hover:bg-[#ececec]"}`}
              >
                <Icon className="size-4" />
                {link.label}
              </Link>
            );
          })}
        </aside>
        <div className="min-w-0 px-3 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
