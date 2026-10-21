export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length > 10) return digits.slice(-10);
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function phonesMatch(left: string, right: string): boolean {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  return a.length >= 7 && a === b;
}

export function newAccessToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const ORDER_KEYS = "aznik-order-keys";
const INQUIRY_KEYS = "aznik-inquiry-keys";

function readMap(key: string): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "{}") as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function rememberOrder(id: string, token: string) {
  const all = readMap(ORDER_KEYS);
  all[id] = token;
  localStorage.setItem(ORDER_KEYS, JSON.stringify(all));
}

export function orderToken(id: string): string {
  return readMap(ORDER_KEYS)[id] ?? "";
}

export function rememberInquiry(id: string, token: string) {
  const all = readMap(INQUIRY_KEYS);
  all[id] = token;
  localStorage.setItem(INQUIRY_KEYS, JSON.stringify(all));
}

export function rememberPhone(id: string, phone: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(`aznik-phone:${id}`, phone);
}

export function orderPhone(id: string): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(`aznik-phone:${id}`) ?? "";
}

export function inquiryToken(id: string): string {
  return readMap(INQUIRY_KEYS)[id] ?? "";
}

export function inquiryTokens(): string[] {
  return Object.values(readMap(INQUIRY_KEYS)).filter((token) => token.length > 10);
}
