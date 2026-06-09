// CURRENT-STATE FEELING TREE — mind-state → weather & light.
// This file is DATA. Edit wording, descriptors, and structure freely; no DB involved.
//
// Top level is Lighter / Heavier (never "good/bad"). The root is the dominant
// light/mood lane, committed and locked. Leaves inherit their parent's
// descriptors and add one small accent. ~3 taps total.

import type { StateNode } from "../types";

export const stateTree: StateNode = {
  id: "s_root",
  label: "State",
  prompt: "Right now, you feel more —",
  children: [
    {
      id: "s_lighter",
      label: "Lighter",
      weight: 1.0,
      descriptors: {
        light: ["soft rising light", "clean key light"],
        palette: ["warm neutrals", "pale gold"],
        mood: ["open", "settled"],
        atmosphere: ["clear air", "gentle glow"],
        energy: "rising",
      },
      prompt: "And that lightness is —",
      children: [
        {
          id: "s_calm",
          label: "Calm",
          descriptors: {
            light: ["low even light", "still"],
            palette: ["soft greys", "muted blue"],
            mood: ["quiet", "at ease"],
            atmosphere: ["motionless air"],
          },
          prompt: "Closest to —",
          children: [
            { id: "s_relieved", label: "relieved", descriptors: { mood: ["unburdened"], light: ["a slow exhale of light"] } },
            { id: "s_peaceful", label: "peaceful", descriptors: { mood: ["at peace"], atmosphere: ["perfectly still air"] } },
            { id: "s_steady", label: "steady", descriptors: { mood: ["even"], light: ["unwavering soft light"] } },
          ],
        },
        {
          id: "s_bright",
          label: "Bright",
          descriptors: {
            light: ["bright key light", "high clarity"],
            palette: ["warm whites", "amber"],
            mood: ["energized", "alive"],
            atmosphere: ["luminous"],
            energy: "rising",
          },
          prompt: "Closest to —",
          children: [
            { id: "s_energized", label: "energized", descriptors: { mood: ["charged with life"], palette: ["a bright amber flare"] } },
            { id: "s_hopeful", label: "hopeful", descriptors: { mood: ["leaning toward the light"], light: ["light arriving from above"] } },
            { id: "s_playful", label: "playful", descriptors: { mood: ["light on its feet"], light: ["dancing highlights"] } },
          ],
        },
        {
          id: "s_tender",
          label: "Tender",
          descriptors: {
            light: ["warm soft glow", "halo rim light"],
            palette: ["rose-gold", "warm amber"],
            mood: ["moved", "grateful"],
            atmosphere: ["soft warm haze"],
          },
          prompt: "Closest to —",
          children: [
            { id: "s_grateful", label: "grateful", descriptors: { mood: ["quietly grateful"], light: ["a held warm glow"] } },
            { id: "s_loved", label: "loved", descriptors: { mood: ["held"], atmosphere: ["enveloping warmth"] } },
            { id: "s_moved", label: "moved", descriptors: { mood: ["touched"], palette: ["a faint rose bloom"] } },
          ],
        },
      ],
    },
    {
      id: "s_heavier",
      label: "Heavier",
      weight: 1.0,
      descriptors: {
        light: ["low subdued light", "deep shadow"],
        palette: ["cool blue-grey", "near-black"],
        mood: ["heavy", "withdrawn"],
        atmosphere: ["cool fog", "still heavy air"],
        energy: "sinking",
      },
      prompt: "And that weight is —",
      children: [
        {
          id: "s_dim",
          label: "Dim",
          descriptors: {
            light: ["flat dim light", "low contrast"],
            palette: ["grey", "desaturated"],
            mood: ["numb", "distant"],
            atmosphere: ["thin grey haze"],
            energy: "flat",
          },
          prompt: "Closest to —",
          children: [
            { id: "s_numb", label: "numb", descriptors: { mood: ["feeling at a distance"], palette: ["color drained almost to grey"] } },
            { id: "s_tired", label: "tired", descriptors: { mood: ["worn thin"], light: ["light too weak to reach the edges"] } },
            { id: "s_distant", label: "distant", descriptors: { mood: ["far from itself"], atmosphere: ["a pale veil between viewer and form"] } },
          ],
        },
        {
          id: "s_sharp",
          label: "Sharp",
          descriptors: {
            light: ["harsh raking light", "hard edges of shadow"],
            palette: ["cold steel", "deep red accent"],
            mood: ["tense", "restless"],
            atmosphere: ["charged air"],
            energy: "agitated",
          },
          prompt: "Closest to —",
          children: [
            { id: "s_tense", label: "tense", descriptors: { mood: ["held taut"], light: ["light striking at a hard angle"] } },
            { id: "s_angry", label: "angry", descriptors: { mood: ["burning low"], palette: ["a single deep red ember"] } },
            { id: "s_restless", label: "restless", descriptors: { mood: ["unable to settle"], light: ["shifting hard shadows"] } },
            { id: "s_anxious", label: "anxious", descriptors: { mood: ["braced"], atmosphere: ["air pulled tight"] } },
          ],
        },
        {
          id: "s_deep",
          label: "Deep",
          descriptors: {
            light: ["very low light", "single faint source", "much of the form in shadow"],
            palette: ["deep blue-black", "cold indigo"],
            mood: ["aching", "grieving"],
            atmosphere: ["heavy cool fog", "partially obscured"],
            energy: "sinking",
          },
          prompt: "Closest to —",
          children: [
            { id: "s_grieving", label: "grieving", descriptors: { mood: ["carrying a loss"], light: ["a single cold highlight"] } },
            { id: "s_ashamed", label: "ashamed", descriptors: { mood: ["turned inward"], atmosphere: ["the form half-turned from the light"] } },
            { id: "s_lonely", label: "lonely", descriptors: { mood: ["alone in a wide dark"], atmosphere: ["vast empty darkness around the form"] } },
            { id: "s_aching", label: "aching", descriptors: { mood: ["a dull persistent ache"], palette: ["bruised indigo depths"] } },
          ],
        },
      ],
    },
  ],
};
