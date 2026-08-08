// LOCAL RENDER — the browser build's image provider.
//
// The Next.js app posts the depth map + prompt to Replicate (Flux Depth) from a
// server route. A static HTML build has no server and must never hold an API
// key, so the artwork is rendered here instead: the same deterministic
// sculpture, lit by the same state lane that writes the prompt's weather
// sentence, photographed once at 1024².
//
// The form-stability invariant survives intact and is checked in the browser
// (see js/render/providers.js):
//   geometry, material, framing ← baseline only
//   light, palette, fog, grade  ← state only

import * as THREE from "three";
import { buildSculpture } from "../sphere/buildSculpture.js";
import { bodyMaterialForBaseline, framingForBaseline } from "./materials.js";
import { lightPosition, lightRigForState } from "./lighting.js";
import { buildBackdrop, buildEnvironment } from "./environment.js";
import { mulberry32 } from "../hash.js";

const SIZE = 1024;

/**
 * Render the artwork for one baseline × state pairing.
 * Returns a canvas; the caller turns it into a blob or a data URI.
 */
export function renderArtworkCanvas(baselinePath, statePathIds, seed, size = SIZE) {
  const rig = lightRigForState(statePathIds);
  const framing = framingForBaseline(baselinePath);

  const gl = document.createElement("canvas");
  gl.width = size;
  gl.height = size;
  const renderer = new THREE.WebGLRenderer({
    canvas: gl,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = rig.exposure;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(new THREE.Color(rig.fog.color), rig.fog.density);

  const envMap = buildEnvironment(renderer, rig);
  scene.environment = envMap;
  const backdrop = buildBackdrop(rig);
  scene.background = backdrop;

  const sculpture = buildSculpture(baselinePath);
  const bodyMaterial = bodyMaterialForBaseline(baselinePath);
  const gestureMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b1b21,
    emissive: new THREE.Color(rig.accent),
    // Lit thread, not neon tube — most of its presence comes from the key light.
    emissiveIntensity: 0.22 + rig.bloom * 0.5,
    metalness: 0.75,
    roughness: 0.25,
  });

  const group = new THREE.Group();
  group.add(new THREE.Mesh(sculpture.bodyGeometry, bodyMaterial));
  group.add(new THREE.Mesh(sculpture.gestureGeometry, gestureMaterial));
  scene.add(group);

  // Same 35mm-ish lens as the control map; the distance is solved from the
  // form's own extent so every archetype is held the way its baseline's
  // level-3 "hold" asks for.
  const FOV = 35;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  const radius = framingRadius(sculpture);
  const distance = radius / (framing.fill * Math.tan((FOV * Math.PI) / 360));
  camera.position.set(framing.offsetX * radius, framing.offsetY * radius, distance);
  camera.lookAt(0, 0, 0);

  const key = new THREE.DirectionalLight(rig.key.color, rig.key.intensity * framing.keyIntensityMul);
  key.position.set(...lightPosition(rig.key, distance));
  const rim = new THREE.DirectionalLight(rig.rim.color, rig.rim.intensity);
  rim.position.set(...lightPosition(rig.rim, distance));
  const fill = new THREE.HemisphereLight(rig.fill.color, rig.ground.outer, rig.fill.intensity);
  scene.add(key, rim, fill);

  // Fog is calibrated in frame-widths, not world units, so "heavy cool fog"
  // reads the same whether the form is held close or at arm's length.
  scene.fog.density = rig.fog.density / Math.max(0.001, radius);

  renderer.render(scene, camera);

  const out = composite(gl, rig, seed, size);

  bodyMaterial.dispose();
  gestureMaterial.dispose();
  sculpture.dispose();
  envMap.dispose();
  backdrop.dispose();
  renderer.dispose();
  renderer.forceContextLoss();

  return out;
}

/**
 * The radius the frame is built around. Measured exactly (bounding spheres are
 * loose enough on the gesture tube to push the camera into the next county).
 *
 * The body is framed in full; the gesture is allowed to run most of the way to
 * the edge, since a stroke that leaves the frame reads as a stroke, while
 * framing for its farthest tip would shrink the sculpture to a pebble.
 */
function framingRadius(sculpture) {
  const body = maxRadius(sculpture.bodyGeometry);
  const gesture = maxRadius(sculpture.gestureGeometry);
  return Math.max(body * 1.04, gesture * 0.86) || 1;
}

function maxRadius(geometry) {
  const pos = geometry.getAttribute("position");
  let maxSq = 0;
  for (let i = 0; i < pos.count; i++) {
    const d = pos.getX(i) ** 2 + pos.getY(i) ** 2 + pos.getZ(i) ** 2;
    if (d > maxSq) maxSq = d;
  }
  return Math.sqrt(maxSq);
}

/**
 * The photographic pass: void backdrop, bloom, grade, vignette, film grain.
 * Deterministic — the grain is drawn from the baseline seed.
 */
function composite(glCanvas, rig, seed, size) {
  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const ctx = out.getContext("2d");

  // 1. The rendered frame — void, form and gesture together.
  ctx.drawImage(glCanvas, 0, 0);

  // 2. Bloom — bright-pass, blurred, added back.
  if (rig.bloom > 0.01) {
    const tmp = document.createElement("canvas");
    tmp.width = size;
    tmp.height = size;
    const tctx = tmp.getContext("2d");
    tctx.filter = `brightness(1.5) contrast(2.6) blur(${Math.round(size * 0.016)}px)`;
    tctx.drawImage(out, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(0.85, rig.bloom);
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
  }

  // 3. Grade — the mood's saturation and contrast.
  if (Math.abs(rig.saturation - 1) > 0.01 || Math.abs(rig.contrast - 1) > 0.01) {
    const tmp = document.createElement("canvas");
    tmp.width = size;
    tmp.height = size;
    tmp.getContext("2d").drawImage(out, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.filter = `saturate(${rig.saturation}) contrast(${rig.contrast})`;
    ctx.drawImage(tmp, 0, 0);
    ctx.filter = "none";
  }

  // 4. Vignette — how much dark surrounds the form.
  const vig = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.28, size * 0.5, size * 0.5, size * 0.78);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, `rgba(0,0,0,${rig.vignette})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, size, size);

  // 5. Film grain — fine tactile detail, seeded so the piece is reproducible.
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.055;
  ctx.drawImage(grainCanvas(seed, size), 0, 0);
  ctx.restore();

  return out;
}

function grainCanvas(seed, size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(size, size);
  const rand = mulberry32(seed >>> 0);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = 100 + rand() * 56;
    data[i] = data[i + 1] = data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
