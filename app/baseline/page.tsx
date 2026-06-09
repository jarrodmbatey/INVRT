"use client";

// Baseline flow — the sculpture. Stable identity → form, material, geometry.

import { useRouter } from "next/navigation";
import WordTree from "@/components/tree/WordTree";
import { baselineTree } from "@/lib/translation/baselineTree";
import { useInvrtStore } from "@/lib/store/useInvrtStore";
import type { TreeNode } from "@/lib/types";

export default function BaselinePage() {
  const router = useRouter();
  const setBaselinePath = useInvrtStore((s) => s.setBaselinePath);

  function handleComplete(path: TreeNode[]) {
    setBaselinePath(path.map((n) => n.id));
    router.push("/state");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center py-24">
      <p className="fade-in mb-2 text-xs tracking-[0.3em] text-(--color-ink-faint) uppercase">
        The form — who you are
      </p>
      <WordTree root={baselineTree} onComplete={handleComplete} />
    </div>
  );
}
