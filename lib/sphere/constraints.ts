// The constraint solver (§5).
//
// Runs after scoring, before rendering. Pure function of SphereParams.
//
// Written as a table of named rules rather than a chain of ifs, for two
// reasons: every firing is auditable in the log, and each rule can be unit
// tested on its own without constructing a whole assessment.
//
// Hard rules stop broken renders. Soft rules are the anti-mush machinery — 30
// independent dials average out and every sphere converges on the same look, so
// these deliberately correlate params that would otherwise drift to the middle
// together.

import { GEOMETRY_LIMITS } from "./constants";
import { clamp01, round } from "./math";
import type { ConstraintFiring, SphereParams } from "./types";

export interface ConstraintRule {
  id: string;
  kind: "hard" | "soft";
  /** Why this exists, in terms of what the render does when it is violated. */
  rationale: string;
  /** True when the rule needs to act. Must not mutate. */
  applies(p: SphereParams): boolean;
  /** Mutate the (already cloned) params and describe what changed. */
  apply(p: SphereParams): string;
}

export const CONSTRAINT_RULES: ConstraintRule[] = [
  {
    id: "hard-edges-vs-churn",
    kind: "hard",
    rationale: "Hard edges cannot survive churn; the result looks like a bug.",
    applies: (p) =>
      p.structure.bandEdgeSharpness > 0.7 && p.motion.turbulenceAmplitude > 0.6,
    apply: (p) => {
      const was = p.motion.turbulenceAmplitude;
      p.motion.turbulenceAmplitude = 0.4;
      return `turbulenceAmplitude ${was} → 0.4 (bandEdgeSharpness ${p.structure.bandEdgeSharpness})`;
    },
  },
  {
    id: "glow-needs-depth",
    kind: "hard",
    rationale: "Internal glow inside an opaque body is invisible.",
    applies: (p) => p.structure.lightSource > 0.7 && p.structure.depth < 0.25,
    apply: (p) => {
      const was = p.structure.depth;
      p.structure.depth = 0.4;
      return `depth ${was} → 0.4 (lightSource ${p.structure.lightSource})`;
    },
  },
  {
    id: "fast-and-fine-is-noise",
    kind: "hard",
    rationale: "Fast plus fine-grained is unreadable noise.",
    applies: (p) => p.motion.globalSpeed > 0.8 && p.motion.turbulenceScale > 0.7,
    apply: (p) => {
      const was = p.motion.turbulenceScale;
      p.motion.turbulenceScale = 0.5;
      return `turbulenceScale ${was} → 0.5 (globalSpeed ${p.motion.globalSpeed})`;
    },
  },
  {
    id: "displacement-cap",
    kind: "hard",
    rationale:
      "protrusionAmplitude is a 0…1 scalar on maxDisplacement and can never exceed it.",
    applies: (p) => p.motion.protrusionAmplitude < 0 || p.motion.protrusionAmplitude > 1,
    apply: (p) => {
      const was = p.motion.protrusionAmplitude;
      p.motion.protrusionAmplitude = clamp01(was);
      return `protrusionAmplitude ${was} → ${p.motion.protrusionAmplitude} (cap ${GEOMETRY_LIMITS.maxDisplacement})`;
    },
  },
  {
    id: "mercury-is-slow",
    kind: "hard",
    rationale: "Mercury does not move like steam.",
    applies: (p) => p.structure.viscosity > 0.8 && p.motion.globalSpeed > 0.7,
    apply: (p) => {
      const was = p.motion.globalSpeed;
      p.motion.globalSpeed = 0.45;
      return `globalSpeed ${was} → 0.45 (viscosity ${p.structure.viscosity})`;
    },
  },
  {
    id: "uniformity-is-the-failure-mode",
    kind: "soft",
    rationale: "Uniform band sizes and uniform band speeds together read as dead.",
    applies: (p) => p.structure.bandSizeVariance < 0.2 && p.motion.speedVariance < 0.2,
    apply: (p) => {
      if (p.structure.bandSizeVariance >= p.motion.speedVariance) {
        const was = p.structure.bandSizeVariance;
        p.structure.bandSizeVariance = 0.35;
        return `bandSizeVariance ${was} → 0.35 (it was the larger of the pair)`;
      }
      const was = p.motion.speedVariance;
      p.motion.speedVariance = 0.35;
      return `speedVariance ${was} → 0.35 (it was the larger of the pair)`;
    },
  },
  {
    id: "blended-accents-make-brown",
    kind: "soft",
    rationale: "Three or more accents smeared together desaturate into mud.",
    applies: (p) => p.structure.accents.length >= 3 && p.structure.colorSeparation < 0.3,
    apply: (p) => {
      const was = p.structure.accents.length;
      // Keep the highest-weight accents; they own the most surface.
      p.structure.accents = [...p.structure.accents]
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 2);
      const total = p.structure.accents.reduce((s, a) => s + a.weight, 0);
      p.structure.accents = p.structure.accents.map((a) => ({
        ...a,
        weight: round(a.weight / total, 4),
      }));
      return `accents ${was} → 2 (colorSeparation ${p.structure.colorSeparation})`;
    },
  },
  {
    id: "symmetry-reads-as-lifeless",
    kind: "soft",
    rationale: "A perfectly symmetric equatorial planet looks like a test render.",
    applies: (p) => p.structure.asymmetry < 0.15 && p.structure.activityCenter === "equator",
    apply: (p) => {
      const was = p.structure.asymmetry;
      p.structure.asymmetry = 0.25;
      return `asymmetry ${was} → 0.25 (equatorial activity centre)`;
    },
  },
];

function cloneParams(p: SphereParams): SphereParams {
  return {
    mappingVersion: p.mappingVersion,
    structure: {
      ...p.structure,
      axes: { ...p.structure.axes },
      baseColor: { ...p.structure.baseColor },
      accents: p.structure.accents.map((a) => ({ ...a })),
    },
    motion: { ...p.motion },
  };
}

/**
 * Apply every rule once, in table order, to a copy of the params.
 *
 * Single pass on purpose: a rule that re-triggers after a later rule fires
 * would mean the table itself is inconsistent, and the acceptance checks assert
 * that a second pass fires nothing.
 */
export function resolveConstraints(
  params: SphereParams,
  log?: ConstraintFiring[],
): SphereParams {
  const next = cloneParams(params);
  for (const rule of CONSTRAINT_RULES) {
    if (!rule.applies(next)) continue;
    const detail = rule.apply(next);
    log?.push({ rule: rule.id, kind: rule.kind, detail });
  }
  return next;
}

/** Same solve, with the firing log returned rather than collected by reference. */
export function resolveConstraintsVerbose(params: SphereParams): {
  params: SphereParams;
  fired: ConstraintFiring[];
} {
  const fired: ConstraintFiring[] = [];
  return { params: resolveConstraints(params, fired), fired };
}
