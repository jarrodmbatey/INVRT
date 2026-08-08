"use client";

// In-progress assessment state: which questions have been answered, and where
// the person is in the sequence. Finished results belong in the database.

import { create } from "zustand";
import { MAPPING_VERSION } from "@/lib/sphere/constants";
import type { AnswerSet } from "@/lib/sphere/types";

interface AssessmentState {
  /** The mapping version this run is being scored against (§7). */
  version: string;
  answers: AnswerSet;
  /** Index into the ordered question list. */
  index: number;

  answer: (questionId: string, optionIndex: number) => void;
  back: () => void;
  goTo: (index: number) => void;
  reset: () => void;
}

export const useAssessmentStore = create<AssessmentState>((set) => ({
  version: MAPPING_VERSION,
  answers: {},
  index: 0,

  answer: (questionId, optionIndex) =>
    set((s) => ({
      answers: { ...s.answers, [questionId]: optionIndex },
      index: s.index + 1,
    })),
  back: () => set((s) => ({ index: Math.max(0, s.index - 1) })),
  goTo: (index) => set({ index }),
  reset: () => set({ answers: {}, index: 0, version: MAPPING_VERSION }),
}));
