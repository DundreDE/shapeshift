"use client";

import { CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Loader2, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WeatherResponse } from "@/app/api/weather/route";
import type { WeatherData } from "@/lib/parse/weather";
import { Field, HeroNumber, Meta, Missing } from "./shared";
import type { CardProps } from "./types";

const CODE_ICON: [number[], LucideIcon, string][] = [
  [[0], Sun, "Clear"],
  [[1, 2, 3], CloudSun, "Partly cloudy"],
  [[45, 48], CloudFog, "Foggy"],
  [[51, 53, 55, 56, 57], CloudDrizzle, "Drizzle"],
  [[61, 63, 65, 66, 67, 80, 81, 82], CloudRain, "Rainy"],
  [[71, 73, 75, 77, 85, 86], CloudSnow, "Snowy"],
  [[95, 96, 99], CloudLightning, "Stormy"],
];

function describe(code: number): { Icon: LucideIcon; label: string } {
  for (const [codes, Icon, label] of CODE_ICON) if (codes.includes(code)) return { Icon, label };
  return { Icon: CloudSun, label: "Mixed" };
}

const round = (n: number) => Math.round(n);

export function WeatherCard({ data }: CardProps<WeatherData>) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "ready" | "error"; result: WeatherResponse | null }>({
    status: "idle",
    result: null,
  });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    controller.current?.abort();
    if (!data.location) return;
    const ctrl = new AbortController();
    controller.current = ctrl;
    const timer = setTimeout(async () => {
      setState((s) => ({ ...s, status: "loading" }));
      try {
        const date = data.date ? data.date.toISOString().slice(0, 10) : "";
        const res = await fetch(`/api/weather?location=${encodeURIComponent(data.location!)}&date=${date}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const result: WeatherResponse = await res.json();
        setState({ status: "ready", result });
      } catch {
        if (!ctrl.signal.aborted) setState({ status: "error", result: null });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [data.location, data.date]);

  if (!data.location) {
    return (
      <Field index={0} className="flex items-center gap-2">
        <Missing>Type a place, like weather in Lisbon tomorrow</Missing>
      </Field>
    );
  }

  if (state.status === "loading" || state.status === "idle") {
    return (
      <div className="flex items-center gap-3">
        <Field index={0} className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          <Meta>Checking the sky over {data.location}…</Meta>
        </Field>
      </div>
    );
  }

  if (state.status === "error" || !state.result) {
    return (
      <Field index={0}>
        <Missing>Couldn&apos;t reach the forecast for {data.location} right now</Missing>
      </Field>
    );
  }

  const { Icon, label } = describe(state.result.code);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Field index={0} className="flex min-w-0 flex-col gap-1">
        <Meta className="truncate">
          {state.result.place || data.location}
          {data.dayLabel ? ` · ${data.dayLabel}` : ""}
        </Meta>
        <div className="flex items-center gap-2">
          <Icon className="size-6 text-ink-2" aria-hidden />
          <HeroNumber>{round(state.result.tempMax)}°</HeroNumber>
          <span className="text-[15px] leading-[22px] text-muted-foreground">/ {round(state.result.tempMin)}°</span>
        </div>
      </Field>
      <Field index={1} className="flex flex-col items-end gap-1 text-end">
        <Meta>{label}</Meta>
        <Meta>{round(state.result.precipitation)}% rain</Meta>
      </Field>
    </div>
  );
}
