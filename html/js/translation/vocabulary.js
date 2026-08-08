// Ported from lib/translation/vocabulary.ts — keep the two in sync.
// CONTROLLED VOCABULARY — keeps generated language coherent and on-brand.
// This file is DATA. Edit freely; no DB involved.

export const vocab = {
  form: ["crystalline", "faceted", "monolithic", "fluid", "sinuous", "radiant", "blooming", "spiked", "columnar", "folded", "fragmented", "orbiting"],
  material: ["polished dark glass", "obsidian", "smoky quartz", "liquid metal", "molten gold", "raw marble", "basalt", "iron ore", "amber glass", "dark water", "incandescent metal", "ceramic"],
  surface: ["razor-sharp facets", "internal fractures", "wet sheen", "rough hewn", "weathered", "luminous veins", "matte mineral", "glassy refraction", "scorched", "rippling", "polished", "emissive"],
  light: ["soft rising light", "harsh raking light", "low subdued light", "single faint source", "clean key light", "halo rim light", "deep shadow", "bright high-clarity light", "flat dim light"],
  palette: ["warm neutrals", "pale gold", "rose-gold", "amber", "cool blue-grey", "deep indigo", "near-black", "cold steel", "desaturated grey", "muted blue", "deep red accent"],
  mood: ["quiet", "settled", "energized", "alive", "moved", "grateful", "numb", "tense", "restless", "aching", "grieving", "withdrawn", "mysterious", "intimate"],
  atmosphere: ["clear air", "cool fog", "heavy cool fog", "luminous haze", "charged air", "still heavy air", "soft warm haze", "partially obscured", "motionless"],
  gesture: ["brushstroke", "scrawl", "orbit line", "constellation path", "ribbon", "current", "fracture line", "contour", "thread"],
  camera: ["centered iconic composition", "shallow depth of field", "cinematic studio lighting", "macro material detail", "orthographic-leaning framing"],
};

/** The gesture noun used in prompts, per gesture family. Drawn from vocab.gesture. */
export const gestureWordByFamily = {
  fracture: "fracture line",
  ribbon: "ribbon",
  contour: "contour",
  "spark-thread": "thread",
};
