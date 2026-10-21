import { Navigate, createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Field, Panel } from "@/components/site/ui";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { blankShopSearch } from "@/lib/shop/search";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  if (isPending) return <main className="min-h-[40vh]" />;
  if (user) return <Navigate to="/account" />;
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Panel>
        <h1 className="font-display text-4xl">{mode === "in" ? "Welcome back" : "Open an account"}</h1>
        <p className="mt-2 text-sm text-cocoa">Google, X, or email. The shop never stores card numbers.</p>
        <div className="mt-4 space-y-2">
          {GROK_PROVIDERS.map((provider) => (
            <Button key={provider.providerId} variant="ghost" className="w-full" onClick={() => signIn(provider.providerId, { callbackURL: "/account" })}>
              Continue with {provider.label}
            </Button>
          ))}
        </div>
        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            const action = mode === "up"
              ? authClient.signUp.email({ email, password, name, callbackURL: "/account" })
              : authClient.signIn.email({ email, password, callbackURL: "/account" });
            void action.then((result) => {
              if (result.error) setError(result.error.message ?? "Could not sign in.");
              else window.location.href = "/account";
            });
          }}
        >
          {mode === "up" ? <Field label="Name" value={name} onChange={(event) => setName(event.target.value)} required /> : null}
          <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Field label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
          {error ? <p className="text-sm text-berry">{error}</p> : null}
          <Button type="submit" className="w-full">{mode === "in" ? "Sign in" : "Create account"}</Button>
        </form>
        <button type="button" className="mt-4 text-sm text-cocoa" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Need an account?" : "Already have one?"}
        </button>
        <p className="mt-4 text-sm"><Link to="/shop" search={blankShopSearch} className="text-berry">Continue browsing</Link></p>
      </Panel>
    </main>
  );
}
