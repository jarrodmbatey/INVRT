"use client";

// Forming — emergence, not a spinner. The sculpture assembles and the gesture
// draws itself in while the control map is exported and the artwork generated.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import InvrtSphere from "@/components/sphere/InvrtSphere";
import { renderControlMap } from "@/components/sphere/ControlRenderer";
import { useInvrtStore } from "@/lib/store/useInvrtStore";
import { resolveBaselinePath } from "@/lib/translation/trees";

const PHRASES = [
  "Listening to what you chose…",
  "Finding the form that holds it…",
  "Letting the light fall the way you feel…",
  "Almost — it is taking shape…",
];

export default function FormingPage() {
  const router = useRouter();
  const { baselinePathIds, statePathIds, setLastGenerationId } = useInvrtStore();
  const [emergence, setEmergence] = useState(0);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);

  const baselinePath = useMemo(() => {
    try {
      return baselinePathIds.length ? resolveBaselinePath(baselinePathIds) : null;
    } catch {
      return null;
    }
  }, [baselinePathIds]);

  // Guard: this page only makes sense mid-ritual.
  useEffect(() => {
    if (!baselinePath || statePathIds.length === 0) router.replace("/");
  }, [baselinePath, statePathIds, router]);

  // Emergence ramp + rotating copy.
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      setEmergence(Math.min(1, (now - start) / 4000));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const phraseTimer = setInterval(() => {
      setPhraseIdx((i) => Math.min(i + 1, PHRASES.length - 1));
    }, 4500);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(phraseTimer);
    };
  }, []);

  // Export the control map and fire the generation. Once.
  useEffect(() => {
    if (!baselinePath || statePathIds.length === 0 || fired.current) return;
    fired.current = true;

    const run = async () => {
      try {
        // Deterministic, baseline-only depth render (1024²).
        const controlImageDataUri = renderControlMap(baselinePath);
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baselinePathIds, statePathIds, controlImageDataUri }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Generation failed");
        setLastGenerationId(data.id);
        router.push(`/result/${data.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something interrupted the forming.");
      }
    };
    // Give the first paint a beat before the heavy work.
    const t = setTimeout(run, 600);
    return () => clearTimeout(t);
  }, [baselinePath, baselinePathIds, statePathIds, router, setLastGenerationId]);

  if (!baselinePath) return null;

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 3.4], fov: 35 }} gl={{ antialias: true }}>
          <ambientLight intensity={0.2} />
          <directionalLight position={[2, 3, 2]} intensity={1.2} color="#cfc8ba" />
          <directionalLight position={[-3, -1, -2]} intensity={0.35} color="#5a6478" />
          <InvrtSphere baselinePath={baselinePath} spinSpeed={0.18} emergence={emergence} />
        </Canvas>
      </div>

      <div className="pointer-events-none relative z-10 mt-[55vh] text-center">
        {error ? (
          <div className="pointer-events-auto px-6">
            <p className="font-(family-name:--font-display) text-lg text-(--color-ink-dim) italic">
              The forming was interrupted.
            </p>
            <p className="mt-2 max-w-md text-xs text-(--color-ink-faint)">{error}</p>
            <button
              onClick={() => {
                fired.current = false;
                setError(null);
                // Re-trigger the generation effect.
                router.refresh();
                window.location.reload();
              }}
              className="mt-6 border border-(--color-line) px-8 py-3 text-xs tracking-[0.3em] uppercase transition-colors duration-500 hover:border-(--color-accent) hover:text-(--color-accent)"
            >
              Try again
            </button>
          </div>
        ) : (
          <p
            key={phraseIdx}
            className="breathe fade-in font-(family-name:--font-display) text-base text-(--color-ink-dim) italic"
          >
            {PHRASES[phraseIdx]}
          </p>
        )}
      </div>
    </div>
  );
}
