"use client";

// Generic tap-through tree renderer. One question at a time; choosing a word
// advances with a soft transition. Data-driven — works for both the baseline
// tree and the current-state tree.

import { useState } from "react";
import type { TreeNode } from "@/lib/types";
import WordChoice from "./WordChoice";

interface Props {
  root: TreeNode;
  /** Called with the full chosen path (root-child → leaf). */
  onComplete: (path: TreeNode[]) => void;
}

export default function WordTree({ root, onComplete }: Props) {
  const [path, setPath] = useState<TreeNode[]>([]);
  const current = path.length === 0 ? root : path[path.length - 1];

  function choose(node: TreeNode) {
    const nextPath = [...path, node];
    if (node.children?.length) {
      setPath(nextPath);
    } else {
      onComplete(nextPath);
    }
  }

  function back() {
    setPath((p) => p.slice(0, -1));
  }

  return (
    // Keyed by depth so each level re-runs its entrance fades.
    <div key={path.length} className="mx-auto w-full max-w-2xl px-6">
      <p className="fade-in text-center text-sm tracking-[0.25em] text-(--color-ink-faint) uppercase">
        {path.length === 0 ? " " : path.map((n) => n.label).join(" · ")}
      </p>

      <h1 className="fade-up mt-6 text-center font-(family-name:--font-display) text-xl text-(--color-ink-dim) italic sm:text-2xl">
        {current.prompt}
      </h1>

      <div className="mt-12 space-y-1">
        {current.children?.map((child, i) => (
          <WordChoice key={child.id} label={child.label} index={i} onSelect={() => choose(child)} />
        ))}
      </div>

      <div className="mt-16 flex justify-center">
        {path.length > 0 && (
          <button
            onClick={back}
            className="fade-in text-xs tracking-[0.2em] text-(--color-ink-faint) uppercase transition-colors duration-500 hover:text-(--color-ink-dim)"
          >
            back
          </button>
        )}
      </div>
    </div>
  );
}
