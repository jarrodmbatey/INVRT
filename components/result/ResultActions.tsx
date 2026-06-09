"use client";

// Actions under the artwork: regenerate, new state from this baseline, download.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useInvrtStore } from "@/lib/store/useInvrtStore";

interface Props {
  generationId: string;
  baselineId: string;
  baselinePathIds: string[];
  downloadHref?: string;
}

const actionClass =
  "border border-(--color-line) px-6 py-3 text-[11px] tracking-[0.25em] uppercase " +
  "text-(--color-ink-dim) transition-all duration-500 hover:border-(--color-accent) " +
  "hover:text-(--color-accent) disabled:opacity-40 disabled:pointer-events-none";

export default function ResultActions({
  generationId,
  baselineId,
  baselinePathIds,
  downloadHref,
}: Props) {
  const router = useRouter();
  const continueFromBaseline = useInvrtStore((s) => s.continueFromBaseline);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateFromId: generationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Regeneration failed");
      router.push(`/result/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regeneration failed");
      setBusy(false);
    }
  }

  function newState() {
    continueFromBaseline(baselinePathIds, baselineId);
    router.push("/state");
  }

  return (
    <div className="fade-up mt-12 flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button onClick={regenerate} disabled={busy} className={actionClass}>
          {busy ? "Forming…" : "Regenerate"}
        </button>
        <button onClick={newState} disabled={busy} className={actionClass}>
          New state, same form
        </button>
        {downloadHref && (
          <a href={downloadHref} download className={actionClass}>
            Download
          </a>
        )}
      </div>
      {error && <p className="text-xs text-(--color-ink-faint)">{error}</p>}
    </div>
  );
}
