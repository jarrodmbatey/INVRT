// Mock provider — lets the full loop run locally with no API key.
// Returns the depth/control render itself as the "artwork", so every page,
// route, and invariant can be exercised offline. Selected automatically when
// no REPLICATE_API_TOKEN is present (with a server-side warning).

import type { GenerateInput, GenerateResult, ImageProvider } from "./types";

export function createMockProvider(): ImageProvider {
  return {
    id: "mock",
    model: "control-passthrough",
    async generate(input: GenerateInput): Promise<GenerateResult> {
      const m = input.controlImageDataUri.match(/^data:image\/png;base64,(.+)$/);
      if (!m) throw new Error("mock provider expects a PNG data URI control image");
      return {
        imageBytes: Buffer.from(m[1], "base64"),
        meta: { note: "mock provider — control map returned as artwork", seed: input.seed },
      };
    },
  };
}
