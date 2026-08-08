import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // The plasma renderer runs a 60fps imperative loop: it holds WebGL
    // uniforms, band longitudes and an in-flight transition in a ref and
    // mutates them in place every frame. Routing that through React state
    // would re-render the tree sixty times a second, which is the thing
    // react-three-fiber exists to avoid. The React Compiler's immutability and
    // ref rules do not model that loop, so they are off for this directory
    // only — everywhere else in the app they still apply.
    files: ["components/sphere/plasma/**"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
    },
  },
]);

export default eslintConfig;
