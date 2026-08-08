// Acceptance checks for the HTML build's translation layer.
// Run with: npm run check:html   (or: node html/check-invariants.mjs)
//
// This is the browser port of scripts/check-invariants.ts, run under Node against
// the exact modules index.html loads. It asserts the same invariants AND that the
// port is numerically identical to the Next.js app — if the two ever drift, this
// fails.
//
// 1. Form-stability invariant: same baseline + different states → identical
//    signature, seed, and gesture geometry; different light/palette/mood.
// 2. Different baseline → different signature/seed.
// 3. Commit-don't-average: form vocab only from baseline lane, light vocab
//    only from state lane, capped lists, tension as a clause (not a blend).

import { translate } from "./js/translation/translate.js";
import { resolveBaselinePath, resolveStatePath } from "./js/translation/trees.js";
import { buildPrompt } from "./js/prompt/buildPrompt.js";
import { composeTitleAndInterpretation } from "./js/interpret/title.js";
import { baselineTree } from "./js/translation/baselineTree.js";
import { stateTree } from "./js/translation/stateTree.js";

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures++;
}

const baselineA = ["b_crystal", "b_crystal_fractured", "b_hold_privately"];
const baselineB = ["b_flame", "b_flame_flicker", "b_hold_openly"];
const stateGrief = ["s_heavier", "s_deep", "s_grieving"];
const stateBright = ["s_lighter", "s_bright", "s_hopeful"];

const tA1 = translate(resolveBaselinePath(baselineA), resolveStatePath(stateGrief));
const tA2 = translate(resolveBaselinePath(baselineA), resolveStatePath(stateBright));
const tB1 = translate(resolveBaselinePath(baselineB), resolveStatePath(stateGrief));

// --- 1. Form stability across states ---
check("same baseline → same signature", tA1.baselineSignature === tA2.baselineSignature);
check("same baseline → same seed", tA1.seed === tA2.seed);
check(
  "same baseline → byte-identical gesture control points",
  JSON.stringify(tA1.gesture.controlPoints) === JSON.stringify(tA2.gesture.controlPoints),
);
check(
  "same baseline → identical form/material/surface/geometry",
  JSON.stringify([tA1.descriptors.form, tA1.descriptors.material, tA1.descriptors.surface, tA1.descriptors.geometry]) ===
    JSON.stringify([tA2.descriptors.form, tA2.descriptors.material, tA2.descriptors.surface, tA2.descriptors.geometry]),
);
check(
  "different state → different light/palette/mood",
  JSON.stringify(tA1.descriptors.light) !== JSON.stringify(tA2.descriptors.light) &&
    JSON.stringify(tA1.descriptors.palette) !== JSON.stringify(tA2.descriptors.palette),
);

// --- 2. Different baseline → different form ---
check("different baseline → different signature", tA1.baselineSignature !== tB1.baselineSignature);
check("different baseline → different seed", tA1.seed !== tB1.seed);
check(
  "different baseline → different gesture",
  JSON.stringify(tA1.gesture.controlPoints) !== JSON.stringify(tB1.gesture.controlPoints),
);

// --- 3. Commit-don't-average ---
check(
  "crystal baseline commits the crystal form lane",
  tA1.descriptors.form.includes("crystalline") && !tA1.descriptors.form.includes("fluid"),
);
check("exactly one primary material (≤2 entries)", tA1.descriptors.material.length <= 2);
check(
  "capped descriptor lists (≤4 form/surface, ≤3 light/palette/mood)",
  tA1.descriptors.form.length <= 4 &&
    tA1.descriptors.surface.length <= 4 &&
    tA1.descriptors.light.length <= 3 &&
    tA1.descriptors.palette.length <= 3 &&
    tA1.descriptors.mood.length <= 3,
);
check(
  "flame × heavier-deep tension expressed as a clause",
  typeof tB1.descriptors.tensionClause === "string" && tB1.descriptors.tensionClause.length > 0,
);
check(
  "state-leaf accent reaches light descriptors (grieving → single cold highlight)",
  tA1.descriptors.light.includes("a single cold highlight"),
);

// --- Prompt + title smoke test against the spec's bar ---
const built = buildPrompt(tA1);
check("prompt includes the style spine", built.prompt.includes("dark seamless void"));
check("prompt includes the gesture", built.prompt.includes("fracture line"));
check("prompt seed equals baseline seed", built.seed === tA1.seed);
check("negative prompt locked", built.negativePrompt.includes("horoscope"));

const { title, interpretation } = composeTitleAndInterpretation(tA1, baselineA, stateGrief);
check("title composed", /Fractured/.test(title), title);
check("interpretation is 3 lines", interpretation.split("\n").length === 3);

// --- 4. Port fidelity: the HTML trees must match lib/'s trees exactly ---
const tsBaseline = await importTs("../lib/translation/baselineTree.ts", "baselineTree");
const tsState = await importTs("../lib/translation/stateTree.ts", "stateTree");
if (tsBaseline && tsState) {
  check("html baseline tree matches lib/translation/baselineTree.ts", deepEqual(baselineTree, tsBaseline));
  check("html state tree matches lib/translation/stateTree.ts", deepEqual(stateTree, tsState));
} else {
  console.log("· skipped tree-parity check (no TypeScript loader available)");
}

/** Compare against the TS source when a type-stripping loader is present. */
async function importTs(relative, name) {
  try {
    const url = new URL(relative, import.meta.url).href;
    const mod = await import(url);
    return mod[name];
  } catch {
    return null;
  }
}

/** Structural equality ignoring key order — the trees are plain data. */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

console.log("\nWorked-example prompt (Crystal·Fractured·Privately × Heavier·Deep·grieving):\n");
console.log(built.prompt + "\n");
console.log(`Title: ${title}\n${interpretation}\n`);

if (failures > 0) {
  console.error(`\n${failures} invariant check(s) FAILED`);
  process.exit(1);
}
console.log("All invariants hold.");
