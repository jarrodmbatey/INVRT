"use client";

// Axial tilt.
//
// Rotation is deliberately not here. A sphere's silhouette does not change when
// you turn it, so spinning the transform would buy nothing that the shader's
// accumulated longitudes do not already give — and splitting rotation across a
// transform and a set of uniforms is how the body's spin and its bands' shear
// end up disagreeing. Tilt is structure and never animates; the rig is a
// static frame around a body that moves entirely in its own shader.

import type { ReactNode } from "react";
import * as THREE from "three";

interface Props {
  /** Degrees, 0–45. */
  axialTilt: number;
  children: ReactNode;
}

export default function SphereRig({ axialTilt, children }: Props) {
  return (
    <group rotation={[0, 0, THREE.MathUtils.degToRad(axialTilt)]}>{children}</group>
  );
}
