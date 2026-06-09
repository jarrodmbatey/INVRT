// Gallery — saved pieces as a calm grid. A room you walk back into.

import Link from "next/link";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const generations = await prisma.generation.findMany({
    where: { status: "succeeded" },
    include: { baseline: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 pt-28 pb-24">
      <h1 className="fade-up text-center font-(family-name:--font-display) text-2xl tracking-[0.2em] text-(--color-ink)">
        Gallery
      </h1>

      {generations.length === 0 ? (
        <div className="fade-in mt-24 text-center">
          <p className="font-(family-name:--font-display) text-lg text-(--color-ink-dim) italic">
            Nothing rendered yet.
          </p>
          <Link
            href="/baseline"
            className="mt-8 inline-block border border-(--color-line) px-10 py-3 text-xs tracking-[0.3em] uppercase transition-colors duration-500 hover:border-(--color-accent) hover:text-(--color-accent)"
          >
            Begin
          </Link>
        </div>
      ) : (
        <div className="mt-16 grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {generations.map((g, i) => {
            const src = g.imagePath ? `/${g.imagePath}` : (g.imageUrl ?? `/${g.controlImagePath}`);
            return (
              <div key={g.id} className="fade-up" style={{ animationDelay: `${i * 90}ms` }}>
                <Link href={`/result/${g.id}`} className="group block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- runtime-written files in /public */}
                  <img
                    src={src}
                    alt={g.title}
                    className="aspect-square w-full object-cover transition-opacity duration-700 group-hover:opacity-80"
                  />
                  <p className="mt-4 font-(family-name:--font-display) text-base text-(--color-ink) transition-colors duration-500 group-hover:text-(--color-accent)">
                    {g.title}
                  </p>
                </Link>
                <p className="mt-1 text-[10px] tracking-[0.2em] text-(--color-ink-dim) uppercase">
                  {g.baseline.label}
                </p>
                <p className="text-[10px] tracking-[0.2em] text-(--color-ink-faint) uppercase">
                  under · {g.stateLabel} ·{" "}
                  {g.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <details className="mt-2 text-(--color-ink-faint)">
                  <summary className="cursor-pointer text-[10px] tracking-[0.2em] uppercase">
                    detail
                  </summary>
                  <p className="mt-2 text-[11px] leading-relaxed">
                    seed {g.seed} · {g.provider} · {g.model}
                    <br />
                    {g.prompt}
                  </p>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
