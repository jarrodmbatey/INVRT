// Motion transitions for the progressive reveal (§8).
//
// Structure never animates after question 50 — the planet does not change
// identity mid-assessment. Only the weather eases, over ~800ms, so answering
// question 63 visibly moves the object you are already looking at.

import { lerp } from "./math";
import type { MotionParams } from "./types";

export const TRANSITION_MS = 800;

export function easeInOutCubic(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * Interpolate weather.
 *
 * rotationDirection is handled as a signed speed rather than a flag: reversing
 * spin should slow the planet, stop it and turn it the other way, not snap it
 * mid-rotation. protrusionMode has no meaningful midpoint, so it switches at
 * the halfway mark, where the amplitude crossfade hides the change.
 */
export function lerpMotion(from: MotionParams, to: MotionParams, tRaw: number): MotionParams {
  // Land exactly on the endpoints. `a + (b - a) * 1` is not always b in binary
  // floating point, and a transition that settles a millionth off its target
  // leaves the uniforms permanently disagreeing with the scored params.
  if (tRaw >= 1) return { ...to };
  if (tRaw <= 0) return { ...from };

  const t = easeInOutCubic(tRaw);
  const signedSpeed = lerp(
    from.rotationDirection * from.globalSpeed,
    to.rotationDirection * to.globalSpeed,
    t,
  );

  return {
    globalSpeed: Math.abs(signedSpeed),
    rotationDirection: signedSpeed < 0 ? -1 : 1,
    speedVariance: lerp(from.speedVariance, to.speedVariance, t),
    shearIndex: lerp(from.shearIndex, to.shearIndex, t),
    turbulenceScale: lerp(from.turbulenceScale, to.turbulenceScale, t),
    turbulenceAmplitude: lerp(from.turbulenceAmplitude, to.turbulenceAmplitude, t),
    coherence: lerp(from.coherence, to.coherence, t),
    protrusionMode: t < 0.5 ? from.protrusionMode : to.protrusionMode,
    protrusionAmplitude: lerp(from.protrusionAmplitude, to.protrusionAmplitude, t),
    protrusionLength: lerp(from.protrusionLength, to.protrusionLength, t),
    protrusionFrequency: lerp(from.protrusionFrequency, to.protrusionFrequency, t),
    accentIntensity: lerp(from.accentIntensity, to.accentIntensity, t),
  };
}
