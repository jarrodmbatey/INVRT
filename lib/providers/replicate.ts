// Replicate provider — Flux Depth. Server-side only; never import from client code.
//
// NOTE: model slugs and input field names on Replicate evolve. The slug is
// overridable via REPLICATE_MODEL. As of writing, black-forest-labs/flux-depth-dev
// takes: prompt, control_image (accepts a base64 data URI), guidance,
// num_inference_steps, seed, output_format. Flux models do not support a
// negative prompt input — ours is recorded in meta for provenance, and the
// style spine carries the exclusions in-prompt ("No text, no people, ...").

import Replicate from "replicate";
import type { GenerateInput, GenerateResult, ImageProvider } from "./types";

const DEFAULT_MODEL = "black-forest-labs/flux-depth-dev";

export function createReplicateProvider(): ImageProvider {
  const model = process.env.REPLICATE_MODEL ?? DEFAULT_MODEL;
  return {
    id: "replicate",
    model,
    async generate(input: GenerateInput): Promise<GenerateResult> {
      // Tolerate common paste accidents in env values: whitespace, quotes.
      const token = process.env.REPLICATE_API_TOKEN?.trim().replace(/^["']|["']$/g, "");
      if (!token) throw new Error("REPLICATE_API_TOKEN is not set");
      const replicate = new Replicate({ auth: token });

      // replicate.run() creates the prediction and polls until it settles.
      const output = await replicate.run(model as `${string}/${string}`, {
        input: {
          prompt: input.prompt,
          control_image: input.controlImageDataUri,
          seed: input.seed,
          guidance: input.guidance ?? 10,
          num_inference_steps: input.steps ?? 28,
          output_format: "png",
          megapixels: "1",
        },
      });

      const imageUrl = await firstUrl(output);
      if (!imageUrl) throw new Error("Replicate returned no output image");
      return {
        imageUrl,
        meta: {
          model,
          negativePromptNote: "flux has no negative_prompt input; recorded for provenance only",
          negativePrompt: input.negativePrompt,
        },
      };
    },
  };
}

/** Replicate may return a URL string, an array, or FileOutput objects. */
async function firstUrl(output: unknown): Promise<string | undefined> {
  const item = Array.isArray(output) ? output[0] : output;
  if (!item) return undefined;
  if (typeof item === "string") return item;
  if (typeof item === "object" && "url" in item && typeof item.url === "function") {
    const u = item.url();
    return typeof u === "string" ? u : u?.href;
  }
  return undefined;
}
