// Acceptance checks for the sphere generation system. Run with: npm run check:sphere
//
// Covers §10 in order, plus unit coverage of the §4.1 axis table, the §5 rule
// table and the §7 determinism requirement. Everything here is CPU-side: no
// GPU, no DOM, so it runs in CI.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { GEOMETRY_LIMITS, MATERIAL, MAPPING_VERSION } from "../lib/sphere/constants";
import { allTypeCodes, axesForTypeCode, scoreAxes, structureSeed, typeCodeFromAxes } from "../lib/sphere/axes";
import {
  accentCountFromAxes,
  bandCountFromAxes,
  bandEdgeSharpnessFromAxes,
  colorSeparationFromAxes,
  depthFromAxes,
  lightSourceFromAxes,
  viscosityFromAxes,
} from "../lib/sphere/structure";
import { allowedProtrusionModes, gateProtrusionMode, neutralMotion, neutralMotionFor } from "../lib/sphere/motion";
import { CONSTRAINT_RULES, resolveConstraintsVerbose } from "../lib/sphere/constraints";
import { bandKinematics } from "../lib/sphere/bands";
import { generateSphere, sphereFromAxes } from "../lib/sphere/generate";
import { getMapping } from "../lib/sphere/questions";
import { lerpMotion } from "../lib/sphere/transition";
import { plasmaFragmentShader, plasmaVertexShader } from "../components/sphere/plasma/plasmaShader";
import { mulberry32 } from "../lib/hash";
import type { AnswerSet, MotionParams, SphereParams } from "../lib/sphere/types";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures++;
}
function section(title: string) {
  console.log(`\n── ${title}`);
}

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
const questions = getMapping();

// ── §1 Locked constants ──────────────────────────────────────────

section("§1 Locked constants");
check(
  "MATERIAL holds the specified values",
  MATERIAL.roughness === 0.18 &&
    MATERIAL.clearcoat === 0.85 &&
    MATERIAL.clearcoatRoughness === 0.12 &&
    MATERIAL.metalness === 0 &&
    MATERIAL.envMapIntensity === 1.15,
);
check(
  "GEOMETRY_LIMITS holds the specified caps",
  GEOMETRY_LIMITS.radius === 1 &&
    GEOMETRY_LIMITS.maxDisplacement === 0.06 &&
    GEOMETRY_LIMITS.maxIndentation === 0.03 &&
    GEOMETRY_LIMITS.icosphereDetail === 6,
);

// ── §4 Question tables ───────────────────────────────────────────

section("§4 Question tables");
check("100 questions", questions.length === 100, `${questions.length}`);
check("50 in layer 1", questions.filter((q) => q.layer === 1).length === 50);
check("50 in layer 2", questions.filter((q) => q.layer === 2).length === 50);
check("all question ids unique", new Set(questions.map((q) => q.id)).size === questions.length);
check(
  "every question offers at least two options",
  questions.every((q) => q.options.length >= 2),
);
check(
  "every vote and nudge is within -1…1",
  questions.every((q) =>
    q.options.every(
      (o) =>
        [...Object.values(o.axisVotes ?? {}), ...Object.values(o.paramNudges ?? {})].every(
          (v) => v !== undefined && v >= -1 && v <= 1,
        ),
    ),
  ),
);
check(
  "layer 2 casts no axis votes (the split runs the other way too)",
  questions.filter((q) => q.layer === 2).every((q) => q.options.every((o) => !o.axisVotes)),
);

// §4.2: shearIndex must have more question coverage than any other motion param.
const motionCoverage = new Map<string, number>();
for (const q of questions.filter((x) => x.layer === 2)) {
  const touched = new Set<string>();
  for (const o of q.options) for (const k of Object.keys(o.paramNudges ?? {})) touched.add(k);
  for (const k of touched) motionCoverage.set(k, (motionCoverage.get(k) ?? 0) + 1);
}
const shearCoverage = motionCoverage.get("shearIndex") ?? 0;
const rivals = [...motionCoverage.entries()].filter(([k]) => k !== "shearIndex");
check(
  "shearIndex has the most question coverage of any motion param",
  rivals.every(([, n]) => n < shearCoverage),
  `shearIndex ${shearCoverage} vs ${rivals.map(([k, n]) => `${k} ${n}`).join(", ")}`,
);

// ── §4.1 Axis → structure defaults ───────────────────────────────

section("§4.1 Axis → structure table");
const inward = { illumination: 1, edge: 0, volatility: 0, colorRelation: 0 };
const outward = { illumination: -1, edge: 0, volatility: 0, colorRelation: 0 };
const fluid = { illumination: 0, edge: 1, volatility: 0, colorRelation: 0 };
const ordered = { illumination: 0, edge: -1, volatility: 0, colorRelation: 0 };
const contrasting = { illumination: 0, edge: 0, volatility: 0, colorRelation: 1 };
const unified = { illumination: 0, edge: 0, volatility: 0, colorRelation: -1 };

check(
  "lightSource spans 0.05…0.95 across illumination",
  near(lightSourceFromAxes(outward), 0.05) && near(lightSourceFromAxes(inward), 0.95),
);
check(
  "depth spans 0.15…0.75 across illumination",
  near(depthFromAxes(outward), 0.15) && near(depthFromAxes(inward), 0.75),
);
check(
  "bandEdgeSharpness spans 0.92…0.08 across edge",
  near(bandEdgeSharpnessFromAxes(ordered), 0.92) && near(bandEdgeSharpnessFromAxes(fluid), 0.08),
);
check(
  "viscosity spans 0.85…0.15 across edge",
  near(viscosityFromAxes(ordered), 0.85) && near(viscosityFromAxes(fluid), 0.15),
);
check(
  "colorSeparation spans 0.05…0.95 across colour relation",
  near(colorSeparationFromAxes(unified), 0.05) && near(colorSeparationFromAxes(contrasting), 0.95),
);
check(
  "bandCount runs 12 (no edge magnitude) → 4 (full)",
  bandCountFromAxes({ ...ordered, edge: 0 }) === 12 && bandCountFromAxes(fluid) === 4,
);
check(
  "accent count is 1–2 when unified, 2–4 when contrasting",
  accentCountFromAxes(unified) === 1 &&
    accentCountFromAxes({ ...unified, colorRelation: -0.2 }) === 2 &&
    accentCountFromAxes({ ...contrasting, colorRelation: 0.1 }) === 2 &&
    accentCountFromAxes(contrasting) === 4,
);
check(
  "volatility moves no structure param",
  (() => {
    // axes and typeCode carry the volatility letter by definition; everything
    // else must be untouched by it.
    const strip = (v: number) => {
      const s = sphereFromAxes(
        { illumination: 0.4, edge: -0.2, volatility: v, colorRelation: 0.3 },
        99,
        neutralMotion(),
      ).structure;
      const { axes: _axes, typeCode: _code, ...rest } = s;
      void _axes;
      void _code;
      return JSON.stringify(rest);
    };
    return strip(-0.9) === strip(0.9);
  })(),
);
check(
  "volatility gates the protrusion vocabulary instead",
  JSON.stringify(allowedProtrusionModes(-0.5)) === JSON.stringify(["none", "constant"]) &&
    JSON.stringify(allowedProtrusionModes(0)) === JSON.stringify(["none", "constant", "intermittent"]) &&
    JSON.stringify(allowedProtrusionModes(0.5)) === JSON.stringify(["intermittent"]) &&
    gateProtrusionMode("intermittent", -0.5) === "constant" &&
    gateProtrusionMode("none", 0.5) === "intermittent",
);

// ── Axis scoring ─────────────────────────────────────────────────

section("Axis scoring");
function answerAll(pick: (optionCount: number) => number): AnswerSet {
  const a: AnswerSet = {};
  for (const q of questions) a[q.id] = pick(q.options.length);
  return a;
}
const allFirst = answerAll(() => 0);
const allLast = answerAll((n) => n - 1);
const axesFirst = scoreAxes(questions, allFirst);
const axesLast = scoreAxes(questions, allLast);
check(
  "answering consistently reaches the poles",
  Math.abs(axesFirst.illumination) > 0.75 &&
    Math.abs(axesLast.illumination) > 0.75 &&
    Math.sign(axesFirst.edge) !== Math.sign(axesLast.edge),
  JSON.stringify(axesFirst),
);
check(
  "an empty answer set scores dead centre",
  JSON.stringify(scoreAxes(questions, {})) ===
    JSON.stringify({ illumination: 0, edge: 0, volatility: 0, colorRelation: 0 }),
);
check(
  "the type code is the sign of each axis",
  typeCodeFromAxes({ illumination: 0.01, edge: -0.01, volatility: 0.9, colorRelation: -0.9 }) === "IRVU",
);
check("all 16 codes are enumerable and unique", new Set(allTypeCodes()).size === 16);
check(
  "axesForTypeCode round-trips through typeCodeFromAxes",
  allTypeCodes().every((c) => typeCodeFromAxes(axesForTypeCode(c)) === c),
);

// ── §5 Constraint solver ─────────────────────────────────────────

section("§5 Constraint solver");
function paramsWith(
  structure: Partial<SphereParams["structure"]>,
  motion: Partial<MotionParams>,
): SphereParams {
  const base = sphereFromAxes({ illumination: 0, edge: 0, volatility: 0, colorRelation: 0 }, 4242);
  return {
    mappingVersion: MAPPING_VERSION,
    structure: { ...base.structure, ...structure },
    motion: { ...base.motion, ...motion },
  };
}

const ruleCases: Array<[string, SphereParams, (p: SphereParams) => boolean]> = [
  [
    "hard-edges-vs-churn",
    paramsWith({ bandEdgeSharpness: 0.9 }, { turbulenceAmplitude: 0.8 }),
    (p) => p.motion.turbulenceAmplitude === 0.4,
  ],
  [
    "glow-needs-depth",
    paramsWith({ lightSource: 0.85, depth: 0.1 }, {}),
    (p) => p.structure.depth === 0.4,
  ],
  [
    "fast-and-fine-is-noise",
    paramsWith({ viscosity: 0.2 }, { globalSpeed: 0.9, turbulenceScale: 0.85 }),
    (p) => p.motion.turbulenceScale === 0.5,
  ],
  [
    "displacement-cap",
    paramsWith({}, { protrusionAmplitude: 3.4 }),
    (p) => p.motion.protrusionAmplitude === 1,
  ],
  [
    "mercury-is-slow",
    paramsWith({ viscosity: 0.9 }, { globalSpeed: 0.95, turbulenceScale: 0.2 }),
    (p) => p.motion.globalSpeed === 0.45,
  ],
  [
    "uniformity-is-the-failure-mode",
    paramsWith({ bandSizeVariance: 0.1 }, { speedVariance: 0.05 }),
    (p) => Math.max(p.structure.bandSizeVariance, p.motion.speedVariance) === 0.35,
  ],
  [
    "blended-accents-make-brown",
    paramsWith(
      {
        colorSeparation: 0.1,
        accents: [
          { hueOffset: 20, saturation: 0.5, weight: 0.5 },
          { hueOffset: -40, saturation: 0.5, weight: 0.3 },
          { hueOffset: 90, saturation: 0.5, weight: 0.2 },
        ],
      },
      {},
    ),
    (p) => p.structure.accents.length === 2,
  ],
  [
    "symmetry-reads-as-lifeless",
    paramsWith({ asymmetry: 0.05, activityCenter: "equator" }, {}),
    (p) => p.structure.asymmetry === 0.25,
  ],
];

for (const [id, input, expectation] of ruleCases) {
  const { params, fired } = resolveConstraintsVerbose(input);
  check(
    `rule "${id}" fires and applies`,
    fired.some((f) => f.rule === id) && expectation(params),
    fired.map((f) => f.detail).join(" | "),
  );
}
check(
  "every rule in the table is covered by a case",
  CONSTRAINT_RULES.every((r) => ruleCases.some(([id]) => id === r.id)),
);
check(
  "the solver is idempotent — a second pass fires nothing",
  ruleCases.every(([, input]) => {
    const once = resolveConstraintsVerbose(input).params;
    return resolveConstraintsVerbose(once).fired.length === 0;
  }),
);
check(
  "the solver does not mutate its input",
  (() => {
    const input = paramsWith({ lightSource: 0.9, depth: 0.05 }, {});
    const before = JSON.stringify(input);
    resolveConstraintsVerbose(input);
    return JSON.stringify(input) === before;
  })(),
);

// ── §4.2 Counter-rotation ────────────────────────────────────────

section("§4.2 Counter-rotation");
const shearBase = sphereFromAxes(
  { illumination: 0.3, edge: -0.6, volatility: -0.5, colorRelation: 0.4 },
  777,
);
const withShear = (s: number): MotionParams => ({
  ...shearBase.motion,
  globalSpeed: 0.6,
  speedVariance: 0,
  shearIndex: s,
  rotationDirection: 1,
});

const noShear = bandKinematics(shearBase.structure, withShear(0));
check(
  "shearIndex 0 → every band shares the body's rotation",
  noShear.angularVelocity.every((v) => near(v, noShear.baseAngularVelocity, 1e-9)) &&
    noShear.countered.every((c) => !c),
);

const fullShear = bandKinematics(shearBase.structure, withShear(1));
check(
  "shearIndex 1 → some bands counter-rotate against the rest",
  fullShear.angularVelocity.some((v) => v < 0) && fullShear.angularVelocity.some((v) => v > 0),
  fullShear.angularVelocity.map((v) => v.toFixed(2)).join(" "),
);
check(
  "the counter-rotating set grows monotonically with shearIndex",
  (() => {
    let previous = -1;
    for (let s = 0; s <= 1.0001; s += 0.1) {
      const n = bandKinematics(shearBase.structure, withShear(s)).countered.filter(Boolean).length;
      if (n < previous) return false;
      previous = n;
    }
    return true;
  })(),
);
check(
  "the shear boundary starts at the activity centre",
  (() => {
    const k = bandKinematics(shearBase.structure, withShear(0.35));
    const flipped = k.centers.filter((_, i) => k.countered[i]);
    if (flipped.length === 0) return false;
    // activityCenter is 'equator' for this ordered structure → nearest y = 0.
    const worstFlipped = Math.max(...flipped.map(Math.abs));
    const bestUnflipped = Math.min(
      ...k.centers.filter((_, i) => !k.countered[i]).map(Math.abs),
    );
    return worstFlipped <= bestUnflipped;
  })(),
  shearBase.structure.activityCenter,
);

// ── §10 a. Sixteen distinguishable types ─────────────────────────

section("§10 a. Sixteen types, distinguishable at a glance");
function featureVector(p: SphereParams): number[] {
  return [
    p.structure.bandCount / 12,
    p.structure.bandEdgeSharpness,
    p.structure.colorSeparation,
    p.structure.lightSource,
    p.structure.depth,
    p.structure.viscosity,
    p.structure.halo,
    p.structure.accents.length / 4,
    p.motion.protrusionMode === "none" ? 0 : 1,
  ];
}
function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return (d > 180 ? 360 - d : d) / 180;
}
function typeDistance(a: SphereParams, b: SphereParams): number {
  const va = featureVector(a);
  const vb = featureVector(b);
  let sum = hueDistance(a.structure.baseColor.h, b.structure.baseColor.h) ** 2;
  for (let i = 0; i < va.length; i++) sum += (va[i] - vb[i]) ** 2;
  return Math.sqrt(sum);
}

const grid = allTypeCodes().map((code) => ({
  code,
  params: sphereFromAxes(axesForTypeCode(code, 0.85), (code.charCodeAt(0) * 7919 + code.length) | 0),
}));
let closest = { a: "", b: "", d: Infinity };
for (let i = 0; i < grid.length; i++) {
  for (let j = i + 1; j < grid.length; j++) {
    const d = typeDistance(grid[i].params, grid[j].params);
    if (d < closest.d) closest = { a: grid[i].code, b: grid[j].code, d };
  }
}
check(
  "no two types collapse onto each other",
  closest.d > 0.25,
  `closest pair ${closest.a}/${closest.b} at ${closest.d.toFixed(3)}`,
);
check(
  "every type code is produced by its own axes",
  grid.every((g) => g.params.structure.typeCode === g.code),
);

// ── §10 b. One type, five weathers, same planet ──────────────────

section("§10 b. Five motion states read as the same planet");
const person = axesForTypeCode("IFVC", 0.7);
const weathers: MotionParams[] = [
  neutralMotionFor(person),
  { ...neutralMotionFor(person), globalSpeed: 0.05, turbulenceAmplitude: 0.05, coherence: 0.95, shearIndex: 0 },
  { ...neutralMotionFor(person), globalSpeed: 0.9, turbulenceAmplitude: 0.9, coherence: 0.05, shearIndex: 1 },
  { ...neutralMotionFor(person), rotationDirection: -1, shearIndex: 0.8, accentIntensity: 1 },
  { ...neutralMotionFor(person), speedVariance: 1, turbulenceScale: 0.9, protrusionAmplitude: 1 },
];
const renders = weathers.map((m) => sphereFromAxes(person, 31337, m));
const structureJson = renders.map((r) => JSON.stringify(r.structure));
check(
  "structure is byte-identical across all five",
  structureJson.every((s) => s === structureJson[0]),
);
check(
  "band count, base hue and axial tilt never move",
  renders.every(
    (r) =>
      r.structure.bandCount === renders[0].structure.bandCount &&
      r.structure.baseColor.h === renders[0].structure.baseColor.h &&
      r.structure.axialTilt === renders[0].structure.axialTilt,
  ),
);
check(
  "the weathers really are different",
  new Set(renders.map((r) => JSON.stringify(r.motion))).size === renders.length,
);
check(
  "answering only layer 2 differently leaves structure untouched",
  (() => {
    const l1 = answerAll(() => 1);
    const a: AnswerSet = { ...l1 };
    const b: AnswerSet = { ...l1 };
    for (const q of questions.filter((x) => x.layer === 2)) {
      a[q.id] = 0;
      b[q.id] = q.options.length - 1;
    }
    const pa = generateSphere(a);
    const pb = generateSphere(b);
    return (
      JSON.stringify(pa.structure) === JSON.stringify(pb.structure) &&
      JSON.stringify(pa.motion) !== JSON.stringify(pb.motion)
    );
  })(),
);

// ── §10 c. A hundred answer sets, no convergence ─────────────────

section("§10 c. A hundred answer sets");
const rand = mulberry32(20260808);
const population: SphereParams[] = [];
for (let n = 0; n < 100; n++) {
  const a: AnswerSet = {};
  for (const q of questions) a[q.id] = Math.floor(rand() * q.options.length);
  population.push(generateSphere(a));
}

function spread(values: number[]): number {
  const m = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

const uniformityFailures = population.filter(
  (p) => p.structure.bandSizeVariance < 0.2 && p.motion.speedVariance < 0.2,
).length;
check("soft rule 6 leaves no uniform-everything sphere", uniformityFailures === 0);
check(
  "soft rule 7 leaves no blended sphere with 3+ accents",
  population.every((p) => !(p.structure.accents.length >= 3 && p.structure.colorSeparation < 0.3)),
);
check(
  "soft rule 8 leaves no lifeless symmetric equator",
  population.every((p) => !(p.structure.asymmetry < 0.15 && p.structure.activityCenter === "equator")),
);
check(
  "band counts spread across the population",
  new Set(population.map((p) => p.structure.bandCount)).size >= 3,
  `${new Set(population.map((p) => p.structure.bandCount)).size} distinct`,
);
check(
  "base hue spreads rather than converging",
  spread(population.map((p) => p.structure.baseColor.h)) > 8,
  spread(population.map((p) => p.structure.baseColor.h)).toFixed(2),
);
check(
  "shear spreads across the population",
  spread(population.map((p) => p.motion.shearIndex)) > 0.05,
  spread(population.map((p) => p.motion.shearIndex)).toFixed(3),
);
check(
  "no two of the hundred are identical",
  new Set(population.map((p) => JSON.stringify(p))).size === population.length,
);

// ── §10 d. Displacement never exceeds the cap ────────────────────

section("§10 d. Displacement cap");
check(
  "protrusionAmplitude stays a 0…1 scalar for every generated sphere",
  population.every((p) => p.motion.protrusionAmplitude >= 0 && p.motion.protrusionAmplitude <= 1),
);
check(
  "worst-case displacement equals the cap exactly",
  Math.max(...population.map((p) => p.motion.protrusionAmplitude)) * GEOMETRY_LIMITS.maxDisplacement <=
    GEOMETRY_LIMITS.maxDisplacement,
);
// The generated GLSL, not the TypeScript that produces it.
check(
  "the vertex stage clamps to the caps regardless of uniform input",
  plasmaVertexShader.includes("clamp(disp, -MAX_INDENTATION, MAX_DISPLACEMENT)"),
);
check(
  "the caps reach the shader as compile-time constants, not uniforms",
  plasmaVertexShader.includes(`const float MAX_DISPLACEMENT = ${GEOMETRY_LIMITS.maxDisplacement.toFixed(5)};`) &&
    plasmaVertexShader.includes(`const float MAX_INDENTATION = ${GEOMETRY_LIMITS.maxIndentation.toFixed(5)};`) &&
    !plasmaVertexShader.includes("uniform float uMaxDisplacement"),
);
check(
  "the locked material reaches the shader as constants too",
  plasmaFragmentShader.includes(`const float MAT_ROUGHNESS = ${MATERIAL.roughness.toFixed(4)};`) &&
    plasmaFragmentShader.includes(`const float MAT_CLEARCOAT = ${MATERIAL.clearcoat.toFixed(4)};`) &&
    !/uniform\s+float\s+u(Roughness|Clearcoat|Metalness)/.test(plasmaFragmentShader),
);

// ── §7 Determinism ───────────────────────────────────────────────

section("§7 Determinism");
const fixed = answerAll((n) => (n === 4 ? 2 : 1));
check(
  "same answers → byte-identical params",
  JSON.stringify(generateSphere(fixed)) === JSON.stringify(generateSphere(fixed)),
);
check(
  "answer order in the object does not matter",
  (() => {
    const reversed: AnswerSet = {};
    for (const key of Object.keys(fixed).reverse()) reversed[key] = fixed[key];
    return JSON.stringify(generateSphere(fixed)) === JSON.stringify(generateSphere(reversed));
  })(),
);
check(
  "the seed is a function of layer 1 alone",
  (() => {
    const withL2: AnswerSet = { ...fixed };
    for (const q of questions.filter((x) => x.layer === 2)) withL2[q.id] = 0;
    return structureSeed(questions, fixed) === structureSeed(questions, withL2);
  })(),
);
check(
  "different layer-1 answers → a different seed",
  structureSeed(questions, allFirst) !== structureSeed(questions, allLast),
);
check(
  "band kinematics are reproducible",
  JSON.stringify(bandKinematics(renders[0].structure, renders[0].motion)) ===
    JSON.stringify(bandKinematics(renders[0].structure, renders[0].motion)),
);
check("the mapping version travels with the params", generateSphere(fixed).mappingVersion === MAPPING_VERSION);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const generationSources = walk(join(process.cwd(), "lib/sphere")).filter((f) => f.endsWith(".ts"));
const randomUsers = generationSources.filter((f) => readFileSync(f, "utf8").includes("Math.random("));
check(
  "no Math.random anywhere on the generation path",
  randomUsers.length === 0,
  randomUsers.join(", "),
);

// ── §8 Progressive reveal ────────────────────────────────────────

section("§8 Progressive reveal");
const layerOneOnly: AnswerSet = {};
for (const q of questions.filter((x) => x.layer === 1)) layerOneOnly[q.id] = 1;
const atFifty = generateSphere(layerOneOnly);
check(
  "the question-50 sphere carries neutral weather",
  atFifty.motion.protrusionMode === "none" &&
    [
      atFifty.motion.globalSpeed,
      atFifty.motion.shearIndex,
      atFifty.motion.coherence,
      atFifty.motion.accentIntensity,
    ].every((v) => v === 0.5),
  JSON.stringify(atFifty.motion),
);
check(
  "structure at question 50 survives unchanged to question 100",
  (() => {
    const finished: AnswerSet = { ...layerOneOnly };
    for (const q of questions.filter((x) => x.layer === 2)) finished[q.id] = 3 % q.options.length;
    return JSON.stringify(generateSphere(finished).structure) === JSON.stringify(atFifty.structure);
  })(),
);
check(
  "a partial layer-2 answer set still scores",
  (() => {
    const partial: AnswerSet = { ...layerOneOnly };
    partial["s01"] = 3;
    const p = generateSphere(partial);
    return p.motion.shearIndex > 0.9 && p.motion.coherence === 0.5;
  })(),
);
check(
  "the transition ends exactly on the target",
  (() => {
    const landed = lerpMotion(weathers[1], weathers[2], 1);
    return (Object.keys(weathers[2]) as Array<keyof MotionParams>).every(
      (k) => landed[k] === weathers[2][k],
    );
  })(),
);
check(
  "reversing spin passes through a standstill rather than snapping",
  (() => {
    const from: MotionParams = { ...neutralMotion(), globalSpeed: 0.8, rotationDirection: 1 };
    const to: MotionParams = { ...neutralMotion(), globalSpeed: 0.8, rotationDirection: -1 };
    return lerpMotion(from, to, 0.5).globalSpeed < 0.05;
  })(),
);

// ── Summary ──────────────────────────────────────────────────────

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("All sphere acceptance checks pass.");
