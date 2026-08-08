// Ported from app/baseline/page.tsx and app/state/page.tsx — the two flows are
// the same screen with a different tree, so they share one view here.

import { el } from "../components/dom.js";
import { mountWordTree } from "../components/wordTree.js";
import { baselineTree } from "../translation/baselineTree.js";
import { stateTree } from "../translation/stateTree.js";
import { navigate } from "../router.js";
import { ritual } from "../store.js";

/** Baseline flow — the sculpture. Stable identity → form, material, geometry. */
export function baselineView(outlet) {
  return treeScreen(outlet, {
    eyebrow: "The form — who you are",
    root: baselineTree,
    onComplete(path) {
      ritual.setBaselinePath(path.map((n) => n.id));
      navigate("/state");
    },
  });
}

/** Current-state flow — the weather. Momentary mind-state → light, palette, mood. */
export function stateView(outlet) {
  // The weather needs a sculpture to fall on.
  if (ritual.get().baselinePathIds.length === 0) {
    navigate("/baseline", { replace: true });
    return null;
  }
  return treeScreen(outlet, {
    eyebrow: "The weather — how you are right now",
    root: stateTree,
    onComplete(path) {
      ritual.setStatePath(path.map((n) => n.id));
      navigate("/forming");
    },
  });
}

function treeScreen(outlet, { eyebrow, root, onComplete }) {
  const host = el("div");
  outlet.appendChild(el("div.screen", el("p.eyebrow.fade-in", eyebrow), host));
  return mountWordTree(host, { root, onComplete });
}
