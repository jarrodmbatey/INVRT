// The plasma shader. One draw call for the whole body — every band, every
// colour boundary and all the gas cycling happens here, per fragment.
//
// The locked MATERIAL constants are baked in as GLSL consts rather than passed
// as uniforms. They are not parameters and there must be no code path that can
// vary them at runtime; a `const` the compiler folds is the strongest available
// statement of that.

import { GEOMETRY_LIMITS, MATERIAL, MAX_ACCENTS, MAX_BANDS } from "@/lib/sphere/constants";
import { NOISE_CHUNK } from "./noise.glsl";

const DEFINES = /* glsl */ `
#define MAX_BANDS ${MAX_BANDS}
#define MAX_ACCENTS ${MAX_ACCENTS}
#define PI 3.141592653589793
#define TAU 6.283185307179586

// Locked material identity — never a parameter, never randomised.
const float MAT_ROUGHNESS = ${MATERIAL.roughness.toFixed(4)};
const float MAT_CLEARCOAT = ${MATERIAL.clearcoat.toFixed(4)};
const float MAT_CLEARCOAT_ROUGHNESS = ${MATERIAL.clearcoatRoughness.toFixed(4)};
const float MAT_METALNESS = ${MATERIAL.metalness.toFixed(4)};
const float MAT_ENV_INTENSITY = ${MATERIAL.envMapIntensity.toFixed(4)};

const float MAX_DISPLACEMENT = ${GEOMETRY_LIMITS.maxDisplacement.toFixed(5)};
const float MAX_INDENTATION = ${GEOMETRY_LIMITS.maxIndentation.toFixed(5)};
`;

// Shared by both stages: where on the body the action is concentrated.
const ACTIVITY_CHUNK = /* glsl */ `
uniform float uActivityMode;   // 0 poles, 1 equator, 2 hemisphere
uniform float uActivityFocusY;
uniform float uAsymmetry;

float activityMask(float y) {
  float m;
  if (uActivityMode < 0.5) {
    m = smoothstep(0.10, 0.95, abs(y));
  } else if (uActivityMode < 1.5) {
    m = 1.0 - smoothstep(0.05, 0.85, abs(y));
  } else {
    m = 1.0 - smoothstep(0.0, 1.15, abs(y - uActivityFocusY));
  }
  // Concentrated, never exclusive — the rest of the body still lives.
  return mix(0.35, 1.0, clamp(m, 0.0, 1.0));
}

float asymmetryMask(vec3 dir) {
  return mix(1.0, 0.45 + 0.55 * (0.5 + 0.5 * dir.x), uAsymmetry);
}
`;

export const plasmaVertexShader = /* glsl */ `
${DEFINES}
${NOISE_CHUNK}
${ACTIVITY_CHUNK}

uniform float uTime;
uniform float uSeed;
uniform float uBodyPhase;           // accumulated whole-body rotation, radians
uniform float uViscosity;
uniform float uProtrusionMode;      // 0 none, 1 constant, 2 intermittent
uniform float uProtrusionAmplitude; // 0…1, scaled by MAX_DISPLACEMENT below
uniform float uProtrusionLength;
uniform float uProtrusionFrequency;

varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vDisplacement;

void main() {
  vec3 dir = normalize(position);
  float disp = 0.0;

  if (uProtrusionMode > 0.5 && uProtrusionAmplitude > 0.001) {
    // Sample in the body's own frame, so protrusions and the asymmetric
    // activity lobe orbit with the planet rather than hanging in world space
    // while the colour rotates past underneath them.
    vec3 bodyDir = rotY(dir, -uBodyPhase);

    // Viscous bodies flow slowly; gaseous ones churn.
    float flowT = uTime * mix(0.42, 0.05, uViscosity);
    float freq = mix(4.4, 1.5, uProtrusionLength);
    vec3 flow = curlNoise(bodyDir * freq + vec3(uSeed, uSeed * 0.7, flowT));
    float raw = dot(flow, bodyDir);

    float pulse = 1.0;
    if (uProtrusionMode > 1.5) {
      // Intermittent: each region rises and subsides on its own offset phase,
      // so protrusions come and go rather than sitting there statically.
      float region = snoise(bodyDir * 2.0 + uSeed);
      float rate = mix(0.10, 1.05, uProtrusionFrequency);
      pulse = 0.5 + 0.5 * sin((uTime * rate + region) * TAU);
      pulse = pow(smoothstep(0.05, 0.95, pulse), mix(3.0, 1.0, uProtrusionLength));
    }

    float amp = uProtrusionAmplitude * activityMask(dir.y) * asymmetryMask(bodyDir) * pulse;
    disp = raw >= 0.0 ? raw * amp * MAX_DISPLACEMENT : raw * amp * MAX_INDENTATION;
    // Belt and braces: the caps hold no matter what reaches the uniforms.
    disp = clamp(disp, -MAX_INDENTATION, MAX_DISPLACEMENT);
  }

  vec3 displaced = position + dir * disp;

  vObjPos = displaced;
  vDisplacement = disp;

  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * dir);

  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const plasmaFragmentShader = /* glsl */ `
${DEFINES}
${NOISE_CHUNK}
${ACTIVITY_CHUNK}

uniform float uTime;
uniform float uSeed;
uniform float uBodyPhase;

// Band architecture
uniform float uBandCount;
uniform float uBandBoundary[MAX_BANDS];
uniform float uBandEdgeWidth[MAX_BANDS];
uniform float uBandPhase[MAX_BANDS];
uniform float uBandAccent[MAX_BANDS];

// Colour
uniform vec3 uBaseColor;
uniform vec3 uAccentColor[MAX_ACCENTS];
uniform float uColorSeparation;
uniform float uAccentIntensity;

// Substance
uniform float uLightSource;
uniform float uDepth;

// Weather
uniform float uTurbulenceScale;
uniform float uTurbulenceAmplitude;
uniform float uCoherence;

// Lighting (external key, dimmed as the internal source rises)
uniform vec3 uKeyLightDir;
uniform vec3 uKeyLightColor;
uniform float uKeyLightIntensity;
uniform float uAmbient;

varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vDisplacement;

// ── Bands ────────────────────────────────────────────────────────
//
// A continuous band coordinate: the sum of a smoothstep across every interior
// boundary. It plateaus inside a band and ramps across the boundary, so
// floor() gives the band index and fract() gives the position in the blend.
// Widening the ramp toward half a band is what "indistinct edges" means.
float bandCoord(float y) {
  float c = 0.0;
  for (int i = 0; i < MAX_BANDS; i++) {
    if (float(i) >= uBandCount - 1.0) break;
    float b = uBandBoundary[i];
    float w = max(uBandEdgeWidth[i], 0.0015);
    c += smoothstep(b - w, b + w, y);
  }
  return c;
}

// Colour boundary hardness is separate from geometric edge width: near 1 the
// two band colours meet in a step, near 0 they cross-fade over the whole blend.
float colorMixCurve(float f, float sep) {
  float w = mix(0.5, 0.02, sep);
  return smoothstep(0.5 - w, 0.5 + w, f);
}

vec3 bandColor(float accentIndex) {
  vec3 c = uBaseColor;
  for (int k = 0; k < MAX_ACCENTS; k++) {
    c = mix(c, uAccentColor[k], step(abs(float(k) - accentIndex), 0.5));
  }
  return c;
}

// The cycling gas. The fourth noise dimension advances at 1 - coherence: high
// coherence advects the field without reorganising it, low coherence churns.
float plasmaField(vec3 p, float phase, float scale) {
  vec3 q = rotY(p, phase);
  // Weighted toward the first octave: a few large eddies you can actually see
  // turning, with finer detail riding on them. Two octaves of equal weight just
  // reads as mottling from any normal viewing distance.
  float freq = mix(1.2, 5.2, uTurbulenceScale) * scale;
  float w = uTime * mix(0.6, 0.02, uCoherence) + uSeed;
  float n = snoise(vec4(q * freq, w));
  n += 0.38 * snoise(vec4(q * freq * 2.4 + 7.3, w * 1.7 + 3.1));
  return n / 1.38;
}

// ── Lighting ─────────────────────────────────────────────────────

float distributionGGX(float ndh, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float d = ndh * ndh * (a2 - 1.0) + 1.0;
  return a2 / max(PI * d * d, 1e-6);
}

float geometrySmith(float ndv, float ndl, float roughness) {
  float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
  float gv = ndv / (ndv * (1.0 - k) + k);
  float gl = ndl / (ndl * (1.0 - k) + k);
  return gv * gl;
}

float fresnelSchlick(float cosTheta, float f0) {
  float m = clamp(1.0 - cosTheta, 0.0, 1.0);
  return f0 + (1.0 - f0) * m * m * m * m * m;
}

// Height-derivative bump. The vertex stage already clamped displacement to a
// few percent of the radius, so recomputing exact normals there would cost more
// than it is worth — the screen-space gradient reads identically.
vec3 perturbedNormal() {
  vec3 n = normalize(vWorldNormal);
  vec3 dpdx = dFdx(vWorldPos);
  vec3 dpdy = dFdy(vWorldPos);
  float dhdx = dFdx(vDisplacement);
  float dhdy = dFdy(vDisplacement);
  vec3 r1 = cross(dpdy, n);
  vec3 r2 = cross(n, dpdx);
  float det = dot(dpdx, r1);
  if (abs(det) < 1e-8) return n;
  vec3 grad = (r1 * dhdx + r2 * dhdy) / det;
  // Gentle: the height field is piecewise-linear across a triangle, so a large
  // bump scale turns a low-poly sphere into visible facets rather than into
  // relief. Displacement is capped at 6% of the radius; it does not need help.
  return normalize(n - grad * 2.2);
}

void main() {
  // Band boundaries follow the flow rather than sitting on exact circles of
  // latitude. Without this the bands are painted stripes; with it they read as
  // fluid that happens to be organised in bands.
  vec3 bodyPos = rotY(vObjPos, -uBodyPhase);
  float warp =
    snoise(bodyPos * mix(1.5, 4.5, uTurbulenceScale) + uSeed) * uTurbulenceAmplitude * 0.07;
  float y = clamp(vObjPos.y + warp, -1.0, 1.0);

  float bc = bandCoord(y);
  float loI = floor(bc);
  float hiI = min(loI + 1.0, uBandCount - 1.0);
  float frac = clamp(bc - loI, 0.0, 1.0);

  // Constant-index reads, masked — portable and cheap for 12 iterations.
  float phaseA = 0.0;
  float phaseB = 0.0;
  float accentA = -1.0;
  float accentB = -1.0;
  for (int i = 0; i < MAX_BANDS; i++) {
    float fi = float(i);
    float mA = step(abs(fi - loI), 0.5);
    float mB = step(abs(fi - hiI), 0.5);
    phaseA += mA * uBandPhase[i];
    phaseB += mB * uBandPhase[i];
    accentA += mA * (uBandAccent[i] + 1.0);
    accentB += mB * (uBandAccent[i] + 1.0);
  }

  float t = colorMixCurve(frac, uColorSeparation);

  // Two samples, one per contributing band, each at its own accumulated
  // longitude. This is what makes bands appear to rotate independently on a
  // single mesh — and what makes a shear boundary visible where they meet.
  float nA = plasmaField(vObjPos, phaseA, 1.0);
  float nB = plasmaField(vObjPos, phaseB, 1.0);
  float n = mix(nA, nB, t);

  vec3 albedo = mix(bandColor(accentA), bandColor(accentB), t);

  // Even a laminar body has light and dark in it — a floor of 0.3 keeps the
  // surface from flattening into paint when turbulence is near zero.
  float turb = n * mix(0.3, 1.0, uTurbulenceAmplitude);
  albedo *= 0.72 + 0.56 * (0.5 + 0.5 * turb);

  // Filaments of each band intrude into its neighbour where the field runs
  // high. Scaled by (1 - colorSeparation): a blended body marbles, a rigidly
  // separated one keeps its boundaries and lets the flare do the work.
  vec3 neighbour = bandColor(accentB == accentA ? accentA + 1.0 : accentB);
  float bleed = clamp(0.5 + 0.6 * n, 0.0, 1.0) * (1.0 - uColorSeparation) * 0.45;
  albedo = mix(albedo, neighbour, bleed);

  float flare = smoothstep(0.25, 0.95, n) * uAccentIntensity;
  albedo = mix(albedo, albedo * 1.5 + 0.02, flare * 0.5);
  albedo *= mix(0.75, 1.05, uAccentIntensity);

  vec3 N = perturbedNormal();
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uKeyLightDir);
  vec3 H = normalize(L + V);

  float ndv = max(dot(N, V), 1e-4);
  float ndl = max(dot(N, L), 0.0);
  float ndh = max(dot(N, H), 0.0);
  float vdh = max(dot(V, H), 0.0);

  // Wrapped diffuse widened by depth — light carries further into a body you
  // can see into than one that is an opaque surface.
  float wrap = mix(0.05, 0.6, uDepth);
  float diffuse = clamp((dot(N, L) + wrap) / (1.0 + wrap), 0.0, 1.0);

  // Constant sheen. Both lobes read MATERIAL only.
  float f0 = mix(0.04, 1.0, MAT_METALNESS);
  float spec = distributionGGX(ndh, MAT_ROUGHNESS)
             * geometrySmith(ndv, ndl, MAT_ROUGHNESS)
             * fresnelSchlick(vdh, f0)
             / max(4.0 * ndv * max(ndl, 1e-4), 1e-4)
             * ndl;
  float coat = distributionGGX(ndh, MAT_CLEARCOAT_ROUGHNESS)
             * geometrySmith(ndv, ndl, MAT_CLEARCOAT_ROUGHNESS)
             * fresnelSchlick(vdh, 0.04)
             / max(4.0 * ndv * max(ndl, 1e-4), 1e-4)
             * ndl * MAT_CLEARCOAT;

  // Cheap studio environment: a cool sky over a warm floor, at the locked
  // envMapIntensity. Keeps the object reading as a physical body in a room.
  vec3 env = mix(vec3(0.16, 0.17, 0.21), vec3(0.44, 0.46, 0.55), 0.5 + 0.5 * N.y);
  env *= MAT_ENV_INTENSITY;

  // Internal glow: the fresnel term inverted, so it is brightest facing the
  // viewer — light coming from inside the body rather than off its skin.
  float facing = ndv;
  float inner = pow(facing, 1.6) * uLightSource;
  vec3 glow = albedo * inner * (0.55 + 0.75 * (0.5 + 0.5 * n));

  // Subsurface approximation: the field sampled further in, so you read
  // structure below the surface instead of a painted shell.
  float deep = plasmaField(vObjPos * 0.62, mix(phaseA, phaseB, t) * 0.7, 0.8);
  vec3 sub = albedo * (0.45 + 0.55 * (0.5 + 0.5 * deep)) * uDepth * 0.55;

  float rim = pow(1.0 - facing, 3.0);

  vec3 color =
      albedo * (uAmbient + env * 0.35 + diffuse * uKeyLightIntensity * uKeyLightColor)
    + sub
    + glow
    + (spec + coat) * uKeyLightColor * uKeyLightIntensity
    + rim * albedo * mix(0.12, 0.55, uLightSource);

  gl_FragColor = vec4(max(color, 0.0), 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const haloVertexShader = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vCenter;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const haloFragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
uniform float uFalloff;
uniform float uInnerRadius;
uniform float uOuterRadius;

varying vec3 vWorldPos;
varying vec3 vCenter;

void main() {
  // Brightness is a function of how far this pixel's ray passes from the body,
  // not of the shell's own curvature. A plain fresnel term peaks at the shell's
  // silhouette, which draws a hard-edged disc around the planet; this fades to
  // nothing exactly where the shell ends.
  vec3 V = normalize(cameraPosition - vWorldPos);
  float impact = length(cross(vWorldPos - vCenter, V));
  float t = clamp(
    (impact - uInnerRadius) / max(uOuterRadius - uInnerRadius, 1e-4),
    0.0,
    1.0
  );
  float a = pow(1.0 - t, uFalloff) * uStrength;
  gl_FragColor = vec4(uColor * a, a);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
