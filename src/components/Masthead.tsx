/** The departmental letterhead. Appears at the top of every "document". */
export function Masthead({
  title,
  formCode,
  subtitle,
}: {
  title: string;
  formCode: string;
  subtitle?: string;
}) {
  return (
    <header className="border-b-4 border-ink bg-bone px-5 pt-safe">
      <div className="flex items-start justify-between gap-3 pt-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            Bureau of Birthday Affairs
          </p>
          <h1 className="mt-1 font-display text-2xl leading-none uppercase tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-[13px] leading-snug text-ink-soft">
              {subtitle}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-sm border-2 border-ink px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest">
          {formCode}
        </span>
      </div>
      <div className="mt-3 flex gap-1 pb-2" aria-hidden>
        {Array.from({ length: 28 }).map((_, i) => (
          <span key={i} className="h-1 flex-1 bg-ink/15" />
        ))}
      </div>
    </header>
  );
}
