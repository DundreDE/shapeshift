import { LRU } from "@/lib/lru";

export const runtime = "nodejs";

export type CurrencyResponse = { rate: number; date: string };

const rateCache = new LRU<string, CurrencyResponse | null>(200);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")?.toUpperCase();
  const to = searchParams.get("to")?.toUpperCase();
  if (!from || !to) return Response.json({ error: "Missing from/to" }, { status: 400 });
  if (from === to) return Response.json({ rate: 1, date: "" } satisfies CurrencyResponse);

  const key = `${from}:${to}`;
  const hit = rateCache.get(key);
  if (hit !== undefined) {
    if (hit === null) return Response.json({ error: "Rate unavailable" }, { status: 502 });
    return Response.json(hit);
  }

  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(String(res.status));
    const data: { rates: Record<string, number>; date: string } = await res.json();
    const rate = data.rates[to];
    if (!rate) throw new Error("no rate");
    const result: CurrencyResponse = { rate, date: data.date };
    rateCache.set(key, result);
    return Response.json(result);
  } catch {
    rateCache.set(key, null);
    return Response.json({ error: "Rate unavailable" }, { status: 502 });
  }
}
