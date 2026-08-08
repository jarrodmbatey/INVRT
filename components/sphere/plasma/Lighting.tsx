"use client";

// Scene lights.
//
// The body computes its own shading from the same key-light values (see
// keyLightFor) because it has to — everything about it is one custom shader in
// one draw call. These lights exist so anything standard added to the scene
// later is lit consistently with it, and so the scene graph states the lighting
// intent in one readable place.

import { keyLightFor } from "./uniforms";
import type { StructureParams } from "@/lib/sphere/types";

export default function Lighting({ structure }: { structure: StructureParams }) {
  const key = keyLightFor(structure);
  const [x, y, z] = [key.direction.x, key.direction.y, key.direction.z];

  return (
    <>
      <ambientLight intensity={key.ambient} />
      <directionalLight
        position={[x * 4, y * 4, z * 4]}
        intensity={key.intensity}
        color={key.color}
      />
      {/* Cool fill, so the unlit side is a shadow rather than a hole. */}
      <directionalLight position={[-3, -1.2, -2]} intensity={0.25} color="#5a6478" />
    </>
  );
}
