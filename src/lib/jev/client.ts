import "server-only";
import { APIUserAbortError, TypeSafeClient } from "@typesafe-ai/sdk";
import { questions, QUESTION_COUNT } from "./questions";
import type { Answer, IntentResult } from "./types";

let client: TypeSafeClient | null = null;
let warned = false;

/** Which Jev provider to talk to. TypeSafe direct by default; Hack Club AI's proxy as an alternative. */
export type JevProvider = "typesafe" | "hackclub";

export function jevProvider(): JevProvider {
  return process.env.JEV_PROVIDER === "hackclub" ? "hackclub" : "typesafe";
}

const HACKCLUB_DEFAULT_BASE_URL = "https://ai.hackclub.com/proxy/v1/jev";

/** The API key for whichever provider is active. */
export function activeApiKey(): string | undefined {
  return jevProvider() === "hackclub" ? process.env.HACKCLUB_API_KEY : process.env.TYPESAFE_API_KEY;
}

/** A real-looking key: not empty and not a copied placeholder like "sk-..." or "your-key-here". */
export function looksLikeKey(key: string | undefined): key is string {
  const k = key?.trim() ?? "";
  return k.length >= 12 && !/\.\.\.|your|xxx|placeholder|changeme|<|>/i.test(k);
}

/**
 * Offline by default. The online Jev model is used only when a real API key is set for the
 * active provider, and NEXT_PUBLIC_USE_MOCK=true can still force offline for UI work and demos.
 */
export function classifierMode(): { mode: "online" | "offline"; reason: string } {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return { mode: "offline", reason: "NEXT_PUBLIC_USE_MOCK=true" };
  const provider = jevProvider();
  if (!looksLikeKey(activeApiKey())) {
    const envVar = provider === "hackclub" ? "HACKCLUB_API_KEY" : "TYPESAFE_API_KEY";
    return { mode: "offline", reason: `no ${envVar} set` };
  }
  return { mode: "online", reason: `using ${process.env.JEV_MODEL || "jev-latest"} via ${provider}` };
}

export function warnMockOnce(reason: string) {
  if (warned) return;
  warned = true;
  console.info(`[shapeshift] Offline classifier (jev-offline): ${reason}. Add a TypeSafe or Hack Club key to .env.local to go online.`);
}

function getClient() {
  if (!client) {
    const provider = jevProvider();
    client = new TypeSafeClient({
      apiKey: activeApiKey(),
      baseURL: provider === "hackclub" ? process.env.HACKCLUB_BASE_URL || HACKCLUB_DEFAULT_BASE_URL : undefined,
      defaultModel: process.env.JEV_MODEL || "jev-latest",
      // One fast attempt: a stale answer is worse than falling back to the mock.
      retry: { maxRetries: 0 },
      timeout: 2500,
    });
  }
  return client;
}

function answer<T extends string>(r: { choice: T; confidence: number; probabilities: { readonly [k in T]: number } }): Answer<T> {
  return { value: r.choice, confidence: r.confidence, probabilities: { ...r.probabilities } as Partial<Record<T, number>> };
}

/** One call, every question in parallel. Throws on network / API errors. */
export async function classifyWithJev(text: string, signal?: AbortSignal): Promise<IntentResult> {
  const started = performance.now();
  const res = await getClient().systemOne({ state: { text }, questions }, { signal });
  const latencyMs = Math.round(performance.now() - started);
  const a = res.answers;

  return {
    intent: answer(a.intent),
    readiness: a.readiness.score,
    signals: {
      isQuestion: a.isQuestion.noul,
      recurring: a.recurring.noul,
      urgency: { score: a.urgency.score, confidence: a.urgency.confidence },
      tone: answer(a.tone),
      eventMode: answer(a.eventMode),
      transport: answer(a.transport),
      tripType: answer(a.tripType),
      expenseCategory: answer(a.expenseCategory),
      colorMood: answer(a.colorMood),
      timerKind: answer(a.timerKind),
      hasExplicitOptions: a.hasExplicitOptions.noul,
      isShoppingList: a.isShoppingList.noul,
    },
    latencyMs,
    questionCount: QUESTION_COUNT,
    model: res.model,
    source: "jev",
  };
}

export { APIUserAbortError };
