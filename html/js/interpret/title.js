// Ported from lib/interpret/title.ts — keep the two in sync.
// TITLE + INTERPRETATION — deterministic, gallery-toned composition from the
// descriptors. No API call. Not cheesy, not horoscope.
//
// A small library of fragment templates keyed by baseline lane and by light
// register, composed deterministically. Edit these freely — they are curation.

/** "polished dark glass" → "Glass"; "smoky quartz" → "Quartz". */
function materialNoun(material) {
  const last = material.split(" ").pop() ?? "Form";
  return last.charAt(0).toUpperCase() + last.slice(1);
}

/** Title adjective, keyed by the level-2 baseline choice. */
const TITLE_ADJ = {
  b_crystal_exact: "Exact",
  b_crystal_fractured: "Fractured",
  b_crystal_smooth: "Polished",
  b_current_river: "Drawn",
  b_current_tide: "Returning",
  b_current_mist: "Veiled",
  b_stone_pressure: "Compressed",
  b_stone_time: "Worn",
  b_stone_fire: "Scorched",
  b_flame_steady: "Steady",
  b_flame_flicker: "Restless",
  b_flame_blinding: "Blinding",
};

/** Weather clause for the title, keyed by the level-2 state register. */
const TITLE_WEATHER = {
  s_calm: "in Still Light",
  s_bright: "in Open Light",
  s_tender: "Held in Warm Haze",
  s_dim: "Under Thin Grey",
  s_sharp: "Under Raking Light",
  s_deep: "Half-Veiled in Cold Mist",
};

/** Line 1 — the baseline essence, keyed by the committed form lane. */
const ESSENCE = {
  b_crystal: "A precise, faceted form — built to hold its shape.",
  b_current: "A moving form — it answers the world by flowing around it.",
  b_stone: "A weighty, enduring mass — shaped slowly, made to remain.",
  b_flame: "A radiant form — it spends itself outward, light first.",
};

/** Line 2 — today's weather, keyed by the state register. */
const WEATHER_LINE = {
  s_calm: "Today the air around it is still; nothing asks it to be other than it is.",
  s_bright: "Today light arrives openly, and the form meets it without flinching.",
  s_tender: "Today a warm haze gathers close, softening what is usually held firm.",
  s_dim: "Today the light is thin and even, and the form waits inside it.",
  s_sharp: "Today the light comes in hard and at an angle, every edge answering.",
  s_deep: "Tonight it stands in cool fog, edges softened, light withdrawn.",
};

/** Line 3 — the closing, keyed by tension/energy. */
function closingLine(t) {
  if (t.descriptors.tensionClause) {
    return "The structure remains; only the weather has changed.";
  }
  switch (t.descriptors.energy) {
    case "rising":
      return "Form and light, for now, are in agreement.";
    case "flat":
      return "The form holds its shape, and waits.";
    case "agitated":
      return "The shape does not move; the light does.";
    case "sinking":
    default:
      return "The structure remains; only the weather has changed.";
  }
}

export function composeTitleAndInterpretation(t, baselinePathIds, statePathIds) {
  const adj = TITLE_ADJ[baselinePathIds[1]] ?? t.descriptors.form[0] ?? "Quiet";
  const noun = materialNoun(t.descriptors.material[0] ?? "form");
  const weather = TITLE_WEATHER[statePathIds[1]] ?? "in Low Light";
  const title = `${adj} ${noun}, ${weather}`;

  const lines = [
    ESSENCE[baselinePathIds[0]] ?? "A singular form, holding its own shape.",
    WEATHER_LINE[statePathIds[1]] ?? "Today the light falls differently on it.",
    closingLine(t),
  ];

  return { title, interpretation: lines.join("\n") };
}
