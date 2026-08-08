"use client";

// The landing hero: one plasma body, turning slowly. Not anyone's sphere —
// a fixed, hand-picked point in the parameter space, so the front door looks
// the same every visit.

import { useMemo } from "react";
import PlasmaScene from "@/components/sphere/plasma/PlasmaScene";
import { sphereFromAxes } from "@/lib/sphere/generate";
import { neutralMotion } from "@/lib/sphere/motion";

const HERO_SEED = 0x1f2e3d4;

export default function HeroSphere() {
  const params = useMemo(
    () =>
      sphereFromAxes(
        // Lit from within, ordered, steady, unified: banded, glowing, calm.
        // Deliberately a quiet corner of the space — this sits behind the
        // landing copy and must not compete with it.
        { illumination: 0.6, edge: -0.5, volatility: -0.2, colorRelation: -0.55 },
        HERO_SEED,
        {
          ...neutralMotion(),
          globalSpeed: 0.18,
          speedVariance: 0.3,
          shearIndex: 0.25,
          turbulenceScale: 0.3,
          turbulenceAmplitude: 0.25,
          coherence: 0.8,
          accentIntensity: 0.25,
        },
      ),
    [],
  );

  return (
    <div className="fade-in-slow pointer-events-none absolute inset-0 opacity-30">
      <PlasmaScene params={params} animate={false} />
    </div>
  );
}
