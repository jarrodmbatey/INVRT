// The generation pipeline: answers → SphereParams.
//
//   1. Sum axis votes across layer-1 answers            (axes.ts)
//   2. Derive structure defaults from the axes          (structure.ts, §4.1)
//   3. Apply layer-1 param nudges on top, clamped       (structure.ts)
//   4. Score layer-2 answers into motion params         (motion.ts)
//   5. Run the constraint solver                        (constraints.ts, §5)
//
// Determinism (§7): no Math.random on this path, the seed is a stable hash of
// the ordered layer-1 answer vector, and the mapping version travels with the
// result so an old sphere keeps rendering the way it always did.

import { MAPPING_VERSION } from "./constants";
import { resolveConstraints } from "./constraints";
import { scoreAxes, structureSeed } from "./axes";
import { applyStructureNudges, axesToStructure } from "./structure";
import { neutralMotion, neutralMotionFor, scoreMotion } from "./motion";
import { getMapping } from "./questions";
import type {
  AnswerSet,
  Axes,
  ConstraintFiring,
  MotionParams,
  QuestionMapping,
  SphereParams,
} from "./types";

/** Collect the layer-1 nudges from the answered questions. */
export function collectStructureNudges(
  questions: QuestionMapping[],
  answers: AnswerSet,
): Record<string, number[]> {
  const collected: Record<string, number[]> = {};
  for (const q of questions) {
    if (q.layer !== 1) continue;
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

export interface GenerateOptions {
  /** Which mapping table to score against. Defaults to the current version. */
  version?: string;
  /**
   * Ignore layer-2 answers and use neutral motion. This is what the progressive
   * reveal shows at question 50 (§8).
   */
  structureOnly?: boolean;
  /** Receives one entry per constraint rule that fired. */
  log?: ConstraintFiring[];
}

export function generateSphere(answers: AnswerSet, options: GenerateOptions = {}): SphereParams {
  const version = options.version ?? MAPPING_VERSION;
  const questions = getMapping(version);

  const axes = scoreAxes(questions, answers);
  const seed = structureSeed(questions, answers);

  let structure = axesToStructure(axes, seed);
  structure = applyStructureNudges(structure, collectStructureNudges(questions, answers));

  const motion = options.structureOnly
    ? neutralMotion()
    : scoreMotion(questions, answers, axes);

  return resolveConstraints({ structure, motion, mappingVersion: version }, options.log);
}

/**
 * Build a sphere directly from axis values, bypassing the questions.
 *
 * This is not a shortcut for the product path — it is how the type grid and the
 * acceptance checks construct a known type at a known magnitude without having
 * to reverse-engineer 50 answers that would score to it.
 */
export function sphereFromAxes(
  axes: Axes,
  seed: number,
  motion: MotionParams = neutralMotionFor(axes),
  log?: ConstraintFiring[],
): SphereParams {
  const structure = axesToStructure(axes, seed);
  return resolveConstraints({ structure, motion, mappingVersion: MAPPING_VERSION }, log);
}

/** The question-50 sphere: real structure, neutral weather. */
export function generateStructureOnly(
  answers: AnswerSet,
  options: Omit<GenerateOptions, "structureOnly"> = {},
): SphereParams {
  return generateSphere(answers, { ...options, structureOnly: true });
}
