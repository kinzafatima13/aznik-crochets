import { Navigate, createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button, Field, Panel } from "@/components/site/ui";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isShopOwner } from "@/lib/shop/owner";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { next: "/admin" | "/account" } => ({
    next: search.next === "/admin" ? "/admin" : "/account",
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const { next } = Route.useSearch();
  const desk = next === "/admin";
  const [mode, setMode] = useState<"in" | "up">(desk ? "up" : "in");
  const [name, setName] = useState(desk ? "Kinza" : "");
  const [email, setEmail] = useState(desk ? "kinzafatima1301@gmail.com" : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isPending) {
    return (
      <main className="mx-auto grid min-h-[55vh] max-w-md place-items-center px-4">
        <div className="flex items-center gap-3 text-sm text-cocoa" role="status">
          <span className="size-5 animate-spin rounded-full border-2 border-line border-t-berry" />
          Preparing your secure sign-in…
        </div>
      </main>
    );
  }
  if (user) return <Navigate to={isShopOwner(user.primaryEmail) ? "/admin" : next} />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const result = mode === "up"
        ? await authClient.signUp.email({ email: email.trim(), password, name: name.trim(), callbackURL: next })
        : await authClient.signIn.email({ email: email.trim(), password, callbackURL: next });
      if (result.error) {
        const message = result.error.message ?? "We couldn't complete that request.";
        setError(
          mode === "in" && /invalid email or password/i.test(message)
            ? "We couldn't find a matching account. If this is your first time, choose Create account."
            : message,
        );
        return;
      }
      window.location.href = isShopOwner(email) ? "/admin" : next;
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative isolate overflow-hidden px-4 py-10 sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-3xl rounded-full bg-blush/70 blur-3xl" />
      <div className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-[1fr_0.9fr] md:gap-12">
        <section className="hidden md:block">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-berry">{desk ? "Private owner access" : "A little handmade happiness"}</p>
          <h1 className="mt-4 max-w-lg font-display text-5xl leading-[1.05] text-ink lg:text-6xl">
            {desk ? "Your little shop, all in one place." : "Welcome to the softer side of handmade."}
          </h1>
          <p className="mt-5 max-w-md leading-7 text-cocoa">
            {desk
              ? "Sign in with your owner email to manage orders, stock and customer requests."
              : "Sign in to keep your favourites close and make checkout a little easier."}
          </p>
          {desk ? (
            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-line bg-paper/80 px-4 py-2 text-sm text-cocoa">
              <span className="size-2 rounded-full bg-sage-deep" /> Owner email access only
            </div>
          ) : null}
        </section>

        <Panel className="relative border border-line/70 bg-paper/95 shadow-soft">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-berry">{desk ? "Aznik · Owner desk" : "Aznik Crochets"}</p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl">{mode === "in" ? "Welcome back" : "Create your account"}</h2>
              <p className="mt-2 text-sm leading-6 text-cocoa">
                {desk
                  ? "First time here? Create your owner account with this email, then use the same details to sign in next time."
                  : "A few details and you’re right where you left off."}
              </p>
            </div>
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blush text-xl text-berry" aria-hidden="true">✿</span>
          </div>

          {desk ? (
            <div className="mb-5 rounded-2xl border border-line bg-ivory/80 p-3">
              <p className="text-xs uppercase tracking-wider text-muted">Owner email</p>
              <p className="mt-1 break-all text-sm font-medium text-ink">kinzafatima1301@gmail.com</p>
              <p className="mt-1 text-xs leading-5 text-cocoa">Only this configured email passes the shop-owner check. Use a strong, unique password.</p>
            </div>
          ) : (
            <div className="mb-5 space-y-2">
              {GROK_PROVIDERS.map((provider) => (
                <Button key={provider.providerId} variant="ghost" className="w-full transition duration-200 hover:-translate-y-0.5" onClick={() => signIn(provider.providerId, { callbackURL: next })}>
                  Continue with {provider.label}
                </Button>
              ))}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} aria-busy={submitting}>
            {mode === "up" ? <Field label="Name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /> : null}
            <Field label="Email address" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required readOnly={desk} />
            <Field label="Password" type="password" autoComplete={mode === "up" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
            {error ? <p className="rounded-xl border border-berry/20 bg-blush/60 px-3 py-2 text-sm leading-5 text-berry" role="alert">{error}</p> : null}
            <Button type="submit" className="w-full transition duration-200 hover:-translate-y-0.5" disabled={submitting}>
              {submitting ? (
                <><span className="size-4 animate-spin rounded-full border-2 border-paper/40 border-t-paper" /> Please wait…</>
              ) : mode === "in" ? "Sign in securely" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            disabled={submitting}
            className="mt-5 w-full rounded-xl py-2 text-sm font-medium text-berry transition hover:bg-blush/60 disabled:opacity-50"
            onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(""); }}
          >
            {mode === "in" ? "New here? Create an account" : "Already registered? Sign in"}
          </button>
          <p className="mt-4 border-t border-line pt-4 text-center text-xs leading-5 text-muted">
            {desk ? "Keep your password private. The owner login never grants access to other email addresses." : "Your account details are used to manage your shop experience."}
          </p>
          <p className="mt-4 text-center text-sm"><Link to="/" className="text-cocoa underline-offset-4 hover:text-berry hover:underline">Back to the shop</Link></p>
        </Panel>
      </div>
    </main>
  );
}
