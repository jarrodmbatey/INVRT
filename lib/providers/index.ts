// Provider selection — server-side only. Keys never reach the client.

import type { ImageProvider } from "./types";
import { createFalProvider } from "./fal";
import { createMockProvider } from "./mock";
import { createReplicateProvider } from "./replicate";

export function getProvider(): ImageProvider {
  const requested = process.env.IMAGE_PROVIDER ?? "replicate";
  switch (requested) {
    case "mock":
      return createMockProvider();
    case "fal":
      return createFalProvider();
    case "replicate":
      if (!process.env.REPLICATE_API_TOKEN) {
        console.warn(
          "[invrt] REPLICATE_API_TOKEN not set — falling back to the mock provider. " +
            "Add a token to .env to generate real artwork.",
        );
        return createMockProvider();
      }
      return createReplicateProvider();
    default:
      throw new Error(`Unknown IMAGE_PROVIDER: ${requested}`);
  }
}
