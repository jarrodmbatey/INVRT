// ORCHESTRATOR — paths in, structured Descriptors out.
// Pure TypeScript: the /api/generate handler runs this on the server;
// the forming page uses the same code for the deterministic control render.

import type { Translation, TreeNode } from "../types";
import { seedFromSignature, stableSignature } from "../hash";
import { gestureEnergyWord, gestureFromBaseline } from "./gesture";
import { route } from "./routing";
import { pathLabel } from "./trees";

export function translate(baselinePath: TreeNode[], statePath: TreeNode[]): Translation {
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
