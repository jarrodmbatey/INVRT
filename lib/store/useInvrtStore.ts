"use client";

// Client state: in-progress selections only.
// Finished generations live in the database; this store is the ritual's memory.

import { create } from "zustand";

interface InvrtState {
  baselinePathIds: string[];
  statePathIds: string[];
  /** Set when continuing from an existing baseline ("new state from this baseline"). */
  baselineId: string | null;
  lastGenerationId: string | null;

  setBaselinePath: (ids: string[]) => void;
  setStatePath: (ids: string[]) => void;
  setLastGenerationId: (id: string | null) => void;
  /** Keep an existing baseline, clear the state path — re-enter at /state. */
  continueFromBaseline: (baselinePathIds: string[], baselineId: string) => void;
  reset: () => void;
}

export const useInvrtStore = create<InvrtState>((set) => ({
  baselinePathIds: [],
  statePathIds: [],
  baselineId: null,
  lastGenerationId: null,

  setBaselinePath: (ids) => set({ baselinePathIds: ids, baselineId: null }),
  setStatePath: (ids) => set({ statePathIds: ids }),
  setLastGenerationId: (id) => set({ lastGenerationId: id }),
  continueFromBaseline: (baselinePathIds, baselineId) =>
    set({ baselinePathIds, baselineId, statePathIds: [] }),
  reset: () =>
    set({ baselinePathIds: [], statePathIds: [], baselineId: null, lastGenerationId: null }),
}));
