// Quiet provenance — the signature and the weather it was rendered under.

interface Props {
  baselineLabel: string;
  stateLabel: string;
  date?: string;
}

export default function PathSummary({ baselineLabel, stateLabel, date }: Props) {
  return (
    <div className="fade-up mt-10 flex flex-col items-center gap-2 text-center">
      <p className="text-xs tracking-[0.25em] text-(--color-ink-dim) uppercase">
        {baselineLabel}
      </p>
      <p className="text-xs tracking-[0.25em] text-(--color-ink-faint) uppercase">
        under · {stateLabel}
      </p>
      {date && <p className="mt-1 text-[10px] tracking-[0.2em] text-(--color-ink-faint)">{date}</p>}
    </div>
  );
}
