// Ported from components/sphere/InvrtSphere.tsx + the two <Canvas> setups in
// components/ui/HeroSphere.tsx and app/forming/page.tsx.
//
// react-three-fiber's declarative <Canvas> is replaced by a plain three.js
// scene and requestAnimationFrame loop — same camera, lights, materials and
// spin, no React.
//
// This is a control signal with a tasteful skin — deliberately restrained,
// not the final art.

import * as THREE from "three";
import { buildSculpture } from "./buildSculpture.js";

/**
 * Mount a slowly rotating preview of the baseline's sculpture into `container`.
 * Returns a handle: setEmergence(0→1) fades and scales the form in; dispose()
 * releases the GL context (call it on every route change).
 */
export function mountSpherePreview(
  container,
  { baselinePath, spinSpeed = 0.12, emergence = 1, alpha = true, fit = 0.55 } = {},
) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, alpha ? 0 : 1);
  renderer.domElement.classList.add("gl-canvas");
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  // fov: 35, as in both <Canvas> setups. The R3F version pins the camera at
  // z = 3.4, which crops the form on wide or short viewports; here the distance
  // is solved from the sculpture so it stays whole at any window shape.
  const FOV = 35;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, 3.4);

  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  const key = new THREE.DirectionalLight(0xcfc8ba, 1.15);
  key.position.set(2, 3, 2);
  const fill = new THREE.DirectionalLight(0x5a6478, 0.33);
  fill.position.set(-3, -1, -2);
  scene.add(key, fill);

  const sculpture = buildSculpture(baselinePath);

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x16161c,
    metalness: 0.55,
    roughness: 0.32,
    clearcoat: 0.6,
    clearcoatRoughness: 0.4,
    transparent: true,
    opacity: 1,
  });
  const gestureMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3a46,
    emissive: 0x9a9aae,
    emissiveIntensity: 0.35,
    metalness: 0.3,
    roughness: 0.5,
    transparent: true,
    opacity: 1,
  });

  const group = new THREE.Group();
  group.add(new THREE.Mesh(sculpture.bodyGeometry, bodyMaterial));
  group.add(new THREE.Mesh(sculpture.gestureGeometry, gestureMaterial));
  scene.add(group);

  let current = emergence;
  applyEmergence(current);

  function applyEmergence(e) {
    current = e;
    const scale = 0.4 + 0.6 * e;
    group.scale.setScalar(scale);
    bodyMaterial.opacity = Math.min(1, 0.25 + e);
    gestureMaterial.opacity = Math.min(1, e * 1.2);
    gestureMaterial.emissiveIntensity = 0.35 * e;
  }

  const radius = sculptureRadius(sculpture);

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // On a portrait container the horizontal field is the tighter one.
    const halfExtent = Math.tan((FOV * Math.PI) / 360) * Math.min(1, camera.aspect);
    camera.position.z = radius / (fit * halfExtent);
    camera.updateProjectionMatrix();
  }
  resize();

  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  observer?.observe(container);
  window.addEventListener("resize", resize);

  let raf = 0;
  let last = performance.now();
  let disposed = false;

  function tick(now) {
    if (disposed) return;
    const delta = Math.min((now - last) / 1000, 0.1);
    last = now;
    group.rotation.y += spinSpeed * delta;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    setEmergence: applyEmergence,
    get emergence() {
      return current;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      bodyMaterial.dispose();
      gestureMaterial.dispose();
      sculpture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/** Widest extent of the sculpture from the origin, for framing. */
function sculptureRadius(sculpture) {
  let maxSq = 0;
  for (const geometry of [sculpture.bodyGeometry, sculpture.gestureGeometry]) {
    const pos = geometry.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const d = pos.getX(i) ** 2 + pos.getY(i) ** 2 + pos.getZ(i) ** 2;
      if (d > maxSq) maxSq = d;
    }
  }
  return Math.sqrt(maxSq) || 1;
}
