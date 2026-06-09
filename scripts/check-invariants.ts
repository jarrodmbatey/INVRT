// Acceptance checks for the translation layer, run with: npm run check
//
// 1. Form-stability invariant: same baseline + different states → identical
//    signature, seed, and gesture geometry; different light/palette/mood.
// 2. Different baseline → different signature/seed.
// 3. Commit-don't-average: form vocab only from baseline lane, light vocab
//    only from state lane, capped lists, tension as a clause (not a blend).

import { translate } from "../lib/translation/translate";
import { resolveBaselinePath, resolveStatePath } from "../lib/translation/trees";
import { buildPrompt } from "../lib/prompt/buildPrompt";
import { composeTitleAndInterpretation } from "../lib/interpret/title";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
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

console.log("\nWorked-example prompt (Crystal·Fractured·Privately × Heavier·Deep·grieving):\n");
console.log(built.prompt + "\n");
console.log(`Title: ${title}\n${interpretation}\n`);

if (failures > 0) {
  console.error(`\n${failures} invariant check(s) FAILED`);
  process.exit(1);
}
console.log("All invariants hold.");
