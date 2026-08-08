"use client";

// The 16 type codes at neutral motion, side by side.
//
// This is acceptance criterion 1 made into a page you can actually look at: if
// any two of these are hard to tell apart, the axis→structure mapping in §4.1
// is too weak and needs widening, not a tweak to the shader.
//
// One Canvas, sixteen rigs — sixteen separate <Canvas> elements would blow past
// the browser's WebGL context limit.

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import HaloShell from "@/components/sphere/plasma/HaloShell";
import PlasmaSphere from "@/components/sphere/plasma/PlasmaSphere";
import SphereRig from "@/components/sphere/plasma/SphereRig";
import { LOW_DETAIL } from "@/lib/sphere/constants";
import { allTypeCodes, axesForTypeCode } from "@/lib/sphere/axes";
import { sphereFromAxes } from "@/lib/sphere/generate";
import { fnv1a } from "@/lib/hash";
import type { SphereParams } from "@/lib/sphere/types";

const COLUMNS = 4;
const SPACING = 2.5;

function GridItem({ params, position }: { params: SphereParams; position: [number, number, number] }) {
  return (
    <group position={position}>
      <SphereRig axialTilt={params.structure.axialTilt}>
        <PlasmaSphere
          structure={params.structure}
          motion={params.motion}
          detail={LOW_DETAIL}
          animate={false}
        />
        <HaloShell structure={params.structure} />
      </SphereRig>
    </group>
  );
}

export default function TypeGridPage() {
  const types = useMemo(
    () =>
      allTypeCodes().map((code) => ({
        code,
        // A fixed per-code seed: the same sibling of each family every time, so
        // a visual diff between two runs means the mapping moved, not the seed.
        params: sphereFromAxes(axesForTypeCode(code, 0.85), fnv1a(`type::${code}`) & 0x7fffffff),
      })),
    [],
  );

  return (
    <div className="min-h-dvh px-6 py-16">
      <p className="text-xs tracking-[0.3em] text-(--color-ink-faint) uppercase">
        Sixteen types · neutral motion
      </p>

      <div className="relative mt-8 h-[70vh] w-full">
        <Canvas
          camera={{ position: [0, 0, 15.5], fov: 35 }}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 0.95;
          }}
        >
          {/* No scene lights: each body shades itself from its own structure,
              which is the only way sixteen different key-light strengths can
              coexist in one Canvas. */}
          {types.map((t, i) => (
            <GridItem
              key={t.code}
              params={t.params}
              position={[
                ((i % COLUMNS) - (COLUMNS - 1) / 2) * SPACING,
                ((COLUMNS - 1) / 2 - Math.floor(i / COLUMNS)) * SPACING,
                0,
              ]}
            />
          ))}
        </Canvas>
      </div>

      <div className="mx-auto mt-8 grid max-w-3xl grid-cols-4 gap-2 text-center">
        {types.map((t) => (
          <span key={t.code} className="text-xs tracking-[0.25em] text-(--color-ink-dim)">
            {t.code}
          </span>
        ))}
      </div>
    </div>
  );
}
