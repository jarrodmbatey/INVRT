// Provider-agnostic image generation interface. Server-side only.

export interface GenerateInput {
  prompt: string;
  negativePrompt: string;
  /** Depth/control map as a PNG data URI. */
  controlImageDataUri: string;
  seed: number;
  width: number;
  height: number;
  /** How strongly the control map constrains the form. Keep high (≈0.65–0.8). */
  conditioningStrength?: number;
  steps?: number;
  guidance?: number;
}

export interface GenerateResult {
  imageUrl?: string;
  imageBytes?: Buffer;
  meta: Record<string, unknown>;
}

export interface ImageProvider {
  id: string;
  model: string;
  generate(input: GenerateInput): Promise<GenerateResult>;
}
