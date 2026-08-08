// Ported from lib/prompt/buildPrompt.ts — keep the two in sync.
// PROMPT ASSEMBLY
// Order: [sculpture sentence ← baseline] + [weather/light sentence ← state]
//        + [tension clause, if any] + [gesture phrase] + STYLE_SPINE.
//
// The bar (worked example from the spec):
// "A precise, faceted crystalline form of polished dark glass, sharp exact
//  edges with internal fractures catching the light. Lit by a single faint
//  source in very low light, much of the form lost in heavy cool fog, a deep
//  blue-black and cold indigo palette, the mood quiet and aching, partially
//  obscured. A single fracture-line threads through the form, settling and heavy."

import { NEGATIVE_PROMPT, STYLE_SPINE } from "./styleSpine.js";

function joinAnd(items) {
  if (items.length <= 1) return items[0] ?? "";
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

function sentence(s) {
  const trimmed = s.trim().replace(/[.,;\s]+$/, "");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1) + ".";
}

export function buildPrompt(t) {
  const d = t.descriptors;

  // Sculpture — permanent structure, from the baseline lane only.
  const formAdjs = d.form.slice(0, 3).join(", ");
  const material =
    d.material.length > 1 ? `${d.material[0]} with veins of ${d.material[1]}` : d.material[0];
  const surfaces = d.surface.slice(0, 3).join(", ");
  const sculpture = sentence(`a ${formAdjs} form of ${material}, ${surfaces}`);

  // Composition — how the form is held in frame (optional level-3 choice).
  const held =
    d.composition.length > 0 ? sentence(`the form is held ${d.composition.join(", ")}`) : "";

  // Weather & light — momentary state, from the state lane only.
  const weather = sentence(
    `lit by ${joinAnd(d.light.slice(0, 3))}, ` +
      `a ${joinAnd(d.palette.slice(0, 3))} palette, ` +
      `the mood ${joinAnd(d.mood.slice(0, 3))}, ${d.atmosphere.slice(0, 2).join(", ")}`,
  );

  // Tension — expressed literally, never resolved into a blend.
  const tension = d.tensionClause ? sentence(d.tensionClause) : "";

  // Gesture — the stable signature line, with today's energy in words.
  const gesture = sentence(
    `a single ${t.gesture.word} threads through the form, ${t.gestureEnergy}`,
  );

  const prompt = [sculpture, held, weather, tension, gesture, STYLE_SPINE]
    .filter(Boolean)
    .join(" ");

  return { prompt, negativePrompt: NEGATIVE_PROMPT, seed: t.seed };
}
