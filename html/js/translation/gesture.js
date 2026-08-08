// Ported from lib/translation/gesture.ts — keep the two in sync.
// GESTURE — the signature path, rendered as an abstract stroke threading the form.
//
// Design decision (per spec): the structural gesture derives from the BASELINE
// path only, so it is stable — part of the sculpture. The current state
// modulates only the gesture's energy *in words*, never its geometry.

import { mulberry32, seedFromSignature } from "../hash.js";
import { baselineTree } from "./baselineTree.js";
import { pathIndices } from "./trees.js";
import { gestureWordByFamily } from "./vocabulary.js";

/**
 * Deterministic control points for the gesture curve, in the sculpture's
 * local space (sculpture ≈ unit sphere). 4–7 points feeding a CatmullRomCurve3.
 */
function makeCurvePoints(family, complexity, curvature, seed) {
  const rand = mulberry32(seed);
  const count = Math.min(7, Math.max(4, 3 + complexity)); // path of 3 → 6 points
  const points = [];

  // A stable axis for the stroke, picked deterministically.
  const theta = rand() * Math.PI * 2;
  const tilt = (rand() - 0.5) * 1.2;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // 0 → 1 along the stroke
    switch (family) {
      case "fracture": {
        // A jagged line crossing the form: sharp lateral breaks.
        const x = (t - 0.5) * 2.3;
        const breakAmp = 0.38 * curvature;
        const y = (rand() - 0.5) * 2 * breakAmp + Math.sin(t * Math.PI) * 0.15;
        const z = (rand() - 0.5) * 2 * breakAmp;
        points.push(rotateY([x, y, z], theta));
        break;
      }
      case "ribbon": {
        // A smooth winding s-curve wrapping the form.
        const angle = theta + t * Math.PI * (1.2 + curvature);
        const r = 0.95 + 0.25 * Math.sin(t * Math.PI);
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = (t - 0.5) * 1.6 + Math.sin(t * Math.PI * 2) * 0.18 * curvature;
        points.push([x, y, z]);
        break;
      }
      case "contour": {
        // An arc hugging the surface — slow, close, patient.
        const sweep = Math.PI * (0.9 + 0.6 * curvature);
        const angle = theta + (t - 0.5) * sweep;
        const r = 1.06 + 0.05 * Math.sin(t * Math.PI * 3) * curvature;
        const y = tilt * (t - 0.5) * 0.9;
        points.push([Math.cos(angle) * r, y, Math.sin(angle) * r]);
        break;
      }
      case "spark-thread": {
        // A thread darting from the core outward, past the surface.
        const r = 0.15 + t * (1.35 + 0.3 * curvature);
        const wobble = (rand() - 0.5) * 0.3 * curvature;
        const angle = theta + wobble + t * 0.6;
        const y = (t - 0.4) * (1.1 + tilt) + wobble;
        points.push([Math.cos(angle) * r, y, Math.sin(angle) * r]);
        break;
      }
    }
  }
  return points;
}

function rotateY([x, y, z], angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c + z * s, y, -x * s + z * c];
}

/** The stable, structural gesture — a pure function of the baseline path. */
export function gestureFromBaseline(baselinePath, signature) {
  const family = baselinePath[0].descriptors?.pathBias ?? "contour";
  const idxSeq = pathIndices(baselineTree, baselinePath);
  const complexity = baselinePath.length; // shallow → simple, deeper → more articulated
  // Curvature in [0.25, 1]: deterministic from the choice indices at each level.
  const curvature =
    0.25 + 0.75 * ((idxSeq.reduce((acc, idx, i) => acc + idx * (i * 2 + 1), 0) % 7) / 6);
  const controlPoints = makeCurvePoints(family, complexity, curvature, seedFromSignature(signature));
  const word = gestureWordByFamily[family];
  return { word, family, controlPoints };
}

/** How the (stable) line behaves under today's weather — words only. */
export function gestureEnergyWord(energy) {
  switch (energy) {
    case "rising":
      return "rising and open";
    case "flat":
      return "still";
    case "agitated":
      return "trembling, restless";
    case "sinking":
      return "settling, heavy";
    default:
      return "still";
  }
}
