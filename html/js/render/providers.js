// GENERATION — the browser equivalent of app/api/generate/route.ts.
//
// Same pipeline, no server: validate paths → translate() → buildPrompt() →
// compose title → export the depth/control map → render → persist.
//
// Provider keys are deliberately absent. A static page cannot hold a Replicate
// token without handing it to everyone who opens it, so the browser build ships
// two local providers instead. Real Flux Depth generation stays in the Next.js
// app, where the key lives in a server route.

import { translate } from "../translation/translate.js";
import { resolveBaselinePath, resolveStatePath } from "../translation/trees.js";
import { buildPrompt } from "../prompt/buildPrompt.js";
import { composeTitleAndInterpretation } from "../interpret/title.js";
import { renderControlCanvas } from "../sphere/controlRenderer.js";
import { renderArtworkCanvas } from "./localRender.js";
import { getSettings, listGenerations, newId, saveGeneration } from "../store.js";

const PROVIDERS = {
  // A lit photograph of the deterministic sculpture. Form and material from the
  // baseline; light, palette and atmosphere from the state.
  "local-render": {
    id: "local-render",
    model: "invrt-studio-r1",
    label: "Studio render",
    render: ({ baselinePath, statePathIds, seed }) => renderArtworkCanvas(baselinePath, statePathIds, seed),
  },
  // The depth/control map itself, exactly as lib/providers/mock.ts returns it
  // when no REPLICATE_API_TOKEN is present.
  "control-map": {
    id: "mock",
    model: "control-passthrough",
    label: "Depth control map",
    render: ({ controlCanvas }) => controlCanvas,
  },
};

export function providerOptions() {
  return Object.entries(PROVIDERS).map(([key, p]) => ({ key, label: p.label }));
}

function pickProvider() {
  const key = getSettings().provider;
  return { key, provider: PROVIDERS[key] ?? PROVIDERS["local-render"] };
}

function toBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))), "image/png");
  });
}

/**
 * Form-stability invariant, enforced at runtime instead of only in a test:
 * any two pieces sharing a baseline must share seed, gesture and form lane.
 * Throws rather than quietly saving a piece that breaks the promise.
 */
async function assertFormStability(t) {
  const siblings = (await listGenerations()).filter((g) => g.baselineSignature === t.baselineSignature);
  if (siblings.length === 0) return;
  const prev = siblings[0];
  const same =
    prev.seed === t.seed &&
    JSON.stringify(prev.gesture.controlPoints) === JSON.stringify(t.gesture.controlPoints) &&
    JSON.stringify(prev.formLane) ===
      JSON.stringify([t.descriptors.form, t.descriptors.material, t.descriptors.surface, t.descriptors.geometry]);
  if (!same) {
    throw new Error("Form-stability invariant violated: this baseline has rendered a different form before.");
  }
}

/**
 * Run the full pipeline for one baseline × state pairing and store the result.
 * `replace` re-renders an existing piece in place (see regenerate below).
 * `onStage` reports progress so the forming screen can stay honest.
 */
export async function generate({ baselinePathIds, statePathIds, replace = null }, onStage = () => {}) {
  // Validates ids against the trees — throws on anything unknown.
  const baselinePath = resolveBaselinePath(baselinePathIds);
  const statePath = resolveStatePath(statePathIds);

  const t = translate(baselinePath, statePath);
  const built = buildPrompt(t);
  const { title, interpretation } = composeTitleAndInterpretation(t, baselinePathIds, statePathIds);
  await assertFormStability(t);

  const { key, provider } = pickProvider();

  onStage("control");
  // Deterministic, baseline-only depth render (1024²) — the conditioning image
  // the Next.js app posts to Replicate, kept here as provenance.
  const controlCanvas = renderControlCanvas(baselinePath);
  const controlImage = await toBlob(controlCanvas);

  onStage("render");
  const artworkCanvas = provider.render({ baselinePath, statePathIds, seed: built.seed, controlCanvas });
  const image = await toBlob(artworkCanvas);

  const record = {
    id: replace?.id ?? newId(),
    createdAt: replace?.createdAt ?? Date.now(),
    status: "succeeded",
    baselineSignature: t.baselineSignature,
    baselineLabel: t.baselineLabel,
    baselinePathIds,
    statePathIds,
    stateLabel: t.stateLabel,
    title,
    interpretation,
    prompt: built.prompt,
    negativePrompt: built.negativePrompt,
    seed: built.seed,
    provider: provider.id,
    providerKey: key,
    model: provider.model,
    gesture: t.gesture,
    formLane: [t.descriptors.form, t.descriptors.material, t.descriptors.surface, t.descriptors.geometry],
    descriptors: t.descriptors,
    image,
    controlImage,
  };

  onStage("saving");
  await saveGeneration(record);
  return record;
}

/**
 * Re-run an existing piece from its stored paths (the "Regenerate" action).
 *
 * Unlike the Replicate path, a local render of the same paths is deterministic
 * down to the grain — so this replaces the piece in place rather than filling
 * the gallery with identical twins. It is what you reach for after switching
 * renderer in Settings, or after a render that failed part-way.
 */
export async function regenerate(previous, onStage) {
  return generate(
    {
      baselinePathIds: previous.baselinePathIds,
      statePathIds: previous.statePathIds,
      replace: { id: previous.id, createdAt: previous.createdAt },
    },
    onStage,
  );
}
