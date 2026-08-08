// Ported from lib/translation/translate.ts — keep the two in sync.
// ORCHESTRATOR — paths in, structured Descriptors out.
// In the Next.js app this runs on the server; here it runs in the browser,
// which is why every step of it is pure and dependency-free.

import { seedFromSignature, stableSignature } from "../hash.js";
import { gestureEnergyWord, gestureFromBaseline } from "./gesture.js";
import { route } from "./routing.js";
import { pathLabel } from "./trees.js";

export function translate(baselinePath, statePath) {
  const descriptors = route(baselinePath, statePath);
  const baselineSignature = stableSignature(baselinePath.map((n) => n.id));
  const gesture = gestureFromBaseline(baselinePath, baselineSignature);

  return {
    descriptors,
    gesture,
    gestureEnergy: gestureEnergyWord(descriptors.energy),
    baselineSignature,
    // Form-stability invariant: the seed is a function of the baseline only.
    seed: seedFromSignature(baselineSignature),
    stateLabel: pathLabel(statePath),
    baselineLabel: pathLabel(baselinePath),
  };
}
