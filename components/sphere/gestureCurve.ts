// Gesture → 3D curve. Turns the translation layer's control points into a
// CatmullRom curve + tube geometry that threads the sculpture.

import * as THREE from "three";
import type { Gesture } from "@/lib/types";

export function gestureCurve(gesture: Gesture): THREE.CatmullRomCurve3 {
  const points = gesture.controlPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  // Centripetal parameterization avoids loops/overshoot at sharp fracture angles.
  return new THREE.CatmullRomCurve3(points, false, "centripetal");
}

export function gestureTubeGeometry(gesture: Gesture): THREE.TubeGeometry {
  const curve = gestureCurve(gesture);
  // Fractures read as thin incisions; ribbons and threads slightly fuller.
  const radius = gesture.family === "fracture" ? 0.022 : 0.034;
  return new THREE.TubeGeometry(curve, 96, radius, 10, false);
}
