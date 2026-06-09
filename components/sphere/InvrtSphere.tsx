"use client";

// On-screen preview of the deterministic sculpture. This is a control signal
// with a tasteful skin — deliberately restrained, not the final art.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { TreeNode } from "@/lib/types";
import { buildSculpture } from "./buildSculpture";

interface Props {
  baselinePath: TreeNode[];
  /** Radians/second of slow idle rotation. Preview only — never in the export. */
  spinSpeed?: number;
  /** 0 → 1 emergence: scales and fades the form in. */
  emergence?: number;
}

export default function InvrtSphere({ baselinePath, spinSpeed = 0.12, emergence = 1 }: Props) {
  const group = useRef<THREE.Group>(null);

  const sculpture = useMemo(() => buildSculpture(baselinePath), [baselinePath]);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += spinSpeed * delta;
  });

  const scale = 0.4 + 0.6 * emergence;

  return (
    <group ref={group} scale={scale}>
      <mesh geometry={sculpture.bodyGeometry}>
        <meshPhysicalMaterial
          color="#16161c"
          metalness={0.55}
          roughness={0.32}
          clearcoat={0.6}
          clearcoatRoughness={0.4}
          transparent
          opacity={Math.min(1, 0.25 + emergence)}
        />
      </mesh>
      <mesh geometry={sculpture.gestureGeometry}>
        <meshStandardMaterial
          color="#3a3a46"
          emissive="#9a9aae"
          emissiveIntensity={0.35 * emergence}
          metalness={0.3}
          roughness={0.5}
          transparent
          opacity={Math.min(1, emergence * 1.2)}
        />
      </mesh>
    </group>
  );
}
