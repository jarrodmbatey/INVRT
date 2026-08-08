// Uniform construction and per-frame sync.
//
// Everything is allocated once and mutated in place. Nothing in the frame loop
// may allocate: at 60fps a new Vector3 per uniform per frame is how a smooth
// object turns into a stuttering one.

import * as THREE from "three";
import { MAX_ACCENTS, MAX_BANDS } from "@/lib/sphere/constants";
import { hemisphereFocus, type BandKinematics } from "@/lib/sphere/bands";
import type { MotionParams, ProtrusionMode, StructureParams } from "@/lib/sphere/types";

const ACTIVITY_MODE: Record<StructureParams["activityCenter"], number> = {
  poles: 0,
  equator: 1,
  hemisphere: 2,
};

const PROTRUSION_MODE: Record<ProtrusionMode, number> = {
  none: 0,
  constant: 1,
  intermittent: 2,
};

export type PlasmaUniforms = Record<string, THREE.IUniform>;

/**
 * The external key light. Dimmed as lightSource rises — a body lit from within
 * that is also blasted from outside just looks like a lit ball.
 */
export function keyLightFor(structure: StructureParams) {
  return {
    direction: new THREE.Vector3(1.1, 1.35, 0.9).normalize(),
    color: new THREE.Color(0.98, 0.96, 0.92),
    intensity: THREE.MathUtils.lerp(1.5, 0.35, structure.lightSource),
    ambient: THREE.MathUtils.lerp(0.1, 0.26, structure.lightSource),
  };
}

function hslColor(h: number, s: number, l: number, target: THREE.Color) {
  return target.setHSL(h / 360, s, l, THREE.SRGBColorSpace);
}

export function createPlasmaUniforms(
  structure: StructureParams,
  motion: MotionParams,
  kinematics: BandKinematics,
): PlasmaUniforms {
  const key = keyLightFor(structure);
  const uniforms: PlasmaUniforms = {
    uTime: { value: 0 },
    uSeed: { value: 0 },
    uBodyPhase: { value: 0 },

    uBandCount: { value: 1 },
    uBandBoundary: { value: new Float32Array(MAX_BANDS) },
    uBandEdgeWidth: { value: new Float32Array(MAX_BANDS) },
    uBandPhase: { value: new Float32Array(MAX_BANDS) },
    uBandAccent: { value: new Float32Array(MAX_BANDS) },

    uBaseColor: { value: new THREE.Color() },
    uAccentColor: {
      value: Array.from({ length: MAX_ACCENTS }, () => new THREE.Color()),
    },
    uColorSeparation: { value: 0 },
    uAccentIntensity: { value: 0 },

    uLightSource: { value: 0 },
    uDepth: { value: 0 },
    uViscosity: { value: 0 },

    uTurbulenceScale: { value: 0 },
    uTurbulenceAmplitude: { value: 0 },
    uCoherence: { value: 0 },

    uProtrusionMode: { value: 0 },
    uProtrusionAmplitude: { value: 0 },
    uProtrusionLength: { value: 0 },
    uProtrusionFrequency: { value: 0 },

    uActivityMode: { value: 1 },
    uActivityFocusY: { value: 0 },
    uAsymmetry: { value: 0 },

    uKeyLightDir: { value: key.direction },
    uKeyLightColor: { value: key.color },
    uKeyLightIntensity: { value: key.intensity },
    uAmbient: { value: key.ambient },
  };

  syncPlasmaUniforms(uniforms, structure, motion, kinematics);
  return uniforms;
}

/** Push a params change into the existing uniform objects. Never reallocates. */
export function syncPlasmaUniforms(
  u: PlasmaUniforms,
  structure: StructureParams,
  motion: MotionParams,
  kinematics: BandKinematics,
): void {
  u.uSeed.value = (structure.seed % 10007) / 97;

  u.uBandCount.value = kinematics.count;
  const boundary = u.uBandBoundary.value as Float32Array;
  const edge = u.uBandEdgeWidth.value as Float32Array;
  const accent = u.uBandAccent.value as Float32Array;
  for (let i = 0; i < MAX_BANDS; i++) {
    boundary[i] = i < kinematics.boundaries.length ? kinematics.boundaries[i] : 2;
    edge[i] = i < kinematics.edgeWidths.length ? kinematics.edgeWidths[i] : 0.01;
    accent[i] = i < kinematics.accentIndex.length ? kinematics.accentIndex[i] : -1;
  }

  const base = u.uBaseColor.value as THREE.Color;
  hslColor(structure.baseColor.h, structure.baseColor.s, structure.baseColor.l, base);

  const accents = u.uAccentColor.value as THREE.Color[];
  for (let k = 0; k < MAX_ACCENTS; k++) {
    const a = structure.accents[k];
    if (a) {
      hslColor(
        structure.baseColor.h + a.hueOffset,
        a.saturation,
        // Barely brighter than the body: enough to read as light in the plasma,
        // not enough to read as a second coat of paint.
        Math.min(0.7, structure.baseColor.l + 0.06),
        accents[k],
      );
    } else {
      accents[k].copy(base);
    }
  }

  u.uColorSeparation.value = structure.colorSeparation;
  u.uAccentIntensity.value = motion.accentIntensity;

  u.uLightSource.value = structure.lightSource;
  u.uDepth.value = structure.depth;
  u.uViscosity.value = structure.viscosity;

  u.uTurbulenceScale.value = motion.turbulenceScale;
  u.uTurbulenceAmplitude.value = motion.turbulenceAmplitude;
  u.uCoherence.value = motion.coherence;

  u.uProtrusionMode.value = PROTRUSION_MODE[motion.protrusionMode];
  u.uProtrusionAmplitude.value = motion.protrusionAmplitude;
  u.uProtrusionLength.value = motion.protrusionLength;
  u.uProtrusionFrequency.value = motion.protrusionFrequency;

  u.uActivityMode.value = ACTIVITY_MODE[structure.activityCenter];
  u.uActivityFocusY.value =
    structure.activityCenter === "hemisphere" ? hemisphereFocus(structure) : 0;
  u.uAsymmetry.value = structure.asymmetry;

  // Direction and colour are fixed; only the balance between the external key
  // and the body's own light moves. Computed inline so a per-frame sync during
  // a motion transition allocates nothing.
  u.uKeyLightIntensity.value = THREE.MathUtils.lerp(1.5, 0.35, structure.lightSource);
  u.uAmbient.value = THREE.MathUtils.lerp(0.1, 0.26, structure.lightSource);
}

/**
 * Advance the longitudes: θ_i += ω_i · dt per band, plus the body's own spin.
 *
 * All rotation lives in these accumulators rather than in a transform on the
 * mesh. On a sphere the silhouette does not change when you turn it, so there
 * is nothing to gain from rotating the object — and keeping every moving part
 * in one place means the body's spin and its bands' shear can never drift out
 * of agreement.
 */
export function advanceBandPhases(
  u: PlasmaUniforms,
  kinematics: BandKinematics,
  delta: number,
): void {
  const phase = u.uBandPhase.value as Float32Array;
  for (let i = 0; i < kinematics.count; i++) {
    phase[i] += kinematics.angularVelocity[i] * delta;
  }
  u.uBodyPhase.value += kinematics.baseAngularVelocity * delta;
}
