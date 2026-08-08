// Ported from lib/translation/trees.ts — keep the two in sync.
// Tree traversal helpers shared by the word-tree UI and the generation flow.

import { baselineTree } from "./baselineTree.js";
import { stateTree } from "./stateTree.js";

/**
 * Resolve an ordered list of node ids (root-child → leaf) into actual nodes,
 * walking the tree level by level. Throws if any id is not a child of the
 * previous node — this validates anything that came back out of storage.
 */
export function resolvePath(tree, ids) {
  const path = [];
  let current = tree;
  for (const id of ids) {
    const next = current.children?.find((c) => c.id === id);
    if (!next) {
      throw new Error(`Invalid path: "${id}" is not a child of "${current.id}"`);
    }
    path.push(next);
    current = next;
  }
  if (path.length === 0) throw new Error("Empty path");
  return path;
}

export function resolveBaselinePath(ids) {
  return resolvePath(baselineTree, ids);
}

export function resolveStatePath(ids) {
  return resolvePath(stateTree, ids);
}

/** Human-readable label, e.g. "Crystal · Fractured · Privately". */
export function pathLabel(path) {
  return path.map((n) => n.label).join(" · ");
}

/** The index of each chosen node among its siblings, level by level. */
export function pathIndices(tree, path) {
  const indices = [];
  let current = tree;
  for (const node of path) {
    const idx = current.children?.findIndex((c) => c.id === node.id) ?? -1;
    indices.push(Math.max(0, idx));
    current = node;
  }
  return indices;
}
