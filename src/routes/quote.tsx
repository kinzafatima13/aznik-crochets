import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Area, Button, Field, Panel, Price } from "@/components/site/ui";
import { inquiryToken, inquiryTokens, rememberInquiry, rememberOrder } from "@/lib/shop/access";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { compressImage } from "@/lib/shop/images";
import { acceptQuote, declineQuote, inquiriesByToken, myInquiries, sendInquiry } from "@/lib/shop/server";

export const Route = createFileRoute("/quote")({
  component: QuotePage,
});

function QuotePage() {
  const { user } = useCurrentUserState();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof myInquiries>>>([]);
  const [form, setForm] = useState({
    productType: "Scarf",
    description: "",
    colors: "",
    measurements: "",
    budgetPkr: 5000,
    desiredDate: "",
    name: "",
    phone: "",
    email: "",
    referenceImage: "",
  });
  const [pay, setPay] = useState({ name: "", phone: "", line1: "", city: "Islamabad", notes: "", email: "", save: false });
  useEffect(() => {
    const tokens = inquiryTokens();
    if (tokens.length) {
      inquiriesByToken({ data: { tokens } }).then((guestRows) => {
        setRows((current) => mergeInquiries(current, guestRows));
      }).catch(() => undefined);
    }
    if (!user) return;
    myInquiries().then((accountRows) => setRows((current) => mergeInquiries(current, accountRows))).catch(() => undefined);
  }, [user?.id]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-5xl">A custom request</h1>
      <p className="mt-2 text-cocoa">No account is required. This is a conversation, not an order. Aznik sends a price in PKR. You accept it, then pay. Yarn is cut only after that payment is verified.</p>
        <form
          className="mt-6 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            sendInquiry({ data: form })
              .then((result) => {
                rememberInquiry(result.id, result.accessToken);
                toast.success("Request sent. It is not an order yet.");
                return inquiriesByToken({ data: { tokens: inquiryTokens() } }).then((guestRows) => setRows((current) => mergeInquiries(current, guestRows)));
              })
              .catch((error: Error) => toast.error(error.message));
          }}
        >
          <Field label="What should it be?" value={form.productType} onChange={(event) => setForm({ ...form, productType: event.target.value })} />
          <Area label="Describe the design" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
          <Field label="Preferred colours" value={form.colors} onChange={(event) => setForm({ ...form, colors: event.target.value })} />
          <Field label="Measurements" value={form.measurements} onChange={(event) => setForm({ ...form, measurements: event.target.value })} />
          <Field label="Budget in PKR" type="number" value={form.budgetPkr} onChange={(event) => setForm({ ...form, budgetPkr: Number(event.target.value) })} />
          <Field label="Desired date" value={form.desiredDate} onChange={(event) => setForm({ ...form, desiredDate: event.target.value })} />
          <Field label="Your name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <Field label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
          <Field label="Email, if you have one" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <label className="text-sm text-cocoa">Reference photo
            <input type="file" accept="image/*" className="mt-1 block" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              compressImage(file).then((image) => setForm((current) => ({ ...current, referenceImage: image }))).catch((error: Error) => toast.error(error.message));
            }} />
          </label>
          <Button type="submit">Send request</Button>
        </form>
        <div className="mt-10 space-y-4">
          {rows.map((row) => (
            <Panel key={String(row.id)}>
              <p className="font-display text-2xl">{String(row.product_type)}</p>
              <p className="text-sm text-cocoa">{String(row.status)} · {String(row.created_at)}</p>
              <p className="mt-2">{String(row.description)}</p>
              {row.quote_pkr ? (
                <div className="mt-3">
                  <p>Quotation <Price value={Number(row.quote_pkr)} /> · about {String(row.quote_days)} days after payment</p>
                  <p className="text-sm text-cocoa">{String(row.quote_note)}</p>
                  {row.status === "quoted" ? (
                    <form
                      className="mt-3 grid gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        acceptQuote({
                          data: {
                            inquiryId: String(row.id),
                            token: inquiryToken(String(row.id)),
                            email: pay.email || form.email,
                            paymentMethod: "cod",
                            address: { ...pay, name: pay.name || form.name, phone: pay.phone || form.phone, save: false },
                          },
                        })
                          .then((result) => {
                            if (result.accessToken) rememberOrder(result.orderId, result.accessToken);
                            navigate({ to: "/order/$id", params: { id: result.orderId } });
                          })
                          .catch((error: Error) => toast.error(error.message));
                      }}
                    >
                      <p className="text-sm">Accepting creates a cash-on-delivery order. The courier charge is added to the quoted price.</p>
                      <Field label="Name" value={pay.name} onChange={(event) => setPay({ ...pay, name: event.target.value })} required />
                      <Field label="Phone" value={pay.phone} onChange={(event) => setPay({ ...pay, phone: event.target.value })} required />
                      <Field label="Email" value={pay.email} onChange={(event) => setPay({ ...pay, email: event.target.value })} required />
                      <Field label="Address" value={pay.line1} onChange={(event) => setPay({ ...pay, line1: event.target.value })} required />
                      <Field label="City" value={pay.city} onChange={(event) => setPay({ ...pay, city: event.target.value })} required />
                      <div className="flex gap-2">
                        <Button type="submit">Accept order</Button>
                        <Button type="button" variant="ghost" onClick={() => declineQuote({ data: { inquiryId: String(row.id), token: inquiryToken(String(row.id)) } }).then(() => inquiriesByToken({ data: { tokens: inquiryTokens() } }).then((guestRows) => setRows(guestRows)))}>Decline</Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ) : <p className="mt-2 text-sm text-cocoa">Waiting for a quotation. This is not an order.</p>}
            </Panel>
          ))}
        </div>
    </main>
  );
}

function mergeInquiries<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of [...incoming, ...current]) map.set(String(row.id), row);
  return [...map.values()];
}
