import Link from "next/link";
import HeroSphere from "@/components/ui/HeroSphere";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden">
      <HeroSphere />

      <div className="relative z-10 mx-auto max-w-xl px-6 text-center">
        <h1 className="fade-up font-(family-name:--font-display) text-6xl tracking-[0.3em] sm:text-7xl">
          INVRT
        </h1>

        <p
          className="fade-up mt-6 text-sm tracking-[0.3em] text-(--color-accent) uppercase"
          style={{ animationDelay: "250ms" }}
        >
          Your signature, rendered
        </p>

        <p
          className="fade-up mx-auto mt-10 max-w-md font-(family-name:--font-display) text-lg leading-relaxed text-(--color-ink-dim) italic"
          style={{ animationDelay: "500ms" }}
        >
          What lives inside you, turned outward into form. A stable shape that is yours alone —
          lit and weathered by how you are tonight.
        </p>

        <div className="fade-up mt-14" style={{ animationDelay: "800ms" }}>
          <Link
            href="/baseline"
            className="inline-block border border-(--color-line) px-12 py-4 text-xs tracking-[0.3em] text-(--color-ink) uppercase transition-all duration-700 hover:border-(--color-accent) hover:text-(--color-accent)"
          >
            Begin
          </Link>
        </div>
      </div>
    </div>
  );
}
