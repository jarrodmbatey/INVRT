// STATE → LIGHT RIG.
//
// The browser build has no server and no Replicate key, so the artwork is
// rendered locally. That only stays faithful to INVRT if the same lane
// discipline holds in pixels as in words:
//
//   baseline → geometry + material          (js/render/materials.js)
//   state    → light, palette, atmosphere   (this file)
//
// Nothing here may touch geometry, camera framing or material. This table is
// the visual twin of the light/palette/mood/atmosphere descriptors in
// lib/translation/stateTree.ts — edit it alongside them.

/** Root lanes — committed, exactly like route() commits the light lane. */
const ROOT_RIGS = {
  s_lighter: {
    exposure: 1.15,
    key: { color: 0xfff2dc, intensity: 7.44, azimuth: -0.6, elevation: 0.75 },
    rim: { color: 0xd8c9a8, intensity: 3.6, azimuth: 2.5, elevation: 0.2 },
    fill: { color: 0x8792a6, intensity: 0.84 },
    fog: { color: 0x14141a, density: 0.045 },
    ground: { inner: 0x1c1a18, outer: 0x08080a },
    accent: 0xd8c39a,
    bloom: 0.34,
    vignette: 0.55,
  },
  s_heavier: {
    exposure: 0.95,
    key: { color: 0x9fb0c6, intensity: 4.56, azimuth: -1.0, elevation: 0.45 },
    rim: { color: 0x5d6b82, intensity: 2.16, azimuth: 2.7, elevation: 0.1 },
    fill: { color: 0x3d4557, intensity: 0.8 },
    fog: { color: 0x0a0c12, density: 0.115 },
    ground: { inner: 0x121620, outer: 0x050609 },
    accent: 0x7d8ba3,
    bloom: 0.2,
    vignette: 0.75,
  },
};

/** Level-2 registers — the nuance, layered over the committed root. */
const REGISTER_RIGS = {
  // Lighter
  s_calm: {
    exposure: 1.05,
    key: { color: 0xe6e9ef, intensity: 5.52, azimuth: -0.5, elevation: 0.6 },
    rim: { color: 0xa8b4c6, intensity: 2.64 },
    fill: { color: 0x7d8899, intensity: 0.96 },
    fog: { color: 0x15171c, density: 0.06 },
    ground: { inner: 0x1a1c22, outer: 0x08080a },
    accent: 0xa9b3c2,
    bloom: 0.22,
    vignette: 0.5,
  },
  s_bright: {
    exposure: 1.32,
    key: { color: 0xfff6e4, intensity: 10.08, azimuth: -0.45, elevation: 0.9 },
    rim: { color: 0xf0c98a, intensity: 4.8 },
    fill: { color: 0x9aa3b4, intensity: 1.08 },
    fog: { color: 0x1a1814, density: 0.03 },
    ground: { inner: 0x24201a, outer: 0x0a0908 },
    accent: 0xf2c98d,
    bloom: 0.48,
    vignette: 0.4,
  },
  s_tender: {
    exposure: 1.12,
    key: { color: 0xffd9bd, intensity: 6.24, azimuth: -0.7, elevation: 0.55 },
    rim: { color: 0xe8a98d, intensity: 5.52, azimuth: 2.2, elevation: 0.35 },
    fill: { color: 0x8f7d84, intensity: 1.01 },
    fog: { color: 0x1d1519, density: 0.075 },
    ground: { inner: 0x241a1c, outer: 0x0a0709 },
    accent: 0xe6a98a,
    bloom: 0.42,
    vignette: 0.52,
  },
  // Heavier
  s_dim: {
    exposure: 1.0,
    key: { color: 0xb6bac0, intensity: 4.4, azimuth: -0.9, elevation: 0.5 },
    rim: { color: 0x71767e, intensity: 1.32 },
    fill: { color: 0x5a5e66, intensity: 0.72 },
    fog: { color: 0x131418, density: 0.1 },
    ground: { inner: 0x16171a, outer: 0x080809 },
    accent: 0x8d9199,
    bloom: 0.12,
    vignette: 0.62,
    saturation: 0.55,
  },
  s_sharp: {
    exposure: 0.98,
    key: { color: 0xcfd8e6, intensity: 11.04, azimuth: -1.22, elevation: 0.12 },
    rim: { color: 0x8fa0b8, intensity: 1.68, azimuth: 2.9, elevation: -0.1 },
    fill: { color: 0x2e343f, intensity: 0.85 },
    fog: { color: 0x0b0d11, density: 0.085 },
    ground: { inner: 0x14171d, outer: 0x040507 },
    accent: 0xb9c6d8,
    bloom: 0.26,
    vignette: 0.8,
    contrast: 1.18,
  },
  s_deep: {
    exposure: 0.86,
    key: { color: 0x8fa6c8, intensity: 4.6, azimuth: -1.15, elevation: 0.35 },
    rim: { color: 0x3c4a66, intensity: 0.84 },
    fill: { color: 0x232c42, intensity: 1.05 },
    fog: { color: 0x070a12, density: 0.155 },
    ground: { inner: 0x0d1120, outer: 0x030408 },
    accent: 0x6a7ea6,
    bloom: 0.18,
    vignette: 0.8,
  },
};

/**
 * Level-3 leaf accents — the smallest nudge, matching each leaf's one added
 * descriptor. Deltas, not replacements (mirrors how route() layers leaves on).
 */
const LEAF_ACCENTS = {
  // Calm
  s_relieved: { exposureMul: 1.06, bloomAdd: 0.05 }, // "a slow exhale of light"
  s_peaceful: { fogDensityMul: 0.8, vignetteAdd: -0.05 }, // "perfectly still air"
  s_steady: {}, // "unwavering soft light" — the register, unmodified
  // Bright
  s_energized: { accent: 0xffb454, bloomAdd: 0.12, keyIntensityMul: 1.1 }, // "bright amber flare"
  s_hopeful: { keyElevationAdd: 0.35, rimIntensityMul: 1.15 }, // "light arriving from above"
  s_playful: { keyAzimuthAdd: 0.5, bloomAdd: 0.08 }, // "dancing highlights"
  // Tender
  s_grateful: { keyColor: 0xffcfa8, exposureMul: 1.04 }, // "a held warm glow"
  s_loved: { rimIntensityMul: 1.45, fillIntensityMul: 1.3 }, // "enveloping warmth"
  s_moved: { fogColor: 0x241820, accent: 0xdf9d9d }, // "a faint rose bloom"
  // Dim
  s_numb: { saturationMul: 0.55 }, // "color drained almost to grey"
  s_tired: { keyIntensityMul: 0.72, vignetteAdd: 0.06 }, // "too weak to reach the edges"
  s_distant: { fogDensityMul: 1.45 }, // "a pale veil between viewer and form"
  // Sharp
  s_tense: { keyElevationAdd: -0.1, contrastMul: 1.06 }, // "light striking at a hard angle"
  s_angry: { rimColor: 0x9e2b1e, rimIntensityMul: 2.2, accent: 0xb2372a }, // "a single deep red ember"
  s_restless: { keyAzimuthAdd: -0.35, contrastMul: 1.04 }, // "shifting hard shadows"
  s_anxious: { fogDensityMul: 1.2, vignetteAdd: 0.06 }, // "air pulled tight"
  // Deep
  s_grieving: { rimIntensityMul: 0.35, keyColor: 0xa9c2e8 }, // "a single cold highlight"
  s_ashamed: { keyAzimuthAdd: -0.75 }, // "half-turned from the light" — the light moves, never the form
  s_lonely: { vignetteAdd: 0.08, groundInner: 0x090c15 }, // "vast empty darkness"
  s_aching: { fogColor: 0x0b0a1a, accent: 0x6d6396 }, // "bruised indigo depths"
};

/** Shallow-merge a rig layer over the accumulated rig. */
function layer(base, patch) {
  if (!patch) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...(base[k] ?? {}), ...v } : v;
  }
  return out;
}

/**
 * Build the light rig for a state path. Pure function of the state ids —
 * the baseline is deliberately not a parameter.
 */
export function lightRigForState(statePathIds) {
  let rig = layer(
    {
      exposure: 1,
      key: { color: 0xffffff, intensity: 6.0, azimuth: -0.6, elevation: 0.6 },
      rim: { color: 0x8899aa, intensity: 2.4, azimuth: 2.6, elevation: 0.2 },
      fill: { color: 0x666a75, intensity: 0.72 },
      fog: { color: 0x0a0a0c, density: 0.08 },
      ground: { inner: 0x161619, outer: 0x070708 },
      accent: 0x9aa0ad,
      bloom: 0.25,
      vignette: 0.6,
      saturation: 1,
      contrast: 1,
    },
    ROOT_RIGS[statePathIds[0]],
  );
  rig = layer(rig, REGISTER_RIGS[statePathIds[1]]);

  const a = LEAF_ACCENTS[statePathIds[2]] ?? {};
  if (a.exposureMul) rig.exposure *= a.exposureMul;
  if (a.bloomAdd) rig.bloom = Math.max(0, rig.bloom + a.bloomAdd);
  if (a.vignetteAdd) rig.vignette = Math.min(1, Math.max(0, rig.vignette + a.vignetteAdd));
  if (a.saturationMul) rig.saturation *= a.saturationMul;
  if (a.contrastMul) rig.contrast *= a.contrastMul;
  if (a.fogDensityMul) rig.fog = { ...rig.fog, density: rig.fog.density * a.fogDensityMul };
  if (a.fogColor) rig.fog = { ...rig.fog, color: a.fogColor };
  if (a.groundInner) rig.ground = { ...rig.ground, inner: a.groundInner };
  if (a.accent) rig.accent = a.accent;
  if (a.keyColor) rig.key = { ...rig.key, color: a.keyColor };
  if (a.keyIntensityMul) rig.key = { ...rig.key, intensity: rig.key.intensity * a.keyIntensityMul };
  if (a.keyAzimuthAdd) rig.key = { ...rig.key, azimuth: rig.key.azimuth + a.keyAzimuthAdd };
  if (a.keyElevationAdd) rig.key = { ...rig.key, elevation: rig.key.elevation + a.keyElevationAdd };
  if (a.rimColor) rig.rim = { ...rig.rim, color: a.rimColor };
  if (a.rimIntensityMul) rig.rim = { ...rig.rim, intensity: rig.rim.intensity * a.rimIntensityMul };
  if (a.fillIntensityMul) rig.fill = { ...rig.fill, intensity: rig.fill.intensity * a.fillIntensityMul };

  return rig;
}

/**
 * Spherical light placement → cartesian, so the tables above stay readable.
 * Directional lights only care about direction, so the radius just needs to
 * clear the form; it scales with the camera distance.
 */
export function lightPosition({ azimuth, elevation }, radius = 5) {
  const r = radius * Math.cos(elevation);
  return [r * Math.sin(azimuth), radius * Math.sin(elevation), r * Math.cos(azimuth)];
}
