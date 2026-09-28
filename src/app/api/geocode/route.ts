import { LRU, normalizeKey } from "@/lib/lru";

export const runtime = "nodejs";

export type GeocodeResponse = { label: string; lat: number; lon: number };

const cache = new LRU<string, GeocodeResponse | null>(200);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return Response.json({ error: "Missing q" }, { status: 400 });

  const key = normalizeKey(q);
  const hit = cache.get(key);
  if (hit !== undefined) {
    if (hit === null) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(hit);
  }

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": "shapeshift-app (https://github.com/anishfn/shapeshift)" },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) throw new Error(String(res.status));
    const data: { display_name: string; lat: string; lon: string }[] = await res.json();
    const hit0 = data[0];
    if (!hit0) {
      cache.set(key, null);
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const result: GeocodeResponse = { label: hit0.display_name, lat: Number(hit0.lat), lon: Number(hit0.lon) };
    cache.set(key, result);
    return Response.json(result);
  } catch {
    cache.set(key, null);
    return Response.json({ error: "Lookup failed" }, { status: 502 });
  }
}
