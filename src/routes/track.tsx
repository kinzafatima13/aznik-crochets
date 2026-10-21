import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Field } from "@/components/site/ui";
import { rememberOrder, rememberPhone } from "@/lib/shop/access";
import { myOrder } from "@/lib/shop/server";

export const Route = createFileRoute("/track")({
  component: TrackPage,
});

function TrackPage() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display text-5xl">Check an order</h1>
      <p className="mt-3 text-cocoa">Use the order reference from your confirmation and the phone number from checkout. No account is required.</p>
      <form
        className="mt-6 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          const reference = id.trim().toUpperCase();
          myOrder({ data: { id: reference, token: "", phone } })
            .then((order) => {
              if (!order) {
                setError("No order matched that reference and phone number.");
                return;
              }
              rememberPhone(order.id, phone);
              if (order.accessToken) rememberOrder(order.id, order.accessToken);
              navigate({ to: "/order/$id", params: { id: order.id } });
            })
            .catch((err: Error) => setError(err.message))
            .finally(() => setBusy(false));
        }}
      >
        <Field label="Order reference" value={id} onChange={(event) => setId(event.target.value)} placeholder="AZ-••••••" required />
        <Field label="Phone number" value={phone} onChange={(event) => setPhone(event.target.value)} required />
        {error ? <p className="text-berry">{error}</p> : null}
        <Button type="submit" disabled={busy}>{busy ? "Looking…" : "Show order"}</Button>
      </form>
    </main>
  );
}
