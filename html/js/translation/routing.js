// Ported from lib/translation/routing.ts — keep the two in sync.
// ROUTING — the heart of the translation layer.
//
// Governing principle: COMMIT, DON'T AVERAGE.
//  - The baseline root locks the form/material/surface/geometry lane.
//  - The state root locks the light/palette/mood/atmosphere lane.
//  - Deeper choices only modulate; they never switch or blend lanes.
//  - Opposition between lanes is expressed as a tension CLAUSE, never a hybrid.

/** Max items per descriptor category — prevents prompt mush. */
const CAP = 4;

/** Deduplicate, preserve first-seen order, cap length. */
function tidy(list, cap = CAP) {
  return [...new Set(list)].slice(0, cap);
}

/**
 * Tension table: when the committed form lane and the committed light lane
 * pull against each other, name the tension literally and poetically.
 * Keyed by baseline root id, then by state root or sub-register id
 * (more specific keys win). This is editable curation data.
 */
const TENSION_PHRASES = {
  b_flame: {
    s_heavier: "a luminous form, dimmed and cooled, its glow pressing out from under the weight",
    s_deep: "a radiant thing burning low in deep water-cold dark, light held but not extinguished",
    s_dim: "a bright nature gone quiet, its glow banked under grey",
  },
  b_crystal: {
    s_tender: "sharp structure softened by warm haze, exact edges forgiving in this light",
    s_bright: "hard clarity meeting open light, every edge declared",
  },
  b_current: {
    s_sharp: "a fluid form held taut, its motion arrested mid-flow",
    s_dim: "moving water gone still and grey, the current waiting under the surface",
  },
  b_stone: {
    s_bright: "an unmoving mass warmed at its edges by rising light",
    s_sharp: "stillness under harsh raking light, every scar declared",
    s_tender: "a weathered mass held in unfamiliar warmth",
  },
};

/** Find a tension clause for this pairing, or undefined if the lanes agree. */
function tensionFor(baselineRootId, statePathIds) {
  const table = TENSION_PHRASES[baselineRootId];
  if (!table) return undefined;
  // More specific (deeper) state ids win over the root.
  for (let i = statePathIds.length - 1; i >= 0; i--) {
    const phrase = table[statePathIds[i]];
    if (phrase) return phrase;
  }
  return undefined;
}

/**
 * Route baseline + state paths into one committed descriptor set.
 * Implements exactly: commit lanes → modulate with deeper choices →
 * resolve tension as a clause → dedupe and cap.
 */
export function route(baselinePath, statePath) {
  const baselineRoot = baselinePath[0];
  const stateRoot = statePath[0];
  const b = baselineRoot.descriptors ?? {};
  const s = stateRoot.descriptors ?? {};

  // 1–2) COMMIT the lanes. Form vocabulary comes only from baseline;
  // light/palette/mood/atmosphere only from state.
  const D = {
    traits: [...(b.traits ?? [])],
    form: [...(b.form ?? [])],
    // Exactly ONE primary material, with one optional secondary.
    material: (b.material ?? []).slice(0, 2),
    surface: [...(b.surface ?? [])],
    geometry: [...(b.geometry ?? [])],
    light: [...(s.light ?? [])],
    palette: [...(s.palette ?? [])],
    mood: [...(s.mood ?? [])],
    atmosphere: [...(s.atmosphere ?? [])],
    composition: [],
    energy: s.energy ?? "flat",
  };

  // 3) MODULATE with deeper baseline choices — surface/geometry detail,
  // occasional material swap, composition. NEVER the form lane.
  for (const node of baselinePath.slice(1)) {
    const d = node.descriptors ?? {};
    if (d.surface) D.surface = [...d.surface, ...D.surface]; // modulators lead — they are the chosen nuance
    if (d.geometry) D.geometry = [...D.geometry, ...d.geometry];
    if (d.material) D.material = [d.material[0], D.material[0]].filter(Boolean); // swap primary, keep lane's as secondary
    if (d.form) D.form = [...D.form, ...d.form];
    if (d.composition) D.composition = [...D.composition, ...d.composition];
  }

  // Deeper state choices — light nuance, palette accent, mood specificity,
  // atmosphere. NEVER the light lane itself.
  for (const node of statePath.slice(1)) {
    const d = node.descriptors ?? {};
    if (d.light) D.light = [...d.light, ...D.light];
    if (d.palette) D.palette = [...d.palette, ...D.palette];
    if (d.mood) D.mood = [...d.mood, ...D.mood];
    if (d.atmosphere) D.atmosphere = [...d.atmosphere, ...D.atmosphere];
    if (d.energy) D.energy = d.energy;
  }

  // 4) RESOLVE TENSION instead of averaging.
  const tensionClause = tensionFor(baselineRoot.id, statePath.map((n) => n.id));
  if (tensionClause) D.tensionClause = tensionClause;

  // 5) Deduplicate and cap each list.
  D.traits = tidy(D.traits);
  D.form = tidy(D.form);
  D.material = tidy(D.material, 2);
  D.surface = tidy(D.surface);
  D.geometry = tidy(D.geometry, 5);
  D.light = tidy(D.light, 3);
  D.palette = tidy(D.palette, 3);
  D.mood = tidy(D.mood, 3);
  D.atmosphere = tidy(D.atmosphere, 3);
  D.composition = tidy(D.composition, 2);

  return D;
}
