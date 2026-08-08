"use client";

// The outer shell. Rendered only when halo > 0.1 — below that it is invisible
// and an extra transparent draw call for nothing.

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GEOMETRY_LIMITS } from "@/lib/sphere/constants";
import type { StructureParams } from "@/lib/sphere/types";
import { haloFragmentShader, haloVertexShader } from "./plasmaShader";

export const HALO_THRESHOLD = 0.1;

interface Props {
  structure: StructureParams;
}

export default function HaloShell({ structure }: Props) {
  const { h, s, l } = structure.baseColor;
  const { halo } = structure;

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 3), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const scale = 1.03 + 0.22 * halo;

  // Halo is structure: it is fixed for the life of a sphere, so building the
  // material from it outright beats mutating uniforms after the fact.
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: {
            value: new THREE.Color().setHSL(
              h / 360,
              Math.min(1, s + 0.1),
              Math.min(0.8, l + 0.28),
              THREE.SRGBColorSpace,
            ),
          },
          uStrength: { value: 0.2 + 0.85 * halo },
          // A faint halo is a tight rim; a pronounced one is a broad atmosphere.
          uFalloff: { value: THREE.MathUtils.lerp(4.5, 1.4, halo) },
          uInnerRadius: { value: GEOMETRY_LIMITS.radius },
          uOuterRadius: { value: 1.03 + 0.22 * halo },
        },
        vertexShader: haloVertexShader,
        fragmentShader: haloFragmentShader,
        // See PlasmaSphere: three's own GLSL3 upgrade, not an explicit one.
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      }),
    [h, s, l, halo],
  );
  useEffect(() => () => material.dispose(), [material]);

  if (halo <= HALO_THRESHOLD) return null;

  return <mesh geometry={geometry} material={material} scale={scale} />;
}
