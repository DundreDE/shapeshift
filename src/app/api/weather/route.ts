import { LRU, normalizeKey } from "@/lib/lru";

export const runtime = "nodejs";

export type WeatherResponse = {
  place: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  code: number;
  date: string;
};

type GeocodeHit = { name: string; country?: string; latitude: number; longitude: number };

const geoCache = new LRU<string, GeocodeHit | null>(200);
const forecastCache = new LRU<string, WeatherResponse[] | null>(200);

async function geocode(location: string): Promise<GeocodeHit | null> {
  const key = normalizeKey(location);
  const hit = geoCache.get(key);
  if (hit !== undefined) return hit;

  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(location)}`);
    if (!res.ok) throw new Error(String(res.status));
    const data: { results?: GeocodeHit[] } = await res.json();
    const result = data.results?.[0] ?? null;
    geoCache.set(key, result);
    return result;
  } catch {
    geoCache.set(key, null);
    return null;
  }
}

async function forecast(place: GeocodeHit): Promise<WeatherResponse[] | null> {
  const key = `${place.latitude},${place.longitude}`;
  const hit = forecastCache.get(key);
  if (hit !== undefined) return hit;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(String(res.status));
    const data: {
      daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; weathercode: number[] };
    } = await res.json();
    const days = data.daily.time.map((date, i) => ({
      date,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      precipitation: data.daily.precipitation_probability_max[i],
      code: data.daily.weathercode[i],
      place: [place.name, place.country].filter(Boolean).join(", "),
    }));
    forecastCache.set(key, days);
    return days;
  } catch {
    forecastCache.set(key, null);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location")?.trim();
  const date = searchParams.get("date");
  if (!location) return Response.json({ error: "Missing location" }, { status: 400 });

  const place = await geocode(location);
  if (!place) return Response.json({ error: "Could not find that place" }, { status: 404 });

  const days = await forecast(place);
  if (!days) return Response.json({ error: "Forecast unavailable" }, { status: 502 });

  const day = (date && days.find((d) => d.date === date)) || days[0];
  return Response.json(day satisfies WeatherResponse);
}
