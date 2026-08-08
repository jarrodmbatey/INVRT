// Band architecture and kinematics.
//
// Bands are latitude slices of a single mesh. Nothing here creates geometry —
// the renderer feeds these arrays to the shader as uniforms and the fragment
// stage does the rest, which is what keeps the body to one draw call.
//
// §4.2: counter-rotation is the headline. Adjacent bands shearing against each
// other reads as internal conflict to any viewer, with no explanation needed.
// The shear boundary is placed at the activity centre on purpose, so the eye is
// already looking where the conflict happens.

import { mulberry32 } from "@/lib/hash";
import { clamp, lerp } from "./math";
import type { MotionParams, StructureParams } from "./types";

/** Radians/second at globalSpeed = 1 with no per-band variance. */
export const MAX_ANGULAR_SPEED = 0.7;

export interface BandKinematics {
  count: number;
  /** Band widths in object-space y, summing to 2 (the sphere spans y ∈ [-1, 1]). */
  widths: number[];
  /** Interior boundaries in y, ascending. Length count - 1. */
  boundaries: number[];
  /** Half-width of each boundary's blend zone, in y. Length count - 1. */
  edgeWidths: number[];
  /** Centre y of each band. Length count. */
  centers: number[];
  /** Signed angular velocity, radians/second. Length count. */
  angularVelocity: number[];
  /**
   * The spin the body as a whole has, before per-band variance and shear. The
   * vertex stage rotates its displacement field by this so protrusions orbit
   * with the planet instead of hanging in space while the colour moves past.
   */
  baseAngularVelocity: number;
  /** Accent index per band; -1 means the base colour. Length count. */
  accentIndex: number[];
  /** Which bands were flipped into the counter-rotating set. Length count. */
  countered: boolean[];
}

/**
 * Band widths. Structure-only: these must not move when the weather changes.
 */
export function bandWidths(structure: StructureParams): number[] {
  const rand = mulberry32(structure.seed ^ 0x9e3779b9);
  const raw: number[] = [];
  for (let i = 0; i < structure.bandCount; i++) {
    raw.push(Math.max(0.15, 1 + structure.bandSizeVariance * (rand() * 2 - 1) * 0.85));
  }
  const total = raw.reduce((s, v) => s + v, 0);
  return raw.map((v) => (v / total) * 2);
}

/**
 * Which hemisphere the activity sits in, and how far up it. Seeded, so it is a
 * stable property of the individual rather than something the weather moves.
 * The shader needs the same number to place its activity mask.
 */
export function hemisphereFocus(structure: StructureParams): number {
  const side = mulberry32(structure.seed ^ 0x2545f491)() < 0.5 ? -1 : 1;
  return side * lerp(0.35, 0.7, structure.asymmetry);
}

/**
 * Distance from the activity centre, per band. Smaller means "nearer the place
 * the eye is drawn", and that is the order shear propagates outward from.
 */
export function activityDistances(structure: StructureParams, centers: number[]): number[] {
  switch (structure.activityCenter) {
    case "equator":
      return centers.map((y) => Math.abs(y));
    case "poles":
      return centers.map((y) => 1 - Math.abs(y));
    case "hemisphere": {
      const focus = hemisphereFocus(structure);
      return centers.map((y) => Math.abs(y - focus));
    }
  }
}

/**
 * Assign each band a colour: the base, or one of the accents. A golden-ratio
 * walk over the accent weights spreads coverage evenly without clumping, and is
 * fully determined by the seed.
 */
export function assignBandColors(structure: StructureParams, count: number): number[] {
  const wheel: number[] = [0.9]; // index -1 → base colour
  for (const accent of structure.accents) wheel.push(accent.weight * 1.8);
  const total = wheel.reduce((s, v) => s + v, 0);

  const offset = mulberry32(structure.seed ^ 0x85ebca6b)();
  const assigned: number[] = [];
  for (let i = 0; i < count; i++) {
    const u = (offset + i * 0.6180339887498949) % 1;
    let acc = 0;
    let picked = -1;
    for (let k = 0; k < wheel.length; k++) {
      acc += wheel[k] / total;
      if (u < acc) {
        picked = k - 1; // k === 0 is the base colour
        break;
      }
    }
    assigned.push(picked);
  }

  // A planet of one flat colour is a failed render. Force at least one of each.
  const accentBands = assigned.filter((a) => a >= 0).length;
  if (accentBands === 0) assigned[Math.min(1, count - 1)] = 0;
  else if (accentBands === count) assigned[0] = -1;
  return assigned;
}

/**
 * Per-band angular velocity.
 *
 * shearIndex does two things at once, both anchored at the activity centre:
 * it grows the counter-rotating *region* (how many bands flip) and deepens the
 * *magnitude* of the flip (0.5 leaves them stalled, 1.0 fully reverses them).
 * Both reach zero together, so shearIndex = 0 really is a rigidly co-rotating
 * planet and there is no discontinuity on the way up.
 */
export function bandKinematics(
  structure: StructureParams,
  motion: MotionParams,
): BandKinematics {
  const widths = bandWidths(structure);
  const count = widths.length;

  const boundaries: number[] = [];
  const centers: number[] = [];
  let y = -1;
  for (let i = 0; i < count; i++) {
    centers.push(y + widths[i] / 2);
    y += widths[i];
    if (i < count - 1) boundaries.push(y);
  }

  // Near sharpness 0 a boundary blends across half a band — true diffusion.
  const edgeWidths = boundaries.map((_, i) => {
    const narrowest = Math.min(widths[i], widths[i + 1]);
    return lerp(narrowest * 0.5, 0.004, structure.bandEdgeSharpness);
  });

  const distances = activityDistances(structure, centers);
  const order = distances
    .map((d, i) => ({ d, i }))
    .sort((a, b) => (a.d === b.d ? a.i - b.i : a.d - b.d));

  const flipCount = Math.round(motion.shearIndex * Math.floor(count / 2));
  const countered = new Array<boolean>(count).fill(false);
  for (let k = 0; k < flipCount; k++) countered[order[k].i] = true;

  const rand = mulberry32(structure.seed ^ 0xc2b2ae35);
  const shearFactor = 1 - 2 * motion.shearIndex;
  const angularVelocity: number[] = [];
  for (let i = 0; i < count; i++) {
    const variance = clamp(
      1 + motion.speedVariance * (rand() * 2 - 1) * 0.9,
      0.05,
      1.95,
    );
    const factor = countered[i] ? shearFactor : 1;
    angularVelocity.push(
      motion.rotationDirection * MAX_ANGULAR_SPEED * motion.globalSpeed * variance * factor,
    );
  }

  const baseAngularVelocity =
    motion.rotationDirection * MAX_ANGULAR_SPEED * motion.globalSpeed;

  return {
    count,
    widths,
    boundaries,
    edgeWidths,
    centers,
    angularVelocity,
    baseAngularVelocity,
    accentIndex: assignBandColors(structure, count),
    countered,
  };
}
