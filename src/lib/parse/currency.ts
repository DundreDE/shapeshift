export type CurrencyData = {
  amount: number | null;
  from: string | null;
  to: string | null;
};

/** Words and symbols → ISO 4217 codes. Longest keys are matched first. */
export const CURRENCY_ALIASES: Record<string, string> = {
  usd: "USD", dollars: "USD", dollar: "USD", "us dollars": "USD", "$": "USD",
  eur: "EUR", euros: "EUR", euro: "EUR", "€": "EUR",
  gbp: "GBP", pounds: "GBP", pound: "GBP", quid: "GBP", "£": "GBP",
  inr: "INR", rupees: "INR", rupee: "INR", "₹": "INR", rs: "INR",
  jpy: "JPY", yen: "JPY", "¥": "JPY",
  aud: "AUD", "australian dollars": "AUD",
  cad: "CAD", "canadian dollars": "CAD",
  chf: "CHF", francs: "CHF",
  cny: "CNY", yuan: "CNY", rmb: "CNY",
  sgd: "SGD", "singapore dollars": "SGD",
  aed: "AED", dirhams: "AED",
};

export const CURRENCY_LABELS: Record<string, string> = {
  USD: "US Dollar", EUR: "Euro", GBP: "British Pound", INR: "Indian Rupee", JPY: "Japanese Yen",
  AUD: "Australian Dollar", CAD: "Canadian Dollar", CHF: "Swiss Franc", CNY: "Chinese Yuan",
  SGD: "Singapore Dollar", AED: "UAE Dirham",
};

const CURRENCY_PATTERN = Object.keys(CURRENCY_ALIASES)
  .sort((a, b) => b.length - a.length)
  .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

const NUM = `-?\\d[\\d,]*(?:\\.\\d+)?`;
const FULL_RE = new RegExp(`(${NUM})\\s*(${CURRENCY_PATTERN})\\s+(?:to|in|into|as|=|->)\\s+(${CURRENCY_PATTERN})(?![a-z])`, "i");
const TRAILING_RE = new RegExp(`(${NUM})\\s?(${CURRENCY_PATTERN})(?![a-z])`, "i");
const LEADING_RE = new RegExp(`(${CURRENCY_PATTERN})\\s?(${NUM})`, "i");

function toNumber(raw: string) {
  return Number(raw.replace(/,/g, ""));
}

export function parseCurrency(text: string): CurrencyData {
  const t = text.toLowerCase();

  const full = t.match(FULL_RE);
  if (full) {
    const from = CURRENCY_ALIASES[full[2]];
    const to = CURRENCY_ALIASES[full[3]];
    if (from !== to) return { amount: toNumber(full[1]), from, to };
  }

  const trailing = t.match(TRAILING_RE);
  if (trailing) {
    const from = CURRENCY_ALIASES[trailing[2]];
    return { amount: toNumber(trailing[1]), from, to: from === "USD" ? "EUR" : "USD" };
  }

  const leading = t.match(LEADING_RE);
  if (leading) {
    const from = CURRENCY_ALIASES[leading[1]];
    return { amount: toNumber(leading[2]), from, to: from === "USD" ? "EUR" : "USD" };
  }

  return { amount: null, from: null, to: null };
}

export function completeCurrency(d: CurrencyData) {
  return (d.amount !== null ? 0.4 : 0) + (d.from ? 0.3 : 0) + (d.to ? 0.3 : 0);
}
