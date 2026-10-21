import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/site/ui";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { adminSession, claimShop } from "@/lib/shop/server";

const links = [
  ["/admin", "Overview"],
  ["/admin/products", "Products"],
  ["/admin/orders", "Orders"],
  ["/admin/inquiries", "Requests"],
  ["/admin/mystery", "Mystery"],
  ["/admin/settings", "Settings"],
] as const;

export function AdminGate({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [session, setSession] = useState<{ isAdmin: boolean; hasOwner: boolean } | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) return;
    adminSession().then(setSession).catch(() => setSession({ isAdmin: false, hasOwner: true }));
  }, [user?.id]);
  if (isPending || (user && !session)) return <main className="grid min-h-screen place-items-center bg-ivory text-cocoa">Opening the desk…</main>;
  if (!user) return <RedirectToSignIn />;
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
    <div className="min-h-screen bg-ivory text-ink">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[180px_1fr]">
        <aside className="flex flex-row flex-wrap gap-2 lg:flex-col">
          <Link to="/" className="font-display text-2xl italic">Aznik</Link>
          {links.map(([to, label]) => (
            <Link key={to} to={to} className="min-h-11 rounded-full px-3 py-2 text-sm hover:bg-blush">{label}</Link>
          ))}
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
