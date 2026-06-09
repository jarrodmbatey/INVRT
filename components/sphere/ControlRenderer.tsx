"use client";

// Offscreen depth/control-map export for the image model.
//
// Renders the deterministic sculpture with an override depth ShaderMaterial:
// linearized view-space depth as grayscale on black, 1024×1024.
// Convention: NEAR = BRIGHT (MiDaS-style), which Flux Depth expects;
// pass invert=true if a future model wants the opposite.
//
// Byte-determinism note: fixed camera, fixed mesh transform, fixed seed →
// the same baseline always produces the same control image on a given GPU.

import * as THREE from "three";
import type { TreeNode } from "@/lib/types";
import { buildSculpture } from "./buildSculpture";

const SIZE = 1024;

// Camera at z=3.2 looking at origin; sculpture radius ≲ 1.6.
// Depth is linearized across this band to maximize grayscale contrast.
const NEAR_DIST = 1.6;
const FAR_DIST = 4.8;

const depthMaterial = (invert: boolean) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uNear: { value: NEAR_DIST },
      uFar: { value: FAR_DIST },
      uInvert: { value: invert ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
      varying float vViewDist;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewDist = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uNear;
      uniform float uFar;
      uniform float uInvert;
      varying float vViewDist;
      void main() {
        float d = clamp((uFar - vViewDist) / (uFar - uNear), 0.0, 1.0); // near = bright
        d = mix(d, 1.0 - d, uInvert);
        gl_FragColor = vec4(vec3(d), 1.0);
      }
    `,
  });

/**
 * Render the baseline's control map and return it as a PNG data URI.
 * Pure function of the baseline path — current state never touches this.
 */
export function renderControlMap(baselinePath: TreeNode[], invert = false): string {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(SIZE, SIZE, false);
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10);
  camera.position.set(0, 0, 3.2);
  camera.lookAt(0, 0, 0);

  const sculpture = buildSculpture(baselinePath);
  const material = depthMaterial(invert);
  const body = new THREE.Mesh(sculpture.bodyGeometry, material);
  const gestureMesh = new THREE.Mesh(sculpture.gestureGeometry, material);
  scene.add(body, gestureMesh);

  renderer.render(scene, camera);
  const dataUri = canvas.toDataURL("image/png");

  material.dispose();
  sculpture.dispose();
  renderer.dispose();

  return dataUri;
}
