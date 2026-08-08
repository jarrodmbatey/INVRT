// Ported from components/sphere/seededNoise.ts — keep the two in sync.
// Deterministic 3D value noise with a seeded permutation table.
// Same seed + same position → same value, everywhere, forever.
// This is what makes the sculpture identical for the same baseline.

import { mulberry32 } from "../hash.js";

export function createSeededNoise(seed) {
  // Seeded permutation table.
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  // Hash a lattice point to a pseudo-random value in [-1, 1].
  const lattice = (xi, yi, zi) => {
    const h = perm[(perm[(perm[xi & 255] + yi) & 255] + zi) & 255];
    return h / 127.5 - 1;
  };

  const fade = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  return (x, y, z) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const xf = fade(x - xi);
    const yf = fade(y - yi);
    const zf = fade(z - zi);
    const c000 = lattice(xi, yi, zi);
    const c100 = lattice(xi + 1, yi, zi);
    const c010 = lattice(xi, yi + 1, zi);
    const c110 = lattice(xi + 1, yi + 1, zi);
    const c001 = lattice(xi, yi, zi + 1);
    const c101 = lattice(xi + 1, yi, zi + 1);
    const c011 = lattice(xi, yi + 1, zi + 1);
    const c111 = lattice(xi + 1, yi + 1, zi + 1);
    return lerp(
      lerp(lerp(c000, c100, xf), lerp(c010, c110, xf), yf),
      lerp(lerp(c001, c101, xf), lerp(c011, c111, xf), yf),
      zf,
    );
  };
}

/** Fractal Brownian motion over a seeded noise field. Output ≈ [-1, 1]. */
export function fbm(noise, x, y, z, octaves = 4) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise(x * frequency, y * frequency, z * frequency);
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value;
}
