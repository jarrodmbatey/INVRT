"use client";

// The scene, as laid out in §6:
//
//   <Canvas>
//     <SphereRig>            axialTilt
//       <mesh>               icosahedron + plasmaMaterial
//       <HaloShell />        conditional, when halo > 0.1
//     <Lighting />           external key light, dimmed as lightSource rises
//
// Spin — rotationDirection, global speed, per-band shear — lives inside the
// plasma material rather than on the rig; see SphereRig for why.

import { useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { GEOMETRY_LIMITS, LOW_DETAIL } from "@/lib/sphere/constants";
import type { SphereParams } from "@/lib/sphere/types";
import HaloShell from "./HaloShell";
import Lighting from "./Lighting";
import PlasmaSphere from "./PlasmaSphere";
import SphereRig from "./SphereRig";

const noopSubscribe = () => () => {};

interface Props {
  params: SphereParams;
  /** Ease motion changes over ~800ms. Off for static grids and thumbnails. */
  animate?: boolean;
  /** Drop to LOW_DETAIL on low-end GPUs, or for many spheres on one page. */
  detail?: number;
  className?: string;
}

export default function PlasmaScene({
  params,
  animate = true,
  detail = GEOMETRY_LIMITS.icosphereDetail,
  className,
}: Props) {
  // Canvas needs the DOM. Render nothing until after hydration.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const { structure, motion } = params;

  if (!mounted) return null;

  return (
    <div className={className ?? "absolute inset-0"}>
      <Canvas
        // Far enough back that the body (radius 1) plus the widest halo
        // (1.25) clears the frame vertically: 4.0 · tan(17.5°) ≈ 1.26.
        camera={{ position: [0, 0, 4.0], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.95;
        }}
      >
        <Lighting structure={structure} />
        <SphereRig axialTilt={structure.axialTilt}>
          <PlasmaSphere
            structure={structure}
            motion={motion}
            detail={detail}
            animate={animate}
          />
          <HaloShell structure={structure} />
        </SphereRig>
      </Canvas>
    </div>
  );
}

export { LOW_DETAIL };
