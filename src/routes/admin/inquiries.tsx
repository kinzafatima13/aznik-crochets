import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Panel } from "@/components/site/ui";
import { adminInquiries, sendQuote } from "@/lib/shop/server";

export const Route = createFileRoute("/admin/inquiries")({
  component: InquiriesPage,
});

function InquiriesPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof adminInquiries>>>([]);
  useEffect(() => {
    adminInquiries().then(setRows).catch(() => setRows([]));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Design requests</h1>
      {rows.map((row) => <InquiryCard key={String(row.id)} row={row} onDone={() => adminInquiries().then(setRows)} />)}
    </div>
  );
}

function InquiryCard({ row, onDone }: { row: Record<string, unknown>; onDone: () => void }) {
  const [quotePkr, setQuotePkr] = useState(Number(row.quote_pkr) || Number(row.budget_pkr) || 5000);
  const [quoteDays, setQuoteDays] = useState(Number(row.quote_days) || 14);
  const [note, setNote] = useState(String(row.quote_note ?? ""));
  return (
    <Panel>
      <p className="font-display text-2xl">{String(row.product_type)} · {String(row.status)}</p>
      <p className="text-sm text-cocoa">{String(row.name)} · {String(row.phone)} · {String(row.email)}</p>
      <p className="mt-2">{String(row.description)}</p>
      <p className="text-sm text-cocoa">Colours {String(row.colors)} · Measurements {String(row.measurements)} · Budget Rs. {String(row.budget_pkr)} · By {String(row.desired_date)}</p>
      {typeof row.reference_image === "string" && row.reference_image ? (
        <figure className="mt-3">
          <img src={row.reference_image} alt={row.reference_image.startsWith("https://") ? "Generated design concept, not the finished piece" : "Customer reference"} className="max-h-60 rounded-2xl" />
          {row.reference_image.startsWith("https://") ? <figcaption className="mt-1 text-xs text-muted">Design concept only. Not a guaranteed picture of the handmade piece.</figcaption> : null}
        </figure>
      ) : null}
      {row.status !== "ordered" && row.status !== "declined" ? (
        <div className="mt-3 grid gap-2">
          <input type="number" value={quotePkr} onChange={(event) => setQuotePkr(Number(event.target.value))} className="min-h-11 rounded-2xl border border-line px-3" />
          <input type="number" value={quoteDays} onChange={(event) => setQuoteDays(Number(event.target.value))} className="min-h-11 rounded-2xl border border-line px-3" />
          <textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-20 rounded-2xl border border-line p-3" />
          <Button onClick={() => sendQuote({ data: { id: String(row.id), quotePkr, quoteDays, note } }).then(() => { toast.success("Quotation sent"); onDone(); }).catch((error: Error) => toast.error(error.message))}>Send quotation</Button>
        </div>
      ) : null}
    </Panel>
  );
}
