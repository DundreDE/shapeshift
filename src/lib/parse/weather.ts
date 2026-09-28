import { findDate, tidy, titleCase } from "./common";

export type WeatherData = {
  location: string | null;
  /** Resolved date to show the forecast for; defaults to today once a location is known. */
  date: Date | null;
  dayLabel: string;
};

const TRIGGER = /\b(weather|forecast|temperature|how (?:hot|cold|warm)('?s| is| it)?)\b/i;
const LOCATION_RE = /\b(?:weather|forecast)\s+(?:in|at|for|around|near)\s+([a-z][a-z .'-]*)/i;
const FALLBACK_LOCATION_RE = /\b(?:in|at|for)\s+([a-z][a-z .'-]*?)\s*$/i;

export function parseWeather(text: string, ref: Date = new Date()): WeatherData {
  const t = text.trim();
  if (!TRIGGER.test(t)) return { location: null, date: null, dayLabel: "" };

  const hit = findDate(t, ref);
  const withoutDate = hit ? tidy(t.slice(0, hit.index) + " " + t.slice(hit.index + hit.text.length)) : t;

  const direct = withoutDate.match(LOCATION_RE) ?? withoutDate.match(FALLBACK_LOCATION_RE);
  const location = direct ? titleCase(tidy(direct[1]).replace(/[?!.]+$/, "")) : null;

  const date = hit ? hit.start : location ? ref : null;
  const dayLabel = date ? dayLabelFor(date, ref) : "";

  return { location: location || null, date, dayLabel };
}

function dayLabelFor(date: Date, ref: Date) {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(date) - startOf(ref)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days < 7) return date.toLocaleDateString("en-US", { weekday: "long" });
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function completeWeather(d: WeatherData) {
  return (d.location ? 0.7 : 0) + (d.date ? 0.3 : 0);
}
