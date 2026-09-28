"use client";

import { Check, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { generatePassword, type PasswordData } from "@/lib/parse/password";
import { Field, Meta } from "./shared";
import type { CardProps } from "./types";

export function PasswordCard({ data, interactive }: CardProps<PasswordData>) {
  const key = JSON.stringify(data);
  const [state, setState] = useState(() => ({ key, value: generatePassword(data) }));
  if (state.key !== key) setState({ key, value: generatePassword(data) });
  const [copied, setCopied] = useState(false);

  const regenerate = () => setState((s) => ({ ...s, value: generatePassword(data) }));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.value);
      setCopied(true);
      notify("Copied to clipboard", { id: "pwd-copy" });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify("Couldn't copy — select and copy manually", { id: "pwd-copy" });
    }
  };

  const kinds = [data.upper && "A-Z", data.lower && "a-z", data.digits && "0-9", data.symbols && "!@#"].filter(Boolean).join("  ");

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Field index={0} className="flex min-w-0 flex-col gap-1.5">
        <span className="block truncate font-mono text-[19px] leading-7 font-[550] tracking-tight" aria-live="polite">
          {state.value}
        </span>
        <Meta>
          {data.length} characters · {kinds}
        </Meta>
      </Field>
      <Field index={1} className="flex gap-2">
        <Button size="icon-sm" variant="ghost" aria-label="Copy password" disabled={!interactive} onClick={copy}>
          {copied ? <Check /> : <Copy />}
        </Button>
        <Button size="sm" variant="secondary" className="gap-1.5 px-3" onClick={regenerate} disabled={!interactive}>
          <RefreshCw />
          New
        </Button>
      </Field>
    </div>
  );
}
