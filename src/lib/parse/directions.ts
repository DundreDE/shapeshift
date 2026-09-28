import { tidy } from "./common";

export type DirectionsData = {
  destination: string | null;
};

const TRIGGER_RE = /\b(?:directions?|navigate|drive|walk|way|route)\s+(?:to|towards?)\s+(.+)$/i;
const HOW_RE = /\bhow (?:do|can|would|will) i (?:get|drive|walk|travel) (?:to|towards?)\s+(.+)$/i;

export function parseDirections(text: string): DirectionsData {
  const t = text.trim();
  const m = t.match(HOW_RE) ?? t.match(TRIGGER_RE);
  const destination = tidy((m ? m[1] : t).replace(/[?!.]+$/g, ""));
  return { destination: destination || null };
}

export function completeDirections(d: DirectionsData) {
  return d.destination ? 1 : 0;
}
