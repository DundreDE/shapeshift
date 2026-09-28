import * as chrono from "chrono-node";

export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const titleCase = (s: string) =>
  s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => capitalize(w))
    .join(" ");

export const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

/** Strip dangling connector words left behind after removing a phrase. */
export function tidy(s: string) {
  let out = collapse(s.replace(/[,;]+\s*$/g, "").replace(/^\s*[,;:-]+/g, ""));
  const dangling = /\s+(on|at|by|for|with|to|in|and|the|this|next|from|every)$/i;
  const leading = /^(on|at|by|for|and|the|to)\s+/i;
  for (let i = 0; i < 4; i++) {
    const next = out.replace(dangling, "").replace(leading, "");
    if (next === out) break;
    out = next;
  }
  return out.trim();
}

export type Currency = "₹" | "$" | "€" | "£";
export const DEFAULT_CURRENCY: Currency = "₹";

export function detectCurrency(text: string): Currency {
  if (/\$|\busd\b|dollars?\b/i.test(text)) return "$";
  if (/€|\beur(os?)?\b/i.test(text)) return "€";
  if (/£|\bgbp\b|pounds? sterling/i.test(text)) return "£";
  return DEFAULT_CURRENCY;
}

export const AMOUNT_RE = /(?:₹|rs\.?|inr|\$|€|£)?\s?(\d[\d,]*(?:\.\d+)?)\s?(k\b)?/i;

export function toNumber(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

/** Find the first money-like amount in the text. */
export function findAmount(text: string): { value: number; index: number; length: number } | null {
  const re = new RegExp(AMOUNT_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = toNumber(m[1]);
    if (!Number.isFinite(n)) continue;
    return { value: m[2] ? n * 1000 : n, index: m.index, length: m[0].length };
  }
  return null;
}

export type DateHit = {
  start: Date;
  end: Date | null;
  hasTime: boolean;
  text: string;
  index: number;
};

// German day-part words that hang off a bare hour ("8uhr abend", "8 uhr nachmittags"). chrono's
// German parser reads them as a separate, vague reference to "this evening" instead of merging
// them into the time it just found, so a colloquial pm hour comes back as an ambiguous am guess.
const GERMAN_PM_SUFFIX = /^\s*(abends?|nachmittags?)\b/i;
const GERMAN_AM_SUFFIX = /^\s*(morgens|vormittags?|mittags?)\b/i;

export function findDate(text: string, ref: Date = new Date()): DateHit | null {
  // German only kicks in when the English/casual parser finds nothing at all, so no existing
  // (English) input can ever be re-routed through it.
  const results = chrono.parse(text, ref, { forwardDate: true });
  const r = results[0] ?? chrono.de.parse(text, ref, { forwardDate: true })[0];
  if (!r) return null;
  // chrono is happy to read a bare number as a date; require something date-like.
  if (/^\d+$/.test(r.text.trim())) return null;

  let matchedText = r.text;
  let start = r.start.date();
  if (r.start.isCertain("hour")) {
    const hour = r.start.get("hour")!;
    const tail = text.slice(r.index + matchedText.length);
    const pmSuffix = hour >= 1 && hour <= 11 ? tail.match(GERMAN_PM_SUFFIX) : null;
    const amSuffix = pmSuffix ? null : tail.match(GERMAN_AM_SUFFIX);
    if (pmSuffix) {
      start = new Date(start);
      start.setHours(hour + 12);
      matchedText += pmSuffix[0];
    } else if (amSuffix) {
      matchedText += amSuffix[0];
    }
  }

  return {
    start,
    end: r.end ? r.end.date() : null,
    hasTime: r.start.isCertain("hour"),
    text: matchedText,
    index: r.index,
  };
}

export function removeRange(text: string, index: number, length: number) {
  return text.slice(0, index) + " " + text.slice(index + length);
}

export function formatAmount(n: number, currency: Currency = DEFAULT_CURRENCY) {
  const locale = currency === "₹" ? "en-IN" : "en-US";
  const rounded = Math.round(n * 100) / 100;
  return (
    currency +
    rounded.toLocaleString(locale, {
      minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}
