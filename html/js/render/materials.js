// BASELINE → MATERIAL + FRAMING.
//
// The other half of the lane discipline (see js/render/lighting.js): everything
// here is a pure function of the baseline path, so the same person always gets
// the same substance and the same framing, whatever the weather.
//
// This is the visual twin of the material/surface/composition descriptors in
// lib/translation/baselineTree.ts — edit it alongside them.

import * as THREE from "three";

/** Root lanes — the committed substance. */
const ROOT_MATERIALS = {
  // "polished dark glass", "smoky quartz", "sharp exact edges, internal refraction"
  b_crystal: {
    color: 0x2f3547,
    metalness: 0.12,
    roughness: 0.08,
    transmission: 0.34,
    ior: 1.72,
    thickness: 1.4,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    flatShading: true,
    envIntensity: 2.2,
  },
  // "liquid metal", "dark water", "rippling, wet sheen"
  b_current: {
    color: 0x4a5568,
    metalness: 1,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envIntensity: 2.1,
  },
  // "basalt", "raw marble", "rough hewn, matte mineral"
  b_stone: {
    color: 0x2e2a24,
    metalness: 0.06,
    roughness: 0.88,
    clearcoat: 0.05,
    clearcoatRoughness: 0.8,
    flatShading: true,
    envIntensity: 0.9,
  },
  // "molten gold", "incandescent metal", "luminous, emissive veins"
  b_flame: {
    color: 0x4a3520,
    metalness: 0.92,
    roughness: 0.26,
    clearcoat: 0.4,
    clearcoatRoughness: 0.3,
    emissive: 0x76360d,
    emissiveIntensity: 0.22,
    envIntensity: 1.7,
  },
};

/** Level-2 modulators — surface nuance only, never a new substance. */
const SURFACE_MODULATORS = {
  b_crystal_exact: { roughness: 0.02, clearcoatRoughness: 0.02 }, // "razor-sharp facets"
  b_crystal_fractured: { roughness: 0.14, transmission: 0.28, thickness: 1.9 }, // "internal fractures"
  b_crystal_smooth: { roughness: 0.03, transmission: 0.42, flatShading: false }, // "polished glassy planes"
  b_current_river: { roughness: 0.1 }, // "single strong line"
  b_current_tide: { roughness: 0.18, clearcoat: 0.85 }, // "cyclical folds"
  b_current_mist: { roughness: 0.36, transmission: 0.24, metalness: 0.55, thickness: 1.1 }, // "vaporous glass"
  b_stone_pressure: { roughness: 0.8, color: 0x282420 }, // "dense compressed grain"
  b_stone_time: { roughness: 0.94, color: 0x39342c }, // "eroded, worn smooth in places"
  b_stone_fire: { roughness: 0.55, color: 0x201c19, clearcoat: 0.35 }, // "glassy fused patches"
  b_flame_steady: { emissiveIntensity: 0.2 }, // "even warm glow"
  b_flame_flicker: { emissiveIntensity: 0.32, roughness: 0.34 }, // "restless uneven glow"
  b_flame_blinding: { emissiveIntensity: 0.58, emissive: 0xc07430 }, // "intense core light, bloom"
};

/**
 * Level-3 "hold" — how the form sits in frame. Composition is a baseline lane
 * in the tree, so it belongs here, not in the light rig.
 *
 * `fill` is the fraction of the frame's half-height the form occupies; the
 * camera distance is solved from the sculpture's own bounding sphere so a
 * spiked flame and a compact crystal are both held the same way.
 */
const HOLD_FRAMING = {
  // "fully exposed, centered and unguarded in the frame"
  b_hold_openly: { fill: 0.7, offsetX: 0, offsetY: 0, keyIntensityMul: 1 },
  // "partially shadowed, contained, turned slightly away from the light"
  b_hold_privately: { fill: 0.64, offsetX: 0.14, offsetY: 0.02, keyIntensityMul: 0.82 },
  // "large in the frame, dominant, close, filling the dark"
  b_hold_heavily: { fill: 0.9, offsetX: 0, offsetY: -0.03, keyIntensityMul: 1.08 },
};

/** Build the body material for a baseline path. */
export function bodyMaterialForBaseline(baselinePath) {
  const ids = baselinePath.map((n) => n.id);
  const spec = { ...(ROOT_MATERIALS[ids[0]] ?? ROOT_MATERIALS.b_stone), ...(SURFACE_MODULATORS[ids[1]] ?? {}) };

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.color),
    metalness: spec.metalness,
    roughness: spec.roughness,
    clearcoat: spec.clearcoat ?? 0,
    clearcoatRoughness: spec.clearcoatRoughness ?? 0.3,
    flatShading: spec.flatShading ?? false,
    envMapIntensity: spec.envIntensity ?? 1,
  });
  if (spec.transmission) {
    material.transmission = spec.transmission;
    material.ior = spec.ior ?? 1.5;
    material.thickness = spec.thickness ?? 1;
  }
  if (spec.emissive) {
    material.emissive = new THREE.Color(spec.emissive);
    material.emissiveIntensity = spec.emissiveIntensity ?? 0.3;
  }
  return material;
}

/** Camera framing for a baseline path — the level-3 "hold" question. */
export function framingForBaseline(baselinePath) {
  const holdId = baselinePath[2]?.id;
  return HOLD_FRAMING[holdId] ?? HOLD_FRAMING.b_hold_openly;
}
