// Layer 2: current-state answers → MotionParams.
//
// Layer 2 has no axes of its own. Its questions ARE the signal, so a param's
// mean nudge in -1…1 maps straight across that param's full declared range,
// rather than seasoning an axis-derived default the way layer 1 does.
//
// The one place the layers touch: baseline volatility decides which protrusion
// modes are even in the vocabulary. State then chooses within that set. That is
// how "structure constrains, motion selects" is enforced without letting a bad
// week change who someone is.

import { clamp, mean, remap, round } from "./math";
import { MOTION_RANGES, NEUTRAL_MOTION_VALUE } from "./ranges";
import type {
  AnswerSet,
  Axes,
  MotionParams,
  ProtrusionMode,
  QuestionMapping,
} from "./types";

/** §8: the sphere shown at question 50, before any weather has been reported. */
export function neutralMotion(): MotionParams {
  const n = NEUTRAL_MOTION_VALUE;
  return {
    globalSpeed: n,
    speedVariance: n,
    shearIndex: n,
    rotationDirection: 1,
    turbulenceScale: n,
    turbulenceAmplitude: n,
    coherence: n,
    protrusionMode: "none",
    protrusionAmplitude: n,
    protrusionLength: n,
    protrusionFrequency: n,
    accentIntensity: n,
  };
}

/**
 * Neutral weather with the volatility gate applied.
 *
 * §8's literal neutral (mode 'none') is what the progressive reveal shows at
 * question 50, before anyone has said anything about their week. Everywhere
 * else — the type grid, the acceptance checks — "neutral" has to mean
 * "no state input, but the baseline's vocabulary respected", because a volatile
 * baseline has no legal 'none' mode (§4.1). Without this, the eight V types and
 * the eight S types would be pixel-identical in a grid that exists to prove
 * they aren't.
 */
export function neutralMotionFor(axes: Axes): MotionParams {
  const base = neutralMotion();
  const mode = gateProtrusionMode("none", axes.volatility);
  return {
    ...base,
    protrusionMode: mode,
    protrusionAmplitude: mode === "none" ? 0 : base.protrusionAmplitude,
  };
}

/** §4.1: baseline volatility sets the allowed protrusion vocabulary. */
export function allowedProtrusionModes(volatility: number): ProtrusionMode[] {
  if (volatility < -0.33) return ["none", "constant"];
  if (volatility > 0.33) return ["intermittent"];
  return ["none", "constant", "intermittent"];
}

const MODE_ORDER: ProtrusionMode[] = ["none", "constant", "intermittent"];

/** Snap a desired mode into the allowed set, moving as little as possible. */
export function gateProtrusionMode(
  desired: ProtrusionMode,
  volatility: number,
): ProtrusionMode {
  const allowed = allowedProtrusionModes(volatility);
  if (allowed.includes(desired)) return desired;
  const want = MODE_ORDER.indexOf(desired);
  let best = allowed[0];
  let bestDistance = Infinity;
  for (const mode of allowed) {
    const d = Math.abs(MODE_ORDER.indexOf(mode) - want);
    if (d < bestDistance) {
      bestDistance = d;
      best = mode;
    }
  }
  return best;
}

/** Collect the mean nudge per motion param across all answered layer-2 questions. */
export function collectMotionNudges(
  questions: QuestionMapping[],
  answers: AnswerSet,
): Record<string, number[]> {
  const collected: Record<string, number[]> = {};
  for (const q of questions) {
    if (q.layer !== 2) continue;
    const choice = answers[q.id];
    if (choice === undefined) continue;
    const option = q.options[choice];
    if (!option?.paramNudges) continue;
    for (const [name, value] of Object.entries(option.paramNudges)) {
      if (value === undefined) continue;
      (collected[name] ??= []).push(value);
    }
  }
  return collected;
}

/**
 * Score layer 2. Params with no answered questions stay at their neutral value,
 * so the sphere at question 51 differs from the one at question 50 only where
 * the person has actually said something.
 */
export function scoreMotion(
  questions: QuestionMapping[],
  answers: AnswerSet,
  axes: Axes,
): MotionParams {
  const nudges = collectMotionNudges(questions, answers);
  const motion = neutralMotion();

  const scalar = (name: string): number | null => {
    const values = nudges[name];
    if (!values || values.length === 0) return null;
    return clamp(mean(values), -1, 1);
  };

  for (const [name, range] of Object.entries(MOTION_RANGES)) {
    if (range.enumerated) continue;
    const m = scalar(name);
    if (m === null) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (motion as any)[name] = round(remap(m, -1, 1, range.min, range.max), 4);
  }

  const spin = scalar("rotationDirection");
  motion.rotationDirection = spin !== null && spin < 0 ? -1 : 1;

  const modeScalar = scalar("protrusionMode");
  const desired: ProtrusionMode =
    modeScalar === null
      ? "none"
      : modeScalar <= -0.33
        ? "none"
        : modeScalar >= 0.33
          ? "intermittent"
          : "constant";
  motion.protrusionMode = gateProtrusionMode(desired, axes.volatility);

  // A mode of 'none' means no protrusion, full stop — an amplitude left over
  // from the questions would otherwise leak displacement into a still body.
  if (motion.protrusionMode === "none") motion.protrusionAmplitude = 0;

  return motion;
}
