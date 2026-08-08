// Deterministic hashing + seeded PRNG.
// Same input → same output, on server and client, forever.
//
// Ported verbatim from lib/hash.ts — the numbers must match the Next.js app.

/** FNV-1a 32-bit hash of a string. */
export function fnv1a(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Stable hex signature for an ordered list of node ids. */
export function stableSignature(ids) {
  const joined = ids.join(">");
  // Two passes with different salts → 64 bits of signature, enough to avoid collisions here.
  const a = fnv1a(joined).toString(16).padStart(8, "0");
  const b = fnv1a("invrt::" + joined).toString(16).padStart(8, "0");
  return a + b;
}

/** Positive 31-bit integer seed from a signature string. */
export function seedFromSignature(signature) {
  return fnv1a(signature) & 0x7fffffff;
}

/** Mulberry32 — small, fast, deterministic PRNG. Returns a function yielding [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
