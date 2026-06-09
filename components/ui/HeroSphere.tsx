"use client";

// Faint, slowly rotating form behind the landing hero. Pure atmosphere.

import { useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import InvrtSphere from "@/components/sphere/InvrtSphere";
import { baselineTree } from "@/lib/translation/baselineTree";

const noopSubscribe = () => () => {};

export default function HeroSphere() {
  // Canvas requires the DOM — render only after hydration.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return null;

  const current = baselineTree.children!.find((n) => n.id === "b_current")!;

  return (
    <div className="fade-in-slow pointer-events-none absolute inset-0 opacity-30">
      <Canvas camera={{ position: [0, 0, 3.4], fov: 35 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.25} />
        <directionalLight position={[2, 3, 2]} intensity={1.1} color="#cfc8ba" />
        <directionalLight position={[-3, -1, -2]} intensity={0.3} color="#5a6478" />
        <InvrtSphere baselinePath={[current]} spinSpeed={0.07} />
      </Canvas>
    </div>
  );
}
