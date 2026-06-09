// Tree traversal helpers shared by client (word-tree UI) and server (validation).

import type { TreeNode } from "../types";
import { baselineTree } from "./baselineTree";
import { stateTree } from "./stateTree";

/**
 * Resolve an ordered list of node ids (root-child → leaf) into actual nodes,
 * walking the tree level by level. Throws if any id is not a child of the
 * previous node — this is the server-side validation of client input.
 */
export function resolvePath(tree: TreeNode, ids: string[]): TreeNode[] {
  const path: TreeNode[] = [];
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

export function resolveBaselinePath(ids: string[]): TreeNode[] {
  return resolvePath(baselineTree, ids);
}

export function resolveStatePath(ids: string[]): TreeNode[] {
  return resolvePath(stateTree, ids);
}

/** Human-readable label, e.g. "Crystal · Fractured · Privately". */
export function pathLabel(path: TreeNode[]): string {
  return path.map((n) => n.label).join(" · ");
}

/** The index of each chosen node among its siblings, level by level. */
export function pathIndices(tree: TreeNode, path: TreeNode[]): number[] {
  const indices: number[] = [];
  let current = tree;
  for (const node of path) {
    const idx = current.children?.findIndex((c) => c.id === node.id) ?? -1;
    indices.push(Math.max(0, idx));
    current = node;
  }
  return indices;
}
