"use client";

import { ArrowLeftRight, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CurrencyResponse } from "@/app/api/currency/route";
import { CURRENCY_LABELS, type CurrencyData } from "@/lib/parse/currency";
import { AnimatedNumber, Field, HeroNumber, Meta, Missing } from "./shared";
import type { CardProps } from "./types";

const CODES = Object.keys(CURRENCY_LABELS);

const fmt = (n: number) => {
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 0 : abs >= 1 ? 2 : 4;
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
};

export function CurrencyCard({ data, interactive }: CardProps<CurrencyData>) {
  const [pair, setPair] = useState<{ from: string; to: string } | null>(null);
  const key = `${data.amount}|${data.from}|${data.to}`;
  const [prev, setPrev] = useState(key);
  if (prev !== key) {
    setPrev(key);
    setPair(null);
  }

  const from = pair?.from ?? data.from;
  const toRaw = pair?.to ?? data.to ?? data.from;

  const [state, setState] = useState<{ status: "idle" | "loading" | "ready" | "error"; rate: number | null }>({ status: "idle", rate: null });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    controller.current?.abort();
    if (!from || !toRaw) return;
    const ctrl = new AbortController();
    controller.current = ctrl;
    const timer = setTimeout(async () => {
      setState((s) => ({ ...s, status: "loading" }));
      try {
        const res = await fetch(`/api/currency?from=${from}&to=${toRaw}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const result: CurrencyResponse = await res.json();
        setState({ status: "ready", rate: result.rate });
      } catch {
        if (!ctrl.signal.aborted) setState({ status: "error", rate: null });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [from, toRaw]);

  if (data.amount === null || !from) {
    return (
      <Field index={0} className="flex items-center gap-2">
        <Missing>Type an amount and currency, like 100 usd in eur</Missing>
      </Field>
    );
  }

  const to = toRaw ?? from;
  const result = state.rate !== null ? data.amount * state.rate : null;

  const currencySelect = (value: string, onChange: (v: string) => void, label: string) => (
    <Select value={value} onValueChange={onChange} disabled={!interactive}>
      <SelectTrigger size="sm" aria-label={label} className="h-7 w-fit gap-1 border-none bg-secondary px-2.5 text-[13px] font-medium text-ink-2 shadow-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CODES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Field index={0} className="flex flex-col gap-2">
        <HeroNumber className="text-ink-2">{fmt(data.amount)}</HeroNumber>
        {currencySelect(from, (v) => setPair({ from: v, to }), "From currency")}
      </Field>
      <Field index={1}>
        <Button size="icon-sm" variant="ghost" aria-label="Swap currencies" disabled={!interactive} onClick={() => setPair({ from: to, to: from })}>
          <ArrowLeftRight />
        </Button>
      </Field>
      <Field index={2} className="flex min-w-0 flex-col items-end gap-2">
        <HeroNumber>
          {state.status === "loading" || state.status === "idle" ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
          ) : result === null ? (
            "—"
          ) : (
            <AnimatedNumber value={result} format={fmt} />
          )}
        </HeroNumber>
        {currencySelect(to, (v) => setPair({ from, to: v }), "To currency")}
      </Field>
      <Meta className="sr-only">
        {data.amount} {from} is {result} {to}
      </Meta>
    </div>
  );
}
