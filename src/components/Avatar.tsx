import { initials } from "@/lib/format";

/**
 * A guest's face, or their initials stamped on card stock when they have
 * not filed a photograph. Avatars live in a public bucket, so the URL can
 * be rendered directly — no signing required, unlike the private evidence
 * buckets.
 */
export function Avatar({
  name,
  url,
  size = 32,
  className = "",
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  const dim = { width: size, height: size };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        style={dim}
        className={`shrink-0 border-2 border-ink object-cover ${className}`}
      />
    );
  }

  return (
    <span
      style={dim}
      aria-hidden
      className={`flex shrink-0 items-center justify-center border-2 border-ink/25 bg-card font-mono font-semibold text-ink-soft ${className}`}
    >
      <span style={{ fontSize: Math.max(9, Math.round(size * 0.34)) }}>
        {initials(name) || "?"}
      </span>
    </span>
  );
}
