export type DesignCatalog = {
  types: { id: string; name: string; basePkr: number; sizes: { label: string }[] }[];
  patterns: { id: string; name: string; extraPkr: number }[];
  extras: { id: string; name: string; extraPkr: number }[];
  yarns: { id: string; name: string; extraPkr: number }[];
};

export type DesignSuggestion = {
  typeId: string;
  patternId: string;
  colorIds: string[];
  size: string;
  extraIds: string[];
  personalization: string;
  material: string;
  needsQuote: boolean;
  quoteReason: string;
  conceptPrompt: string;
};

const MATERIALS = ["Cotton", "Acrylic", "Wool blend", "Chenille"];

export function aiConfigured(): boolean {
  return Boolean(process.env.XAI_API_KEY?.trim());
}

function missing(kind: "chat" | "image") {
  const what = kind === "image" ? "Image generation" : "Design assistance";
  return {
    ok: false as const,
    configured: false,
    error: `${what} is not connected. The shop needs an xAI API key on the server (XAI_API_KEY). Nothing was generated, and no picture is being shown as if it were.`,
  };
}

async function grok(body: unknown): Promise<{ ok: true; json: unknown } | { ok: false; error: string }> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: missing("chat").error };
  let response: Response;
  try {
    response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "The design assistant could not be reached. Nothing was invented in its place." };
  }
  if (!response.ok) return { ok: false, error: `The design assistant returned an error (${response.status}). No design was generated.` };
  return { ok: true, json: await response.json() };
}

function suggestionFrom(raw: unknown, catalog: DesignCatalog): DesignSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const type = catalog.types.find((item) => item.id === row.typeId);
  const pattern = catalog.patterns.find((item) => item.id === row.patternId);
  const colorIds = Array.isArray(row.colorIds)
    ? row.colorIds.map((id) => String(id)).filter((id) => catalog.yarns.some((yarn) => yarn.id === id)).slice(0, 4)
    : [];
  const extraIds = Array.isArray(row.extraIds)
    ? row.extraIds.map((id) => String(id)).filter((id) => catalog.extras.some((extra) => extra.id === id)).slice(0, 8)
    : [];
  const size = type?.sizes.find((item) => item.label === row.size)?.label ?? type?.sizes[0]?.label ?? "";
  const material = MATERIALS.includes(String(row.material)) ? String(row.material) : "Cotton";
  return {
    typeId: type?.id ?? "",
    patternId: pattern?.id ?? catalog.patterns[0]?.id ?? "",
    colorIds,
    size,
    extraIds,
    personalization: typeof row.personalization === "string" ? row.personalization.slice(0, 60) : "",
    material,
    needsQuote: row.needsQuote === true || !type || type.basePkr <= 0,
    quoteReason: typeof row.quoteReason === "string" ? row.quoteReason.slice(0, 300) : "",
    conceptPrompt: typeof row.conceptPrompt === "string" ? row.conceptPrompt.slice(0, 800) : "",
  };
}

export async function refineCrochetDesign(
  messages: { role: "user" | "assistant"; content: string }[],
  catalog: DesignCatalog,
): Promise<
  | { ok: true; configured: true; reply: string; suggestion: DesignSuggestion | null }
  | { ok: false; configured: boolean; error: string }
> {
  if (!aiConfigured()) return missing("chat");
  const trimmed = messages
    .filter((message) => message.content.trim())
    .slice(-6)
    .map((message) => ({ role: message.role, content: message.content.slice(0, 600) }));
  if (!trimmed.length) return { ok: false, configured: true, error: "Describe the piece you imagine first." };
  const catalogText = JSON.stringify({
    types: catalog.types.map((type) => ({ id: type.id, name: type.name, basePkr: type.basePkr, sizes: type.sizes.map((size) => size.label) })),
    patterns: catalog.patterns,
    extras: catalog.extras,
    yarns: catalog.yarns,
    materials: MATERIALS,
  });
  const result = await grok({
    model: "grok-4.5",
    temperature: 0.4,
    max_tokens: 700,
    messages: [
      {
        role: "system",
        content:
          "You help a customer of Aznik Crochets describe a handmade crochet piece. Reply with JSON only, no markdown. " +
          "Use only ids from the catalog. If the idea cannot be priced from those options (unusual shape, portrait, something not listed), set needsQuote true and leave typeId empty. " +
          "Never invent a price. Schema: {\"reply\":\"short warm reply\",\"typeId\":\"\",\"patternId\":\"\",\"colorIds\":[],\"size\":\"\",\"extraIds\":[],\"personalization\":\"\",\"material\":\"Cotton\",\"needsQuote\":false,\"quoteReason\":\"\",\"conceptPrompt\":\"a crochet product photo prompt with no text in the image\"}. " +
          `Catalog: ${catalogText}`,
      },
      ...trimmed,
    ],
  });
  if (!result.ok) return { ok: false, configured: true, error: result.error };
  const content =
    (result.json as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) return { ok: false, configured: true, error: "The design assistant returned an empty reply." };
  const jsonText = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(jsonText) as { reply?: string };
    return {
      ok: true,
      configured: true,
      reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.slice(0, 800) : content.slice(0, 800),
      suggestion: suggestionFrom(parsed, catalog),
    };
  } catch {
    return { ok: true, configured: true, reply: content.slice(0, 800), suggestion: null };
  }
}

export async function imagineCrochetConcept(
  prompt: string,
): Promise<{ ok: true; configured: true; url: string } | { ok: false; configured: boolean; error: string }> {
  if (!aiConfigured()) return missing("image");
  const apiKey = process.env.XAI_API_KEY?.trim() ?? "";
  const safe = prompt.replace(/\s+/g, " ").trim().slice(0, 800);
  if (safe.length < 8) return { ok: false, configured: true, error: "Describe the piece before asking for a concept image." };
  let response: Response;
  try {
    response = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "grok-imagine-image",
        prompt: `Handmade crochet product concept, soft daylight, pastel yarn, no text, no logos, no people, not a photograph of a finished commission. ${safe}`,
        n: 1,
        response_format: "url",
      }),
    });
  } catch {
    return { ok: false, configured: true, error: "Image generation could not be reached. No picture was created." };
  }
  if (!response.ok) {
    return { ok: false, configured: true, error: `Image generation failed (${response.status}). No picture was created.` };
  }
  const body = (await response.json()) as { data?: { url?: string }[] };
  const url = body.data?.[0]?.url ?? "";
  if (!url.startsWith("https://")) {
    return { ok: false, configured: true, error: "The image service did not return a usable picture. Nothing is shown in its place." };
  }
  return { ok: true, configured: true, url };
}
