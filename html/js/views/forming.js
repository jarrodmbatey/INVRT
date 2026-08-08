// Ported from app/forming/page.tsx.
//
// Forming — emergence, not a spinner. The sculpture assembles while the control
// map is exported and the artwork rendered. In the Next.js app the wait is the
// Replicate round-trip (30–60s); rendering locally takes about a second, so a
// minimum dwell keeps the emergence a ritual instead of a flash.

import { clear, el } from "../components/dom.js";
import { mountSpherePreview } from "../sphere/preview.js";
import { navigate } from "../router.js";
import { resolveBaselinePath } from "../translation/trees.js";
import { ritual } from "../store.js";
import { generate } from "../render/providers.js";

const PHRASES = [
  "Listening to what you chose…",
  "Finding the form that holds it…",
  "Letting the light fall the way you feel…",
  "Almost — it is taking shape…",
];

const EMERGENCE_MS = 4000;
const MIN_DWELL_MS = 4200;

export function formingView(outlet) {
  const { baselinePathIds, statePathIds } = ritual.get();

  let baselinePath = null;
  try {
    baselinePath = baselinePathIds.length ? resolveBaselinePath(baselinePathIds) : null;
  } catch {
    baselinePath = null;
  }

  // Guard: this screen only makes sense mid-ritual.
  if (!baselinePath || statePathIds.length === 0) {
    navigate("/", { replace: true });
    return null;
  }

  const stage = el("div.forming-stage");
  const copy = el("div.forming-copy");
  outlet.appendChild(el("div.forming", stage, copy));

  let preview = null;
  try {
    preview = mountSpherePreview(stage, { baselinePath, spinSpeed: 0.18, emergence: 0, alpha: false, fit: 0.5 });
  } catch (e) {
    console.warn("[invrt] forming preview unavailable:", e);
  }

  let disposed = false;
  let raf = 0;
  let phraseTimer = 0;
  let phraseIdx = 0;

  function showPhrase() {
    clear(copy);
    copy.appendChild(el("p.forming-phrase.breathe.fade-in", PHRASES[phraseIdx]));
  }
  showPhrase();

  // Emergence ramp + rotating copy.
  const start = performance.now();
  const tick = (now) => {
    if (disposed) return;
    preview?.setEmergence(Math.min(1, (now - start) / EMERGENCE_MS));
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  phraseTimer = setInterval(() => {
    phraseIdx = Math.min(phraseIdx + 1, PHRASES.length - 1);
    showPhrase();
  }, 4500);

  function fail(message) {
    if (disposed) return;
    clear(copy);
    copy.appendChild(
      el(
        "div",
        el("p.forming-error-title", "The forming was interrupted."),
        el("p.error-text", message),
        el(
          "div",
          { style: { marginTop: "1.5rem" } },
          el("button.button.button-lg", { type: "button", onClick: () => navigate("/forming") }, "Try again"),
        ),
      ),
    );
  }

  // Export the control map and run the generation. Once.
  const run = async () => {
    try {
      const began = performance.now();
      const record = await generate({ baselinePathIds, statePathIds });
      const remaining = MIN_DWELL_MS - (performance.now() - began);
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
      if (disposed) return;
      ritual.setLastGenerationId(record.id);
      navigate(`/result/${record.id}`, { replace: true });
    } catch (e) {
      console.error("[invrt] generation failed:", e);
      fail(e instanceof Error ? e.message : "Something interrupted the forming.");
    }
  };
  // Give the first paint a beat before the heavy work.
  const kickoff = setTimeout(run, 600);

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      clearInterval(phraseTimer);
      clearTimeout(kickoff);
      preview?.dispose();
    },
  };
}
