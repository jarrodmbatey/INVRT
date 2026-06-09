// Shared types for the INVRT translation pipeline.
// Pure TypeScript — usable on both server and client.

export type GestureFamily = "fracture" | "ribbon" | "contour" | "spark-thread";

export type EnergyWord = "rising" | "flat" | "agitated" | "sinking";

/**
 * A partial bundle of descriptors attached to a tree node.
 * Root nodes carry full lane descriptors; deeper nodes carry modulators.
 */
export interface DescriptorPatch {
  traits?: string[];
  form?: string[];
  material?: string[];
  surface?: string[];
  geometry?: string[];
  light?: string[];
  palette?: string[];
  mood?: string[];
  atmosphere?: string[];
  composition?: string[];
  energy?: EnergyWord;
  pathBias?: GestureFamily;
}

/** A node in either the baseline tree or the current-state tree. */
export interface TreeNode {
  id: string;
  label: string;
  /** Root nodes are the dominant lane (weight 1.0); deeper nodes modulate. */
  weight?: number;
  /** The question shown when this node's children are presented. */
  prompt?: string;
  descriptors?: DescriptorPatch;
  children?: TreeNode[];
}

export type BaselineNode = TreeNode;
export type StateNode = TreeNode;

/** The fully-routed descriptor set: one committed form lane + one committed light lane. */
export interface Descriptors {
  traits: string[];
  form: string[];
  material: string[];
  surface: string[];
  geometry: string[];
  light: string[];
  palette: string[];
  mood: string[];
  atmosphere: string[];
  composition: string[];
  energy: EnergyWord;
  /** Present only when baseline and state are in poetic opposition. Never a blend. */
  tensionClause?: string;
}

/** The signature gesture — derived from the baseline path only (form-stable). */
export interface Gesture {
  word: string;
  family: GestureFamily;
  /** 4–7 control points for a CatmullRomCurve3, as plain tuples (server-safe). */
  controlPoints: [number, number, number][];
}

/** Output of the translate() orchestrator. */
export interface Translation {
  descriptors: Descriptors;
  gesture: Gesture;
  gestureEnergy: string;
  /** Stable hash of the baseline path ids — drives the form seed. */
  baselineSignature: string;
  /** Numeric seed derived from the signature; constant per baseline. */
  seed: number;
  /** e.g. "Heavier · Deep · grieving" */
  stateLabel: string;
  /** e.g. "Crystal · Fractured · Privately" */
  baselineLabel: string;
}
