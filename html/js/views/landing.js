// Ported from app/page.tsx + components/ui/HeroSphere.tsx.

import { delay, el } from "../components/dom.js";
import { mountSpherePreview } from "../sphere/preview.js";
import { baselineTree } from "../translation/baselineTree.js";

export function landingView(outlet) {
  const stage = el("div.hero-sphere.fade-in-slow");

  outlet.appendChild(
    el(
      "div.landing",
      stage,
      el(
        "div.landing-copy",
        el("h1.landing-title.fade-up", "INVRT"),
        delay(el("p.landing-tagline.fade-up", "Your signature, rendered"), 250),
        delay(
          el(
            "p.landing-lede.fade-up",
            "What lives inside you, turned outward into form. A stable shape that is yours alone — lit and weathered by how you are tonight.",
          ),
          500,
        ),
        delay(
          el("div.landing-cta.fade-up", el("a.button.button-lg", { href: "#/baseline" }, "Begin")),
          800,
        ),
      ),
    ),
  );

  // Pure atmosphere: the "Current" archetype, turning slowly behind the words.
  const current = baselineTree.children.find((n) => n.id === "b_current");
  let preview = null;
  try {
    preview = mountSpherePreview(stage, { baselinePath: [current], spinSpeed: 0.07, fit: 0.62 });
  } catch (e) {
    // No WebGL — the landing still reads perfectly without the form behind it.
    console.warn("[invrt] hero sphere unavailable:", e);
  }

  return { dispose: () => preview?.dispose() };
}
