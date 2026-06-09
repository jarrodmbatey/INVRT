"use client";

// A single tappable word. Large, serif, quiet — a word you recognize,
// not a form field you fill in.

interface Props {
  label: string;
  hint?: string;
  index: number;
  onSelect: () => void;
}

export default function WordChoice({ label, index, onSelect }: Props) {
  return (
    <button
      onClick={onSelect}
      className="fade-up group block w-full py-4 text-center"
      style={{ animationDelay: `${180 + index * 130}ms` }}
    >
      <span className="font-(family-name:--font-display) text-3xl text-(--color-ink-dim) transition-all duration-500 group-hover:tracking-wide group-hover:text-(--color-ink) sm:text-4xl">
        {label}
      </span>
      <span className="mx-auto mt-2 block h-px w-0 bg-(--color-accent) opacity-60 transition-all duration-500 group-hover:w-16" />
    </button>
  );
}
