export type PasswordData = {
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
};

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}";

export function parsePassword(text: string): PasswordData {
  const t = text.toLowerCase();

  const lenMatch = t.match(/\b(\d{1,3})\s*(?:-|\s)?(?:char(?:acter)?s?|digits?|long)?\b/);
  const length = lenMatch ? clamp(Number(lenMatch[1]), 4, 128) : 16;

  const noSymbols = /\b(no|without)\s+symbols?\b|\bletters?\s*(?:and\s*(?:numbers|digits))?\s*only\b|\balphanumeric\b/.test(t);
  const noDigits = /\b(no|without)\s+(?:numbers|digits)\b|\bletters?\s*only\b/.test(t);
  const noUpper = /\blowercase\s*only\b/.test(t);
  const simple = /\bsimple|easy to (?:read|type)|memorable\b/.test(t);

  return {
    length,
    upper: !noUpper,
    lower: true,
    digits: !noDigits,
    symbols: !noSymbols && !simple,
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
}

function alphabetFor(d: PasswordData): string {
  let alphabet = "";
  if (d.lower) alphabet += LOWER;
  if (d.upper) alphabet += UPPER;
  if (d.digits) alphabet += DIGITS;
  if (d.symbols) alphabet += SYMBOLS;
  return alphabet || LOWER;
}

/** Cryptographically random when available, `Math.random` otherwise (e.g. in tests). */
export function generatePassword(d: PasswordData, rand: () => number = secureRandom): string {
  const alphabet = alphabetFor(d);
  return Array.from({ length: d.length }, () => alphabet[Math.floor(rand() * alphabet.length)]).join("");
}

function secureRandom(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
  }
  return Math.random();
}

export function completePassword() {
  return 1;
}
