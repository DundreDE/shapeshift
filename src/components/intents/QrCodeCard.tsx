"use client";

import qrcode from "qrcode-generator";
import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import type { QrcodeData } from "@/lib/parse/qrcode";
import { Field, Meta, Missing } from "./shared";
import type { CardProps } from "./types";

function buildMatrix(payload: string): boolean[][] | null {
  try {
    const qr = qrcode(0, "M");
    qr.addData(payload);
    qr.make();
    const size = qr.getModuleCount();
    return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => qr.isDark(row, col)));
  } catch {
    return null;
  }
}

export function QrCodeCard({ data, interactive }: CardProps<QrcodeData>) {
  const [copied, setCopied] = useState(false);
  const matrix = useMemo(() => (data.payload ? buildMatrix(data.payload) : null), [data.payload]);

  if (!data.payload) {
    return (
      <Field index={0} className="flex items-center gap-2">
        <Missing>Say what to encode, like qr code for https://vercel.com</Missing>
      </Field>
    );
  }

  if (!matrix) {
    return (
      <Field index={0}>
        <Missing>That&apos;s too much text for a QR code — try something shorter</Missing>
      </Field>
    );
  }

  const size = matrix.length;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.payload!);
      setCopied(true);
      notify("Copied to clipboard", { id: "qr-copy" });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify("Couldn't copy — select and copy manually", { id: "qr-copy" });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Field index={0}>
        <svg viewBox={`0 0 ${size} ${size}`} width={104} height={104} role="img" aria-label={`QR code for ${data.payload}`} className="rounded-sm bg-white p-1">
          {matrix.map((row, r) =>
            row.map((dark, c) => (dark ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="black" /> : null)),
          )}
        </svg>
      </Field>
      <Field index={1} className="flex min-w-0 flex-1 flex-col gap-2">
        <Meta className="line-clamp-2 break-all">{data.payload}</Meta>
        <Button size="sm" variant="secondary" className="w-fit gap-1.5 px-3" onClick={copy} disabled={!interactive}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy text"}
        </Button>
      </Field>
    </div>
  );
}
