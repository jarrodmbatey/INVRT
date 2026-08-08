"use client";

// The body. One mesh, one material, one draw call — all band logic lives in
// the shader (§6).
//
// This component is the sole owner of everything that moves: the uniforms, the
// accumulated band longitudes, and the in-flight motion transition. That state
// changes 60 times a second and must never round-trip through React, so it
// lives in a ref and is mutated in place inside the frame callback.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GEOMETRY_LIMITS } from "@/lib/sphere/constants";
import { bandKinematics, type BandKinematics } from "@/lib/sphere/bands";
import { TRANSITION_MS, lerpMotion } from "@/lib/sphere/transition";
import type { MotionParams, StructureParams } from "@/lib/sphere/types";
import { plasmaFragmentShader, plasmaVertexShader } from "./plasmaShader";
import {
  advanceBandPhases,
  createPlasmaUniforms,
  syncPlasmaUniforms,
  type PlasmaUniforms,
} from "./uniforms";

interface Props {
  structure: StructureParams;
  /** The target weather. Reached over TRANSITION_MS when `animate` is set. */
  motion: MotionParams;
  /** Tessellation. 6 is the target; 5 is the low-end fallback. */
  detail?: number;
  /** Ease into new motion params rather than snapping. Default true. */
  animate?: boolean;
}

interface Live {
  uniforms: PlasmaUniforms;
  structure: StructureParams;
  /** The weather on screen right now — mid-transition, not the target. */
  motion: MotionParams;
  kinematics: BandKinematics;
  transition: { from: MotionParams; to: MotionParams; start: number } | null;
}

export default function PlasmaSphere({
  structure,
  motion,
  detail = GEOMETRY_LIMITS.icosphereDetail,
  animate = true,
}: Props) {
  const live = useRef<Live | null>(null);
  if (live.current === null) {
    const kinematics = bandKinematics(structure, motion);
    live.current = {
      uniforms: createPlasmaUniforms(structure, motion, kinematics),
      structure,
      motion,
      kinematics,
      transition: null,
    };
  }

  const geometry = useMemo(
    () => new THREE.IcosahedronGeometry(GEOMETRY_LIMITS.radius, detail),
    [detail],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: live.current!.uniforms,
        vertexShader: plasmaVertexShader,
        fragmentShader: plasmaFragmentShader,
        // No glslVersion: three upgrades every ShaderMaterial to
        // `#version 300 es` on its own — which is what the band logic needs for
        // dynamic uniform-array indexing, and the fragment stage for dFdx —
        // while still declaring the fragment output and the gl_FragColor alias
        // that its tonemapping and colorspace chunks depend on. Asking for
        // GLSL3 explicitly opts out of that declaration and the chunks stop
        // compiling.
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  // Structure never animates — identity does not ease into place (§8).
  useEffect(() => {
    const state = live.current!;
    state.structure = structure;
    state.kinematics = bandKinematics(structure, state.motion);
    syncPlasmaUniforms(state.uniforms, structure, state.motion, state.kinematics);
  }, [structure]);

  useEffect(() => {
    const state = live.current!;
    if (!animate) {
      state.transition = null;
      state.motion = motion;
      state.kinematics = bandKinematics(state.structure, motion);
      syncPlasmaUniforms(state.uniforms, state.structure, motion, state.kinematics);
      return;
    }
    state.transition = { from: state.motion, to: motion, start: performance.now() };
  }, [motion, animate]);

  useFrame((_, delta) => {
    const state = live.current!;
    // Guard against a tab-switch spike producing a phase jump.
    const dt = Math.min(delta, 1 / 20);

    const active = state.transition;
    if (active) {
      const t = (performance.now() - active.start) / TRANSITION_MS;
      if (t >= 1) state.transition = null;
      state.motion = t >= 1 ? active.to : lerpMotion(active.from, active.to, t);
      state.kinematics = bandKinematics(state.structure, state.motion);
      syncPlasmaUniforms(state.uniforms, state.structure, state.motion, state.kinematics);
    }

    state.uniforms.uTime.value += dt;
    advanceBandPhases(state.uniforms, state.kinematics, dt);
  });

  return <mesh geometry={geometry} material={material} />;
}
