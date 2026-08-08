// Ported from components/tree/WordTree.tsx + WordChoice.tsx.
//
// Generic tap-through tree renderer. One question at a time; choosing a word
// advances with a soft transition. Data-driven — works for both the baseline
// tree and the current-state tree.

import { clear, delay, el } from "./dom.js";

export function mountWordTree(container, { root, onComplete }) {
  let path = [];

  function choose(node) {
    const nextPath = [...path, node];
    if (node.children?.length) {
      path = nextPath;
      render();
    } else {
      onComplete(nextPath);
    }
  }

  function back() {
    path = path.slice(0, -1);
    render();
  }

  function render() {
    const current = path.length === 0 ? root : path[path.length - 1];
    // Rebuilt at every depth so each level re-runs its entrance fades — the
    // JSX did this with key={path.length}.
    clear(container);
    container.appendChild(
      el(
        "div.tree",
        el("p.tree-crumbs.fade-in", path.length === 0 ? " " : path.map((n) => n.label).join(" · ")),
        el("h1.tree-question.fade-up", current.prompt ?? ""),
        el(
          "div.tree-choices",
          (current.children ?? []).map((child, i) =>
            delay(
              el(
                "button.word-choice.fade-up",
                { type: "button", onClick: () => choose(child) },
                el("span.word-choice-label", child.label),
                el("span.word-choice-rule"),
              ),
              180 + i * 130,
            ),
          ),
        ),
        el(
          "div.tree-back",
          path.length > 0 ? el("button.link-quiet.fade-in", { type: "button", onClick: back }, "back") : null,
        ),
      ),
    );
  }

  render();
  return { dispose: () => clear(container) };
}
