// Axis scoring: 50 layer-1 answers → four continuous -1…1 axis values.
//
// The 16 types are not presets and there is no lookup table anywhere in this
// file. A type code is just the four signs read off the floats below.

import { stableSignature, seedFromSignature } from "@/lib/hash";
import { clamp } from "./math";
import {
  AXIS_LETTERS,
  AXIS_NAMES,
  type AnswerSet,
  type AxisName,
  type Axes,
  type QuestionMapping,
} from "./types";

export const NEUTRAL_AXES: Axes = {
  illumination: 0,
  edge: 0,
  volatility: 0,
  colorRelation: 0,
};

/**
 * Does this question put the axis in play at all?
 *
 * The denominator for an axis is the number of *answered questions that offer*
 * a vote on it — not the number of options that happened to be chosen. That
 * way someone who consistently picks the neutral option on an axis lands near
 * zero, instead of having that axis silently dropped from their profile.
 */
function questionTouchesAxis(q: QuestionMapping, axis: AxisName): boolean {
  return q.options.some((o) => o.axisVotes?.[axis] !== undefined);
}

/**
 * Sum the votes per axis across every answered layer-1 question, divide by the
 * count of questions touching that axis. Unanswered questions contribute
 * nothing to either the numerator or the denominator, so a partially completed
 * assessment still yields a well-scaled profile.
 */
export function scoreAxes(questions: QuestionMapping[], answers: AnswerSet): Axes {
  const sums: Record<AxisName, number> = { ...NEUTRAL_AXES };
  const counts: Record<AxisName, number> = {
    illumination: 0,
    edge: 0,
    volatility: 0,
    colorRelation: 0,
  };

  for (const q of questions) {
    if (q.layer !== 1) continue;
    const choice = answers[q.id];
    if (choice === undefined) continue;
    const option = q.options[choice];
    if (!option) continue;

    for (const axis of AXIS_NAMES) {
      if (!questionTouchesAxis(q, axis)) continue;
      counts[axis] += 1;
      sums[axis] += option.axisVotes?.[axis] ?? 0;
    }
  }

  const axes = { ...NEUTRAL_AXES };
  for (const axis of AXIS_NAMES) {
    axes[axis] = counts[axis] === 0 ? 0 : clamp(sums[axis] / counts[axis], -1, 1);
  }
  return axes;
}

/**
 * The 4-letter display code. Sign only — a person at +0.15 on illumination and
 * one at +0.95 both read as "I", which is exactly why the renderer must use the
 * float and never this string.
 */
export function typeCodeFromAxes(axes: Axes): string {
  return AXIS_NAMES.map((axis) => {
    const [neg, pos] = AXIS_LETTERS[axis];
    return axes[axis] < 0 ? neg : pos;
  }).join("");
}

/** All 16 codes, in a stable order. Used by the type-grid acceptance check. */
export function allTypeCodes(): string[] {
  const codes: string[] = [];
  for (let mask = 0; mask < 16; mask++) {
    codes.push(
      AXIS_NAMES.map((axis, i) => AXIS_LETTERS[axis][(mask >> i) & 1]).join(""),
    );
  }
  return codes;
}

/** Axes at a given magnitude for a type code — the inverse of typeCodeFromAxes. */
export function axesForTypeCode(code: string, magnitude = 0.8): Axes {
  if (code.length !== AXIS_NAMES.length) {
    throw new Error(`Type code must be ${AXIS_NAMES.length} letters: ${code}`);
  }
  const axes = { ...NEUTRAL_AXES };
  AXIS_NAMES.forEach((axis, i) => {
    const [neg, pos] = AXIS_LETTERS[axis];
    const letter = code[i].toUpperCase();
    if (letter === pos) axes[axis] = magnitude;
    else if (letter === neg) axes[axis] = -magnitude;
    else throw new Error(`Letter "${letter}" is not valid for axis ${axis}`);
  });
  return axes;
}

/**
 * The structure seed (§7).
 *
 * Hashed from the ordered *layer-1* answer vector only. Layer 2 must never
 * reach this function: if state answers moved the seed, every seeded structure
 * detail would shift when someone's week changed and the layer split would be
 * broken in the one place it is hardest to notice.
 */
export function structureSeed(questions: QuestionMapping[], answers: AnswerSet): number {
  const vector = questions
    .filter((q) => q.layer === 1)
    .map((q) => `${q.id}=${answers[q.id] ?? "-"}`);
  return seedFromSignature(stableSignature(vector));
}
