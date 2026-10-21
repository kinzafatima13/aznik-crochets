import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Field, Panel, Price } from "@/components/site/ui";
import { rememberInquiry } from "@/lib/shop/access";
import { useCart } from "@/lib/shop/cart";
import { getAtelier, imagineDesign, quoteCart, refineDesign, sendInquiry } from "@/lib/shop/server";
import type { CustomDesign, Quote } from "@/lib/shop/types";

const MATERIALS = ["Cotton", "Acrylic", "Wool blend", "Chenille"];

export const Route = createFileRoute("/atelier")({
  loader: () => getAtelier(),
  component: Atelier,
});

function Atelier() {
  const data = Route.useLoaderData();
  const add = useCart((state) => state.add);
  const [step, setStep] = useState(0);
  const [typeId, setTypeId] = useState(data.types[0]?.id ?? "");
  const type = data.types.find((item) => item.id === typeId) ?? data.types[0];
  const [patternId, setPatternId] = useState(data.patterns[0]?.id ?? "");
  const [colorIds, setColorIds] = useState<string[]>(data.yarns[0] ? [data.yarns[0].id] : []);
  const [size, setSize] = useState(type?.sizes[0]?.label ?? "");
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [personalization, setPersonalization] = useState("");
  const [measurements, setMeasurements] = useState("");
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [qty, setQty] = useState(1);
  const [brief, setBrief] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [aiNotes, setAiNotes] = useState("");
  const [conceptPrompt, setConceptPrompt] = useState("");
  const [conceptUrl, setConceptUrl] = useState("");
  const [aiError, setAiError] = useState(data.aiConfigured ? "" : "Image generation and design chat are not connected. Add XAI_API_KEY on the server. You can still choose yarns and see a real price. No picture will be shown as if it were generated.");
  const [busy, setBusy] = useState<"refine" | "image" | "quote" | "">("");
  const [needsQuoteFlag, setNeedsQuoteFlag] = useState(false);
  const [quoteContact, setQuoteContact] = useState({ name: "", phone: "", email: "" });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (type) setSize(type.sizes[0]?.label ?? "");
  }, [typeId]);

  const design: CustomDesign = useMemo(
    () => ({
      typeId,
      patternId,
      colorIds,
      size,
      extraIds,
      personalization,
      measurements,
      qty,
      brief,
      aiNotes,
      conceptImage: conceptUrl.startsWith("https://") ? conceptUrl : "",
      material,
    }),
    [typeId, patternId, colorIds, size, extraIds, personalization, measurements, qty, brief, aiNotes, conceptUrl, material],
  );

  useEffect(() => {
    if (!type || type.basePkr <= 0 || colorIds.length === 0) {
      setQuote(null);
      return;
    }
    const timer = setTimeout(() => {
      quoteCart({ data: { lines: [{ kind: "custom", design }], coupon: "", paymentMethod: "cod" } })
        .then((next) => {
          setQuote(next);
          setError("");
        })
        .catch((err: Error) => setError(err.message));
    }, 200);
    return () => clearTimeout(timer);
  }, [design, type, colorIds.length]);

  const yarns = data.yarns.filter((yarn) => colorIds.includes(yarn.id));
  const needsQuote = needsQuoteFlag || !type || type.basePkr <= 0;

  function refine() {
    const text = draft.trim();
    if (text.length < 8) {
      setAiError("Describe the piece in a sentence or two.");
      return;
    }
    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setBrief(text);
    setDraft("");
    setBusy("refine");
    setAiError("");
    refineDesign({ data: { messages: nextMessages } })
      .then((result) => {
        if (!result.ok) {
          setAiError(result.error);
          return;
        }
        setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
        setAiNotes(result.reply);
        const suggestion = result.suggestion;
        if (!suggestion) return;
        if (suggestion.typeId) setTypeId(suggestion.typeId);
        if (suggestion.patternId) setPatternId(suggestion.patternId);
        if (suggestion.colorIds.length) setColorIds(suggestion.colorIds);
        if (suggestion.size) setSize(suggestion.size);
        if (suggestion.extraIds.length) setExtraIds(suggestion.extraIds);
        if (suggestion.personalization) setPersonalization(suggestion.personalization);
        if (suggestion.material) setMaterial(suggestion.material);
        setNeedsQuoteFlag(suggestion.needsQuote);
        setConceptPrompt(suggestion.conceptPrompt);
      })
      .catch((err: Error) => setAiError(err.message))
      .finally(() => setBusy(""));
  }

  function imagine() {
    const prompt = conceptPrompt || brief;
    setBusy("image");
    setAiError("");
    imagineDesign({ data: { prompt } })
      .then((result) => {
        if (!result.ok) {
          setConceptUrl("");
          setAiError(result.error);
          return;
        }
        setConceptUrl(result.url);
      })
      .catch((err: Error) => {
        setConceptUrl("");
        setAiError(err.message);
      })
      .finally(() => setBusy(""));
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <p className="text-xs uppercase tracking-widest text-berry">The little crochet atelier by Aznik</p>
        <h1 className="mt-2 font-display text-5xl">Describe it, then we price the real stitches.</h1>
        <p className="mt-3 max-w-xl text-cocoa">Tell the atelier what you imagine. Practical choices — size, yarn, material, and add-ons — use the shop’s prices. A picture, when the image service is connected, is a concept only. It is not a promise of the handmade piece. Custom work is paid in full before any yarn is cut.</p>

        <Panel className="mt-6">
          <h2 className="font-display text-3xl">Describe your piece</h2>
          <div className="mt-3 space-y-3">
            {messages.map((message, index) => (
              <p key={`${message.role}-${index}`} className={`rounded-2xl px-3 py-2 text-sm ${message.role === "user" ? "bg-blush" : "bg-ivory text-cocoa"}`}>
                {message.content}
              </p>
            ))}
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="I want a baby-pink crochet shoulder bag with tiny white daisies, a cream strap, and a little satin bow." className="min-h-28 w-full rounded-2xl border border-line bg-ivory p-3" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy !== ""} onClick={refine}>{busy === "refine" ? "Refining…" : "Refine this idea"}</Button>
              <Button type="button" variant="ghost" disabled={busy !== "" || (conceptPrompt || brief).trim().length < 8} onClick={imagine}>{busy === "image" ? "Drawing…" : "Generate a concept"}</Button>
            </div>
            {aiError ? <p className="text-sm text-cocoa">{aiError}</p> : null}
            {!data.aiConfigured ? <p className="text-sm text-muted">The design assistant and concept images both need the shop’s xAI key. Until then this stays a written brief plus the yarn colours you pick.</p> : null}
          </div>
        </Panel>

        <ol className="mt-6 flex flex-wrap gap-2 text-sm">
          {["Piece", "Pattern", "Yarn", "Size", "Details", "Quantity", "Review"].map((label, index) => (
            <li key={label}>
              <button type="button" onClick={() => setStep(index)} className={`min-h-11 rounded-full px-3 ${step === index ? "bg-berry text-paper" : "bg-paper text-cocoa"}`}>{index + 1}. {label}</button>
            </li>
          ))}
        </ol>

        <div className="mt-6">
          {step === 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {data.types.map((item) => (
                <button key={item.id} type="button" onClick={() => { setTypeId(item.id); setNeedsQuoteFlag(item.basePkr <= 0); }} className={`rounded-3xl border p-4 text-left ${typeId === item.id ? "border-berry bg-blush" : "border-line bg-paper"}`}>
                  <span className="block font-display text-xl">{item.name}</span>
                  <span className="text-sm text-cocoa">{item.basePkr > 0 ? <Price value={item.basePkr} /> : "Quoted privately"}</span>
                </button>
              ))}
            </div>
          ) : null}
          {step === 1 ? (
            <div className="grid gap-2">
              {data.patterns.map((pattern) => (
                <button key={pattern.id} type="button" onClick={() => setPatternId(pattern.id)} className={`min-h-11 rounded-2xl border px-4 text-left ${patternId === pattern.id ? "border-berry bg-blush" : "border-line bg-paper"}`}>
                  {pattern.name} {pattern.extraPkr ? `· +${pattern.extraPkr} PKR` : ""}
                </button>
              ))}
            </div>
          ) : null}
          {step === 2 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {data.yarns.map((yarn) => {
                const on = colorIds.includes(yarn.id);
                return (
                  <button
                    key={yarn.id}
                    type="button"
                    onClick={() => setColorIds((current) => on ? current.filter((id) => id !== yarn.id) : current.length >= 4 ? current : [...current, yarn.id])}
                    className={`rounded-3xl border p-3 text-left ${on ? "border-berry" : "border-line"} bg-paper`}
                  >
                    <span className="mb-2 block h-10 rounded-2xl" style={{ background: yarn.hex }} />
                    {yarn.name}
                    <span className="block text-xs text-cocoa">{yarn.extraPkr ? `+${yarn.extraPkr} PKR` : "Included"}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {step === 3 && type ? (
            <div className="grid gap-2">
              {type.sizes.map((option) => (
                <button key={option.label} type="button" onClick={() => setSize(option.label)} className={`min-h-11 rounded-2xl border px-4 text-left ${size === option.label ? "border-berry bg-blush" : "border-line bg-paper"}`}>
                  {option.label} {option.extra ? `· +${option.extra} PKR` : ""}
                </button>
              ))}
              {size === "Custom measurements" ? (
                <textarea value={measurements} onChange={(event) => setMeasurements(event.target.value)} placeholder="Chest, length, wrist, or the measurements this piece needs" className="min-h-28 rounded-2xl border border-line bg-paper p-3" />
              ) : null}
            </div>
          ) : null}
          {step === 4 ? (
            <div className="space-y-3">
              <p className="text-sm text-cocoa">Material is recorded with the order. It does not add a charge unless it is already in the yarn price.</p>
              <div className="flex flex-wrap gap-2">
                {MATERIALS.map((option) => (
                  <button key={option} type="button" onClick={() => setMaterial(option)} className={`min-h-11 rounded-full border px-3 ${material === option ? "border-berry bg-blush" : "border-line bg-paper"}`}>{option}</button>
                ))}
              </div>
              {data.extras.map((extra) => {
                const on = extraIds.includes(extra.id);
                return (
                  <button key={extra.id} type="button" onClick={() => setExtraIds((current) => on ? current.filter((id) => id !== extra.id) : [...current, extra.id])} className={`block min-h-11 w-full rounded-2xl border px-4 text-left ${on ? "border-berry bg-blush" : "border-line bg-paper"}`}>
                    {extra.name} · +{extra.extraPkr} PKR
                  </button>
                );
              })}
              <input value={personalization} onChange={(event) => setPersonalization(event.target.value)} placeholder="Initials or a name, if you chose one" className="min-h-11 w-full rounded-2xl border border-line bg-paper px-3" />
            </div>
          ) : null}
          {step === 5 ? (
            <label className="block text-cocoa">Quantity
              <input type="number" min={1} max={5} value={qty} onChange={(event) => setQty(Number(event.target.value) || 1)} className="mt-1 min-h-11 w-28 rounded-2xl border border-line bg-paper px-3" />
            </label>
          ) : null}
          {step === 6 ? (
            <Panel>
              <h2 className="font-display text-3xl">Review before you pay</h2>
              <p className="mt-2 text-cocoa">{type?.name} · {material} · about {type?.productionDays} days after payment is verified.</p>
              {brief ? <p className="mt-2 text-sm">Your brief: {brief}</p> : null}
              {aiNotes ? <p className="mt-2 text-sm text-cocoa">Studio note: {aiNotes}</p> : null}
              {error ? <p className="mt-3 text-berry">{error}</p> : null}
              {quote ? <p className="mt-3 text-2xl"><Price value={quote.totalPkr} /></p> : null}
              <p className="mt-2 text-sm text-cocoa">Delivery is added at checkout. Full payment is required before production. An unverified receipt does not start the work.</p>
            </Panel>
          ) : null}
        </div>
        <div className="mt-6 flex gap-3">
          {step > 0 ? <Button variant="ghost" onClick={() => setStep((value) => value - 1)}>Back</Button> : null}
          {step < 6 ? <Button onClick={() => setStep((value) => value + 1)}>Continue</Button> : null}
        </div>
        {needsQuote ? (
          <Panel className="mt-4">
            <h2 className="font-display text-2xl">This one needs a quotation</h2>
            <p className="mt-2 text-sm text-cocoa">The price list does not cover this idea, so it is not an order yet. Leave your name and phone. No account is required.</p>
            <div className="mt-3 grid gap-2">
              <Field label="Name" value={quoteContact.name} onChange={(event) => setQuoteContact({ ...quoteContact, name: event.target.value })} />
              <Field label="Phone" value={quoteContact.phone} onChange={(event) => setQuoteContact({ ...quoteContact, phone: event.target.value })} />
              <Field label="Email" value={quoteContact.email} onChange={(event) => setQuoteContact({ ...quoteContact, email: event.target.value })} />
              <Button
                disabled={busy === "quote"}
                onClick={() => {
                  setBusy("quote");
                  sendInquiry({
                    data: {
                      productType: type?.name || "Custom piece",
                      description: [brief, aiNotes && `Studio note: ${aiNotes}`, conceptPrompt && `Concept prompt: ${conceptPrompt}`, type ? `Piece: ${type.name}` : "", size ? `Size: ${size}` : "", material ? `Material: ${material}` : ""].filter(Boolean).join("\n") || "Custom design request",
                      colors: yarns.map((yarn) => yarn.name).join(", "),
                      measurements,
                      budgetPkr: quote?.totalPkr ?? 0,
                      desiredDate: "",
                      name: quoteContact.name,
                      phone: quoteContact.phone,
                      email: quoteContact.email,
                      referenceImage: conceptUrl.startsWith("https://") ? conceptUrl : "",
                    },
                  })
                    .then((result) => {
                      rememberInquiry(result.id, result.accessToken);
                      toast.success(`Request ${result.id} is with Aznik. It is not an order until you accept a quotation and pay.`);
                    })
                    .catch((err: Error) => toast.error(err.message))
                    .finally(() => setBusy(""));
                }}
              >
                Send for a quote
              </Button>
              <Link to="/quote" className="text-sm text-berry">Or open the quotation page</Link>
            </div>
          </Panel>
        ) : null}
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Panel>
          <p className="text-xs uppercase tracking-widest text-muted">{conceptUrl ? "Design concept" : "Colour study"}</p>
          {conceptUrl ? (
            <img src={conceptUrl} alt="Generated crochet concept, not the finished handmade piece" className="mt-3 aspect-square w-full rounded-3xl object-cover" />
          ) : (
            <div className="mt-3 h-48 overflow-hidden rounded-3xl" style={{ background: `repeating-linear-gradient(90deg, ${yarns[0]?.hex ?? "#F4EFE6"} 0 18px, ${yarns[1]?.hex ?? yarns[0]?.hex ?? "#F3C1C8"} 18px 36px)` }} />
          )}
          <p className="mt-2 text-xs text-muted">
            {conceptUrl
              ? "This is a generated design concept, not a guaranteed picture of the handmade piece. Colour, scale, and stitches can differ once it is crocheted."
              : "Not a generated picture and not a photo of your finished order. These are the yarn colours you chose."}
          </p>
          <h2 className="mt-4 font-display text-3xl">{type?.name ?? "Choose a piece"}</h2>
          <p className="text-sm text-cocoa">{quote?.lines[0]?.detail}</p>
          <p className="mt-3 text-2xl">{quote ? <Price value={quote.lines[0]?.linePkr ?? 0} /> : "—"}</p>
          <Button
            className="mt-4 w-full"
            disabled={!quote || needsQuote}
            onClick={() => {
              if (!quote || !type) return;
              add({
                key: `custom:${crypto.randomUUID()}`,
                title: `Custom ${type.name}`,
                detail: quote.lines[0]?.detail ?? "",
                image: conceptUrl.startsWith("https://") ? conceptUrl : "",
                input: { kind: "custom", design },
              });
              toast.success("Design added. Pay in full at checkout before it is made.");
            }}
          >
            Add design to bag
          </Button>
        </Panel>
      </aside>
    </main>
  );
}
