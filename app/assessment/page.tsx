"use client";

// The 100-question assessment, with the progressive reveal from §8.
//
// Completion rates fall off a cliff well before question 100, and the second
// fifty carry the emotional payload — quit at 60 and you get structure with no
// weather. So the sphere appears the moment layer 1 is complete, and every
// answer after that visibly moves the object sitting next to the question. The
// thing being built is the reason to keep going, not a reward withheld to the
// end.

import { useMemo } from "react";
import Link from "next/link";
import PlasmaScene from "@/components/sphere/plasma/PlasmaScene";
import { generateSphere } from "@/lib/sphere/generate";
import { getMapping } from "@/lib/sphere/questions";
import { useAssessmentStore } from "@/lib/store/useAssessmentStore";

const LAYER_ONE_COUNT = 50;

export default function AssessmentPage() {
  const { version, answers, index, answer, back, reset } = useAssessmentStore();
  const questions = useMemo(() => getMapping(version), [version]);

  const total = questions.length;
  const current = questions[index];
  const revealed = index >= LAYER_ONE_COUNT;
  const complete = index >= total;

  // Before question 50 there is nothing to show. From 50 onward this is real
  // structure with neutral weather, then real weather as it arrives — the
  // scorer already returns neutral values for anything unanswered.
  const params = useMemo(
    () => (revealed ? generateSphere(answers, { version }) : null),
    [revealed, answers, version],
  );

  const sphere = params ? (
    <div className="relative h-[42vh] w-full lg:h-[70vh]">
      <PlasmaScene params={params} className="absolute inset-0" />
    </div>
  ) : null;

  if (complete && params) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">{sphere}</div>
        <p className="fade-in mt-8 text-xs tracking-[0.35em] text-(--color-accent) uppercase">
          {params.structure.typeCode}
        </p>
        <p className="fade-up mt-4 max-w-md text-center font-(family-name:--font-display) text-lg text-(--color-ink-dim) italic">
          Your form, and the weather on it tonight.
        </p>
        <div className="mt-12 flex gap-8">
          <button
            onClick={reset}
            className="text-xs tracking-[0.3em] text-(--color-ink-faint) uppercase transition-colors duration-500 hover:text-(--color-accent)"
          >
            Begin again
          </button>
          <Link
            href="/"
            className="text-xs tracking-[0.3em] text-(--color-ink-faint) uppercase transition-colors duration-500 hover:text-(--color-accent)"
          >
            Home
          </Link>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="min-h-dvh">
      {/* Progress: a hairline, not a bar chart. */}
      <div className="fixed inset-x-0 top-0 z-20 h-px bg-(--color-line)">
        <div
          className="h-px bg-(--color-accent) transition-all duration-700"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>

      <div
        className={
          revealed
            ? "mx-auto grid min-h-dvh max-w-6xl items-center gap-4 px-6 py-16 lg:grid-cols-2 lg:gap-12"
            : "mx-auto flex min-h-dvh max-w-2xl items-center px-6 py-16"
        }
      >
        {revealed && (
          <div className="order-first lg:order-none">
            {sphere}
            {index < LAYER_ONE_COUNT + 4 && (
              <p className="fade-in mt-2 text-center text-xs tracking-[0.25em] text-(--color-ink-faint) uppercase">
                Your form. What follows moves it.
              </p>
            )}
          </div>
        )}

        <div key={current.id} className="w-full">
          <p className="fade-in text-xs tracking-[0.3em] text-(--color-ink-faint) uppercase">
            {current.layer === 1 ? "Who you are" : "How you are right now"} ·{" "}
            {index + 1} / {total}
          </p>

          <h1 className="fade-up mt-5 font-(family-name:--font-display) text-xl text-(--color-ink) italic sm:text-2xl">
            {current.prompt}
          </h1>

          <div className="mt-8 space-y-1">
            {current.options.map((option, i) => (
              <button
                key={option.label}
                onClick={() => answer(current.id, i)}
                className="fade-up group block w-full py-3 text-left"
                style={{ animationDelay: `${120 + i * 90}ms` }}
              >
                <span className="font-(family-name:--font-display) text-xl text-(--color-ink-dim) transition-all duration-500 group-hover:text-(--color-ink) sm:text-2xl">
                  {option.label}
                </span>
                <span className="mt-2 block h-px w-0 bg-(--color-accent) opacity-60 transition-all duration-500 group-hover:w-16" />
              </button>
            ))}
          </div>

          {index > 0 && (
            <button
              onClick={back}
              className="fade-in mt-12 text-xs tracking-[0.2em] text-(--color-ink-faint) uppercase transition-colors duration-500 hover:text-(--color-ink-dim)"
            >
              back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
