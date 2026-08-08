// Ported from components/sphere/buildSculpture.ts — keep the two in sync.
// Deterministic sculpture geometry — a pure function of the baseline.
// Shared by the on-screen preview, the offscreen depth/control export, and the
// final render, so what you see and what conditions the artwork are one form.

import * as THREE from "three";
import { seedFromSignature, stableSignature } from "../hash.js";
import { gestureFromBaseline } from "../translation/gesture.js";
import { createSeededNoise, fbm } from "./seededNoise.js";
import { gestureTubeGeometry } from "./gestureCurve.js";

/** Map geometry descriptor keywords → displacement modifiers. */
function geometryModifiers(keywords) {
  let amplitude = 1;
  let frequency = 1;
  let detail = 0;
  for (const k of keywords) {
    if (k === "high-facet") detail += 1;
    if (k === "cracked" || k === "asymmetric") amplitude *= 1.35;
    if (k === "symmetric" || k === "rounded-facet") amplitude *= 0.75;
    if (k === "compact") frequency *= 1.4;
    if (k === "weathered") frequency *= 0.7;
    if (k === "elongated") frequency *= 0.8;
    if (k === "looping") frequency *= 1.2;
    if (k === "soft-boundary") amplitude *= 1.25;
    if (k === "irregular-spike") amplitude *= 1.3;
    if (k === "sharp-radial") frequency *= 1.3;
    if (k === "balanced-radial") amplitude *= 0.85;
  }
  return { amplitude, frequency, detail };
}

export function buildSculpture(baselinePath) {
  const laneId = baselinePath[0].id;
  const signature = stableSignature(baselinePath.map((n) => n.id));
  const seed = seedFromSignature(signature);
  const noise = createSeededNoise(seed);

  // Geometry descriptors come from the baseline lane + its modulators only —
  // the current state never touches geometry (form-stability invariant).
  const geometryWords = baselinePath.flatMap((n) => n.descriptors?.geometry ?? []);
  const mods = geometryModifiers(geometryWords);

  let geo;
  switch (laneId) {
    case "b_crystal": {
      // Low-poly icosahedron, flat faceting, small displacement.
      geo = new THREE.IcosahedronGeometry(1, 1 + mods.detail);
      displace(geo, (x, y, z) => 0.16 * mods.amplitude * fbm(noise, x * 1.1 * mods.frequency, y * 1.1 * mods.frequency, z * 1.1 * mods.frequency, 2));
      // IcosahedronGeometry is non-indexed → computeVertexNormals gives hard flat facets.
      geo.computeVertexNormals();
      break;
    }
    case "b_current": {
      // Smooth high-poly sphere with slow, low-frequency waves.
      geo = new THREE.SphereGeometry(1, 96, 96);
      displace(geo, (x, y, z) => 0.22 * mods.amplitude * fbm(noise, x * 1.4 * mods.frequency, y * 1.4 * mods.frequency, z * 1.4 * mods.frequency, 3));
      geo.computeVertexNormals();
      break;
    }
    case "b_stone": {
      // Heavy, blocky displacement — noise quantized into strata.
      geo = new THREE.IcosahedronGeometry(1, 3);
      displace(geo, (x, y, z) => {
        const n = fbm(noise, x * 1.6 * mods.frequency, y * 1.6 * mods.frequency, z * 1.6 * mods.frequency, 4);
        return 0.28 * mods.amplitude * (Math.round(n * 3) / 3); // stepped → hewn
      });
      geo.computeVertexNormals();
      break;
    }
    case "b_flame": {
      // Radial spikes — only outward, energy leaving the core.
      geo = new THREE.SphereGeometry(1, 96, 96);
      displace(geo, (x, y, z) => {
        const n = fbm(noise, x * 2.2 * mods.frequency, y * 2.2 * mods.frequency, z * 2.2 * mods.frequency, 4);
        return 0.55 * mods.amplitude * Math.pow(Math.max(0, n), 1.8);
      });
      geo.computeVertexNormals();
      break;
    }
    default: {
      geo = new THREE.SphereGeometry(1, 64, 64);
      geo.computeVertexNormals();
    }
  }

  const gesture = gestureFromBaseline(baselinePath, signature);
  const gestureGeometry = gestureTubeGeometry(gesture);

  return {
    bodyGeometry: geo,
    gestureGeometry,
    gesture,
    signature,
    seed,
    dispose() {
      geo.dispose();
      gestureGeometry.dispose();
    },
  };
}

/** Displace each vertex along its radial direction by f(position-on-unit-sphere). */
function displace(geo, f) {
  const pos = geo.getAttribute("position");
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const dir = v.clone().normalize();
    // Sample noise on the unit sphere so duplicated/seam vertices agree.
    const d = f(dir.x, dir.y, dir.z);
    v.addScaledVector(dir, d);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
}
