// fal.ai provider — STUB. Same interface; wire later.
// Candidate endpoint: a fal-ai/flux depth/control LoRA. Implement generate()
// with @fal-ai/client when enabling; select with IMAGE_PROVIDER=fal.

import type { GenerateResult, ImageProvider } from "./types";

export function createFalProvider(): ImageProvider {
  return {
    id: "fal",
    model: "fal-ai/flux-control (stub)",
    async generate(): Promise<GenerateResult> {
      throw new Error(
        "fal provider is not wired yet. Set IMAGE_PROVIDER=replicate (or mock) for now.",
      );
    },
  };
}
