"use client";

// Current-state flow — the weather. Momentary mind-state → light, palette, mood.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import WordTree from "@/components/tree/WordTree";
import { stateTree } from "@/lib/translation/stateTree";
import { useInvrtStore } from "@/lib/store/useInvrtStore";
import type { TreeNode } from "@/lib/types";

export default function StatePage() {
  const router = useRouter();
  const baselinePathIds = useInvrtStore((s) => s.baselinePathIds);
  const setStatePath = useInvrtStore((s) => s.setStatePath);

  // The weather needs a sculpture to fall on.
  useEffect(() => {
    if (baselinePathIds.length === 0) router.replace("/baseline");
  }, [baselinePathIds, router]);

  function handleComplete(path: TreeNode[]) {
    setStatePath(path.map((n) => n.id));
    router.push("/forming");
  }

  if (baselinePathIds.length === 0) return null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center py-24">
      <p className="fade-in mb-2 text-xs tracking-[0.3em] text-(--color-ink-faint) uppercase">
        The weather — how you are right now
      </p>
      <WordTree root={stateTree} onComplete={handleComplete} />
    </div>
  );
}
