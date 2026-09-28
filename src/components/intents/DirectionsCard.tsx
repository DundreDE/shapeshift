"use client";

import { ExternalLink, Loader2, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GeocodeResponse } from "@/app/api/geocode/route";
import type { DirectionsData } from "@/lib/parse/directions";
import { Field, Meta, Missing } from "./shared";
import type { CardProps } from "./types";

export function DirectionsCard({ data }: CardProps<DirectionsData>) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "ready" | "error"; place: GeocodeResponse | null }>({
    status: "idle",
    place: null,
  });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    controller.current?.abort();
    if (!data.destination) return;
    const ctrl = new AbortController();
    controller.current = ctrl;
    const timer = setTimeout(async () => {
      setState((s) => ({ ...s, status: "loading" }));
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(data.destination!)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const place: GeocodeResponse = await res.json();
        setState({ status: "ready", place });
      } catch {
        if (!ctrl.signal.aborted) setState({ status: "error", place: null });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [data.destination]);

  if (!data.destination) {
    return (
      <Field index={0} className="flex items-center gap-2">
        <Missing>Say where to, like directions to the Brandenburg Gate</Missing>
      </Field>
    );
  }

  const query = encodeURIComponent(data.destination);
  const links = [
    { label: "Google Maps", href: `https://www.google.com/maps/dir/?api=1&destination=${query}` },
    { label: "Apple Maps", href: `https://maps.apple.com/?daddr=${query}` },
    { label: "OpenStreetMap", href: `https://www.openstreetmap.org/search?query=${query}` },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Field index={0} className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-[17px] leading-6 font-[550]">{data.destination}</span>
        </div>
        <Meta className="truncate">
          {state.status === "loading" && (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Locating…
            </span>
          )}
          {state.status === "ready" && state.place && state.place.label}
          {state.status === "error" && "Couldn't confirm the address, but the links below will still work"}
        </Meta>
      </Field>
      <Field index={1} className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-[13px] font-medium text-ink-2 shadow-xs transition-[color,background-color,scale] duration-150 ease-out hover:bg-muted active:scale-[0.96]"
          >
            {l.label}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ))}
      </Field>
    </div>
  );
}
