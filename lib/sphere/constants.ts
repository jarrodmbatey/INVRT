// Material identity of the sphere. These are NOT parameters.
//
// The object is a ball of liquid or plasma rendered like a planet: constant
// semi-gloss-to-gloss sheen, gases cycling, raised areas permitted but nothing
// large protruding and nothing deeply dented. Every sphere shares this
// substance; only its topology and weather differ.
//
// Any code path that writes to MATERIAL or exceeds GEOMETRY_LIMITS is a bug.

export const MATERIAL = {
  roughness: 0.18, // semi-gloss → gloss, fixed
  clearcoat: 0.85,
  clearcoatRoughness: 0.12,
  metalness: 0.0,
  envMapIntensity: 1.15,
} as const;

export const GEOMETRY_LIMITS = {
  radius: 1.0,
  maxDisplacement: 0.06, // hard cap: 6% of radius. "nothing big protruding"
  maxIndentation: 0.03, // hard cap: 3% of radius
  icosphereDetail: 6, // ~40k verts; drop to 5 on low-end GPUs
} as const;

/** Fallback tessellation for low-end GPUs. Referenced by the renderer only. */
export const LOW_DETAIL = 5;

/** Shader-side ceiling on band count. Must be >= BAND_COUNT_RANGE.max. */
export const MAX_BANDS = 12;

/** Shader-side ceiling on accent count. Must be >= 4 (§3: accents length 1–4). */
export const MAX_ACCENTS = 4;

/**
 * Version of the question → parameter mapping tables.
 *
 * Saved results store the version they were generated under. When mappings
 * change, bump this and register the old table in lib/sphere/questions —
 * old spheres must keep rendering exactly as they did (§7).
 */
export const MAPPING_VERSION = "v1";
