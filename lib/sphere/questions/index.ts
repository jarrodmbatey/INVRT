// Versioned mapping registry (§7).
//
// A saved result stores the mapping version it was generated under. Old
// versions stay registered here forever, unchanged, so a sphere someone
// generated last year still renders exactly as it did — regenerating and
// comparing is something people actually do, and a silent drift would be
// indistinguishable from us having lied to them.

import { MAPPING_VERSION } from "../constants";
import type { QuestionMapping } from "../types";
import { MAPPING_V1 } from "./v1";

const REGISTRY: Record<string, QuestionMapping[]> = {
  v1: MAPPING_V1,
};

export function getMapping(version: string = MAPPING_VERSION): QuestionMapping[] {
  const table = REGISTRY[version];
  if (!table) {
    throw new Error(
      `Unknown mapping version "${version}". Known: ${Object.keys(REGISTRY).join(", ")}`,
    );
  }
  return table;
}

export function knownMappingVersions(): string[] {
  return Object.keys(REGISTRY);
}

/** Questions in display order for a layer. */
export function questionsForLayer(layer: 1 | 2, version?: string): QuestionMapping[] {
  return getMapping(version).filter((q) => q.layer === layer);
}

export { MAPPING_V1 };
