// Procedural studio environment.
//
// PBR materials need something to reflect or the metals read as flat black.
// A real HDRI would mean a network fetch, so the studio is painted into a
// small equirectangular canvas instead: a dark seamless void with one soft key
// blob and one rim blob, both in the state's own light colors.
//
// Entirely a function of the light rig → still the state lane, never the form.

import * as THREE from "three";

const W = 512;
const H = 256;

function hex(c) {
  return new THREE.Color(c);
}

/** Paint a soft radial blob at (azimuth, elevation) in equirect space. */
function blob(ctx, { azimuth, elevation }, color, intensity, spread) {
  // three's equirect convention: u = 0.5 - atan2 based; painting in the same
  // frame the lights use keeps highlights and reflections consistent.
  const u = (((azimuth + Math.PI) / (Math.PI * 2)) % 1) * W;
  const v = (0.5 - elevation / Math.PI) * H;
  const r = spread * W;
  const g = ctx.createRadialGradient(u, v, 0, u, v, r);
  const c = hex(color);
  const a = Math.min(1, intensity);
  g.addColorStop(0, `rgba(${c.r * 255 | 0}, ${c.g * 255 | 0}, ${c.b * 255 | 0}, ${a})`);
  g.addColorStop(1, `rgba(${c.r * 255 | 0}, ${c.g * 255 | 0}, ${c.b * 255 | 0}, 0)`);
  ctx.fillStyle = g;
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.arc(u, v, r, 0, Math.PI * 2);
  ctx.fill();
  // Wrap horizontally so a blob near the seam does not get clipped.
  if (u < r || u > W - r) {
    const u2 = u < r ? u + W : u - W;
    const g2 = ctx.createRadialGradient(u2, v, 0, u2, v, r);
    g2.addColorStop(0, `rgba(${c.r * 255 | 0}, ${c.g * 255 | 0}, ${c.b * 255 | 0}, ${a})`);
    g2.addColorStop(1, `rgba(${c.r * 255 | 0}, ${c.g * 255 | 0}, ${c.b * 255 | 0}, 0)`);
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(u2, v, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

/**
 * Build a PMREM environment texture for the given light rig.
 * Caller owns the result and must dispose() it.
 */
export function buildEnvironment(renderer, rig) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Void gradient: a faint floor pool under a near-black sky.
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  const outer = hex(rig.ground.outer);
  const inner = hex(rig.ground.inner);
  grad.addColorStop(0, `#${outer.getHexString()}`);
  grad.addColorStop(0.55, `#${inner.getHexString()}`);
  grad.addColorStop(1, `#${outer.getHexString()}`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  blob(ctx, rig.key, rig.key.color, Math.min(1, rig.key.intensity * 0.34), 0.18);
  blob(ctx, rig.rim, rig.rim.color, Math.min(1, rig.rim.intensity * 0.32), 0.24);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromEquirectangular(texture).texture;

  pmrem.dispose();
  texture.dispose();
  return envMap;
}

/**
 * The visible void behind the form: a faint pool of light fading to near-black.
 * Rendered as the scene background (rather than painted underneath afterwards)
 * so fog and refraction have something real to sit against.
 */
export function buildBackdrop(rig, size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const inner = hex(rig.ground.inner);
  const outer = hex(rig.ground.outer);
  const grad = ctx.createRadialGradient(size * 0.5, size * 0.46, size * 0.04, size * 0.5, size * 0.5, size * 0.74);
  grad.addColorStop(0, `#${inner.getHexString()}`);
  grad.addColorStop(1, `#${outer.getHexString()}`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
