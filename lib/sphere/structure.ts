// Layer 1: axes → StructureParams.
//
// Every derivation below is a pure function of (axes, seed) so it can be tested
// in isolation, and every one of them is deterministic — the seeded sampler
// pulls values in a fixed order and there is no Math.random on this path.
//
// Two people of the same type must come out as siblings, not clones. The axes
// set the family resemblance; the seed supplies the individual variation
// (tilt, exact hue, band widths). Nothing here reads a layer-2 answer.

import { mulberry32 } from "@/lib/hash";
import { clamp, clamp01, mean, remap, round, wrapHue, wrapHueOffset } from "./math";
import { L1_NUDGE_GAIN, STRUCTURE_RANGES } from "./ranges";
import { typeCodeFromAxes } from "./axes";
import type { Accent, ActivityCenter, Axes, StructureParams } from "./types";

/** Deterministic sampler. Values must be pulled in a fixed order — see below. */
function sampler(seed: number) {
  const rand = mulberry32(seed);
  return {
    /** Uniform in [0, 1). */
    unit: () => rand(),
    /** Uniform in [-spread, +spread]. */
    jitter: (spread: number) => (rand() * 2 - 1) * spread,
    /** Uniform in [min, max]. */
    range: (min: number, max: number) => min + rand() * (max - min),
  };
}

// ── §4.1 axis → structure defaults. One exported function each. ──

export const lightSourceFromAxes = (a: Axes) => remap(a.illumination, -1, 1, 0.05, 0.95);
export const depthFromAxes = (a: Axes) => remap(a.illumination, -1, 1, 0.15, 0.75);
export const bandEdgeSharpnessFromAxes = (a: Axes) => remap(a.edge, -1, 1, 0.92, 0.08);
export const viscosityFromAxes = (a: Axes) => remap(a.edge, -1, 1, 0.85, 0.15);
export const colorSeparationFromAxes = (a: Axes) => remap(a.colorRelation, -1, 1, 0.05, 0.95);

/** Fluid means fewer, broader bands; ordered means many crisp ones. */
export const bandCountFromAxes = (a: Axes) =>
  Math.round(remap(Math.abs(a.edge), 0, 1, 12, 4));

/** Unified gets 1–2 accents, contrasting gets 2–4. */
export function accentCountFromAxes(a: Axes): number {
  if (a.colorRelation < 0) return Math.abs(a.colorRelation) > 0.5 ? 1 : 2;
  return clamp(2 + Math.round(a.colorRelation * 2), 2, 4);
}

/**
 * Base hue runs amber (outward-lit, the body is a lamp seen from outside) to
 * violet (inward-lit, the light is buried in the plasma), with smaller pushes
 * from the other axes so the 16 types don't collapse onto one hue ramp.
 */
export function baseHueFromAxes(a: Axes): number {
  return wrapHue(
    remap(a.illumination, -1, 1, 38, 268) + a.edge * 26 - a.colorRelation * 14,
  );
}

/**
 * Saturation tops out around 0.6. Beyond that the body reads as pigment rather
 * than as lit matter, and a contrasting type turns into a beach ball — the
 * separation is supposed to come from the boundaries being hard, not from the
 * colours being loud.
 */
export function baseSaturationFromAxes(a: Axes): number {
  return clamp(
    0.24 + 0.26 * ((a.colorRelation + 1) / 2) + 0.09 * ((-a.edge + 1) / 2),
    0.1,
    0.95,
  );
}

/** Inward light needs a darker body, or the glow has nothing to glow against. */
export function baseLightnessFromAxes(a: Axes): number {
  return clamp(remap(a.illumination, -1, 1, 0.52, 0.3), 0.14, 0.64);
}

/**
 * Where the eye is drawn — and, via §4.2, where the shear boundary lands.
 * Ordered edges read as a classic banded planet, so activity sits at the
 * equator. Fluid bodies vent along the axis when lit from within, and pool on
 * one side when lit from outside.
 */
export function activityCenterFromAxes(a: Axes, jitterEdge: number, jitterIllum: number): ActivityCenter {
  if (a.edge + jitterEdge <= -0.15) return "equator";
  return a.illumination + jitterIllum > 0 ? "poles" : "hemisphere";
}

/**
 * Build the accent palette. Contrasting types fan out to near-complementary
 * offsets; unified types stay inside a narrow analogous window.
 */
export function accentsFromAxes(a: Axes, seed: number): Accent[] {
  const rng = sampler(seed ^ 0x5f3759df);
  const count = accentCountFromAxes(a);
  const contrasting = a.colorRelation >= 0;
  const magnitude = Math.abs(a.colorRelation);
  // Contrasting means hard separation, not a full trip round the colour wheel.
  // Past roughly 130° apart the body stops reading as one substance and starts
  // reading as a painted ball, so the fan narrows as accents are added.
  const spread = contrasting
    ? remap(magnitude, 0, 1, 70, 132)
    : remap(magnitude, 0, 1, 42, 12);
  const baseSat = baseSaturationFromAxes(a);

  const raw: Accent[] = [];
  for (let k = 0; k < count; k++) {
    const fan = count === 1 ? 1 : 0.5 + 0.5 * ((count - 1 - k) / (count - 1));
    const sign = k % 2 === 0 ? 1 : -1;
    raw.push({
      hueOffset: round(wrapHueOffset(sign * spread * fan + rng.jitter(8)), 2),
      saturation: round(
        clamp01(baseSat + (contrasting ? 0.08 : -0.06) + rng.jitter(0.06)),
        4,
      ),
      // Placeholder; normalised below so weights always sum to 1.
      weight: (1 / (k + 1)) * (0.75 + rng.unit() * 0.5),
    });
  }

  const total = raw.reduce((s, x) => s + x.weight, 0);
  return raw.map((x) => ({ ...x, weight: round(x.weight / total, 4) }));
}

/**
 * The full layer-1 derivation.
 *
 * Volatility is deliberately absent: per §4.1 it touches no structure param at
 * all. Its whole job is to constrain which protrusion modes layer 2 may pick.
 */
export function axesToStructure(axes: Axes, seed: number): StructureParams {
  // Fixed pull order. Reordering these silently changes every existing sphere.
  const rng = sampler(seed);
  const hueJitter = rng.jitter(9);
  const satJitter = rng.jitter(0.05);
  const ligJitter = rng.jitter(0.04);
  const varianceJitter = rng.jitter(0.08);
  const tiltPick = rng.unit();
  const asymmetryJitter = rng.jitter(0.1);
  const haloJitter = rng.jitter(0.09);
  const centerEdgeJitter = rng.jitter(0.12);
  const centerIllumJitter = rng.jitter(0.12);

  const baseColor = {
    h: round(wrapHue(baseHueFromAxes(axes) + hueJitter), 2),
    s: round(clamp(baseSaturationFromAxes(axes) + satJitter, 0.1, 0.95), 4),
    l: round(clamp(baseLightnessFromAxes(axes) + ligJitter, 0.14, 0.64), 4),
  };

  return {
    seed,
    typeCode: typeCodeFromAxes(axes),
    axes,

    baseColor,
    accents: accentsFromAxes(axes, seed),
    colorSeparation: round(colorSeparationFromAxes(axes), 4),

    bandCount: bandCountFromAxes(axes),
    bandSizeVariance: round(
      clamp01(remap(axes.edge, -1, 1, 0.1, 0.62) + varianceJitter),
      4,
    ),
    bandEdgeSharpness: round(bandEdgeSharpnessFromAxes(axes), 4),

    axialTilt: round(clamp(tiltPick * 38 + Math.abs(axes.colorRelation) * 7, 0, 45), 2),
    activityCenter: activityCenterFromAxes(axes, centerEdgeJitter, centerIllumJitter),
    asymmetry: round(clamp01(remap(axes.edge, -1, 1, 0.08, 0.5) + asymmetryJitter), 4),

    lightSource: round(lightSourceFromAxes(axes), 4),
    depth: round(depthFromAxes(axes), 4),
    viscosity: round(viscosityFromAxes(axes), 4),
    halo: round(clamp01(remap(axes.illumination, -1, 1, 0.05, 0.65) + haloJitter), 4),
  };
}

// ── Layer-1 paramNudges, applied on top of the axis defaults ─────

const ACTIVITY_ORDER: ActivityCenter[] = ["poles", "equator", "hemisphere"];

/**
 * Apply collected layer-1 nudges. Each param takes the mean of its nudges
 * (so ten questions all pushing the same way saturate rather than run away),
 * scaled by the range and the layer-1 gain, then clamped to the declared range.
 */
export function applyStructureNudges(
  structure: StructureParams,
  nudges: Record<string, number[]>,
): StructureParams {
  const next: StructureParams = {
    ...structure,
    baseColor: { ...structure.baseColor },
    accents: structure.accents.map((a) => ({ ...a })),
    axes: { ...structure.axes },
  };

  for (const [name, values] of Object.entries(nudges)) {
    const range = STRUCTURE_RANGES[name];
    if (!range || values.length === 0) continue;
    const m = clamp(mean(values), -1, 1);

    if (name === "activityCenter") {
      // Scalar in [-1, 1] thresholded across poles → equator → hemisphere.
      // Only a decisive push overrides what the axes already chose.
      if (m <= -0.33) next.activityCenter = ACTIVITY_ORDER[0];
      else if (m >= 0.33) next.activityCenter = ACTIVITY_ORDER[2];
      else if (Math.abs(m) > 0.12) next.activityCenter = ACTIVITY_ORDER[1];
      continue;
    }

    if (name === "baseHue") {
      next.baseColor.h = round(wrapHue(next.baseColor.h + m * range.max), 2);
      continue;
    }
    if (name === "baseSaturation" || name === "baseLightness") {
      const key = name === "baseSaturation" ? "s" : "l";
      const delta = m * (range.max - range.min) * L1_NUDGE_GAIN;
      next.baseColor[key] = round(clamp(next.baseColor[key] + delta, range.min, range.max), 4);
      continue;
    }

    const current = next[name as keyof StructureParams];
    if (typeof current !== "number") continue;
    const delta = m * (range.max - range.min) * L1_NUDGE_GAIN;
    const value = clamp(current + delta, range.min, range.max);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (next as any)[name] = range.integer ? Math.round(value) : round(value, 4);
  }

  return next;
}
