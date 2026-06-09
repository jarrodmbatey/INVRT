// The finished artwork — large and centered, with its title, interpretation,
// and quiet provenance.

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { renderSrc } from "@/lib/storage";
import ArtworkView from "@/components/result/ArtworkView";
import PathSummary from "@/components/result/PathSummary";
import ResultActions from "@/components/result/ResultActions";

export const dynamic = "force-dynamic";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const generation = await prisma.generation.findUnique({
    where: { id },
    include: { baseline: true },
  });
  if (!generation) notFound();

  const src =
    renderSrc(generation.imagePath) ??
    generation.imageUrl ??
    renderSrc(generation.controlImagePath)!;

  const date = generation.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-4xl px-6 pt-28 pb-24">
      <ArtworkView src={src} alt={generation.title} />

      <h1
        className="fade-up mt-12 text-center font-(family-name:--font-display) text-3xl text-(--color-ink) sm:text-4xl"
        style={{ animationDelay: "200ms" }}
      >
        {generation.title}
      </h1>

      <div
        className="fade-up mx-auto mt-8 max-w-md text-center"
        style={{ animationDelay: "400ms" }}
      >
        {generation.interpretation.split("\n").map((line, i) => (
          <p
            key={i}
            className="font-(family-name:--font-display) text-base leading-loose text-(--color-ink-dim) italic"
          >
            {line}
          </p>
        ))}
      </div>

      <PathSummary
        baselineLabel={generation.baseline.label}
        stateLabel={generation.stateLabel}
        date={date}
      />

      <ResultActions
        generationId={generation.id}
        baselineId={generation.baselineId}
        baselinePathIds={JSON.parse(generation.baseline.pathIds)}
        downloadHref={renderSrc(generation.imagePath)}
      />

      <details className="fade-in mx-auto mt-16 max-w-2xl text-(--color-ink-faint)">
        <summary className="cursor-pointer text-center text-[10px] tracking-[0.25em] uppercase">
          Provenance
        </summary>
        <div className="mt-4 space-y-2 border border-(--color-line) p-5 text-xs leading-relaxed">
          <p>
            <span className="text-(--color-ink-dim)">seed</span> {generation.seed} ·{" "}
            <span className="text-(--color-ink-dim)">provider</span> {generation.provider} ·{" "}
            <span className="text-(--color-ink-dim)">model</span> {generation.model}
          </p>
          <p>
            <span className="text-(--color-ink-dim)">prompt</span> {generation.prompt}
          </p>
        </div>
      </details>
    </div>
  );
}
