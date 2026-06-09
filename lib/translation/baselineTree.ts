// BASELINE TREE — identity → sculpture.
// This file is DATA. Edit wording, descriptors, and structure freely; no DB involved.
//
// Structure: 4 root archetypes (the dominant form lane, committed and locked),
// each with a level-2 detail question, plus a shared level-3 "hold" question
// that maps to composition. ~3 taps total.

import type { BaselineNode } from "../types";

/**
 * Shared Level-3 across all lanes: how the form is held in frame.
 * Maps to composition only — never touches the form lane.
 */
const holdQuestion = "And you hold this —";

const holdNodes: BaselineNode[] = [
  {
    id: "b_hold_openly",
    label: "Openly",
    descriptors: {
      composition: ["fully exposed", "centered and unguarded in the frame"],
    },
  },
  {
    id: "b_hold_privately",
    label: "Privately",
    descriptors: {
      composition: ["partially shadowed", "contained, turned slightly away from the light"],
    },
  },
  {
    id: "b_hold_heavily",
    label: "Heavily",
    descriptors: {
      composition: ["large in the frame", "dominant, close, filling the dark"],
    },
  },
];

/** Attach the shared hold level beneath a level-2 node. */
function withHold(node: BaselineNode): BaselineNode {
  return { ...node, prompt: holdQuestion, children: holdNodes };
}

export const baselineTree: BaselineNode = {
  id: "b_root",
  label: "Baseline",
  prompt: "At your core, you are most like —",
  children: [
    {
      id: "b_crystal",
      label: "Crystal", // structured · precise · analytical · clear
      weight: 1.0,
      descriptors: {
        traits: ["structured", "precise", "analytical", "clear-minded"],
        form: ["crystalline", "faceted", "geometric", "centered"],
        material: ["polished dark glass", "smoky quartz", "obsidian glass"],
        surface: ["sharp exact edges", "internal refraction", "glassy"],
        geometry: ["facet", "low-frequency-displacement", "hard-edge"],
        pathBias: "fracture",
      },
      prompt: "Your edges are —",
      children: [
        withHold({
          id: "b_crystal_exact",
          label: "Exact",
          descriptors: {
            surface: ["razor-sharp facets", "perfect symmetry"],
            geometry: ["high-facet", "symmetric"],
          },
        }),
        withHold({
          id: "b_crystal_fractured",
          label: "Fractured",
          descriptors: {
            surface: ["internal fractures", "split planes catching light"],
            geometry: ["cracked", "asymmetric"],
          },
        }),
        withHold({
          id: "b_crystal_smooth",
          label: "Smooth",
          descriptors: {
            surface: ["polished glassy planes", "soft refraction"],
            geometry: ["rounded-facet"],
            material: ["clear dark glass"],
          },
        }),
      ],
    },
    {
      id: "b_current",
      label: "Current", // flowing · adaptive · intuitive · feeling
      weight: 1.0,
      descriptors: {
        traits: ["flowing", "adaptive", "intuitive", "feeling"],
        form: ["fluid", "sinuous", "organic", "twisting"],
        material: ["liquid metal", "dark water", "molten glass"],
        surface: ["rippling", "wet sheen", "smooth flowing"],
        geometry: ["smooth-high-poly", "low-frequency-wave"],
        pathBias: "ribbon",
      },
      prompt: "You move like —",
      children: [
        withHold({
          id: "b_current_river",
          label: "River",
          descriptors: {
            form: ["directed flow", "single strong line"],
            geometry: ["elongated"],
          },
        }),
        withHold({
          id: "b_current_tide",
          label: "Tide",
          descriptors: {
            form: ["cyclical folds", "returning curves"],
            geometry: ["looping"],
          },
        }),
        withHold({
          id: "b_current_mist",
          label: "Mist",
          descriptors: {
            form: ["diffuse", "softened edges"],
            material: ["vaporous glass"],
            geometry: ["soft-boundary"],
          },
        }),
      ],
    },
    {
      id: "b_stone",
      label: "Stone", // grounded · enduring · steady · deep
      weight: 1.0,
      descriptors: {
        traits: ["grounded", "enduring", "steady", "deep"],
        form: ["monolithic", "weighty", "solid", "still"],
        material: ["basalt", "raw marble", "iron ore", "dark granite"],
        surface: ["rough hewn", "weathered", "matte mineral"],
        geometry: ["heavy-displacement", "blocky"],
        pathBias: "contour",
      },
      prompt: "You are shaped by —",
      children: [
        withHold({
          id: "b_stone_pressure",
          label: "Pressure",
          descriptors: {
            surface: ["dense compressed grain"],
            geometry: ["compact"],
          },
        }),
        withHold({
          id: "b_stone_time",
          label: "Time",
          descriptors: {
            surface: ["eroded", "worn smooth in places"],
            geometry: ["weathered"],
          },
        }),
        withHold({
          id: "b_stone_fire",
          label: "Fire",
          descriptors: {
            material: ["volcanic basalt"],
            surface: ["scorched", "glassy fused patches"],
          },
        }),
      ],
    },
    {
      id: "b_flame",
      label: "Flame", // radiant · expressive · energetic · projecting
      weight: 1.0,
      descriptors: {
        traits: ["radiant", "expressive", "energetic", "open"],
        form: ["radiant", "spiked", "blooming", "outward-reaching"],
        material: ["molten gold", "glowing amber glass", "incandescent metal"],
        surface: ["luminous", "emissive veins", "heat-warped"],
        geometry: ["radial-spike", "outward-displacement"],
        pathBias: "spark-thread",
      },
      prompt: "Your light is —",
      children: [
        withHold({
          id: "b_flame_steady",
          label: "Steady",
          descriptors: {
            surface: ["even warm glow"],
            geometry: ["balanced-radial"],
          },
        }),
        withHold({
          id: "b_flame_flicker",
          label: "Flickering",
          descriptors: {
            surface: ["restless uneven glow", "darting highlights"],
            geometry: ["irregular-spike"],
          },
        }),
        withHold({
          id: "b_flame_blinding",
          label: "Blinding",
          descriptors: {
            surface: ["intense core light", "bloom"],
            geometry: ["sharp-radial"],
          },
        }),
      ],
    },
  ],
};
