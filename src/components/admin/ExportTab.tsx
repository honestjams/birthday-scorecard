"use client";

import { useMemo, useState } from "react";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/client";

type Row = {
  storage_path: string;
  created_at: string;
  guests: { display_name: string } | null;
  bingo_squares: { title: string; position: number } | null;
};

/**
 * Pulls every photo out of the private bucket and packages it for the recap
 * reel. Filenames are ordered by square then guest so the edit timeline is
 * already roughly sorted when it lands in your editor.
 */
export function ExportTab() {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  async function fetchRows(): Promise<Row[]> {
    const { data, error } = await supabase
      .from("bingo_entries")
      .select(
        "storage_path, created_at, guests(display_name), bingo_squares(title, position)",
      )
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as Row[];
  }

  function filenameFor(row: Row, index: number): string {
    const pos = String(row.bingo_squares?.position ?? 0).padStart(2, "0");
    const square = slug(row.bingo_squares?.title ?? "unfiled");
    const who = slug(row.guests?.display_name ?? "unknown");
    const ext = row.storage_path.split(".").pop() ?? "jpg";
    return `${pos}-${square}/${who}-${String(index).padStart(3, "0")}.${ext}`;
  }

  async function downloadZip() {
    setBusy(true);
    setProgress(0);
    setStatus("Reading the archive…");

    try {
      const rows = await fetchRows();
      if (rows.length === 0) {
        setStatus("Nothing to export yet.");
        setBusy(false);
        return;
      }

      const zip = new JSZip();
      let done = 0;

      // Small concurrency: fast enough on venue wifi, gentle on memory.
      const queue = [...rows.entries()];
      const workers = Array.from({ length: 4 }, async () => {
        for (;;) {
          const next = queue.shift();
          if (!next) break;
          const [i, row] = next;
          const { data } = await supabase.storage
            .from("bingo-photos")
            .download(row.storage_path);
          if (data) zip.file(filenameFor(row, i), data);
          done += 1;
          setProgress(Math.round((done / rows.length) * 100));
          setStatus(`Packaging ${done} of ${rows.length}…`);
        }
      });
      await Promise.all(workers);

      setStatus("Compressing…");
      const blob = await zip.generateAsync({ type: "blob" });
      triggerDownload(blob, `birthday-evidence-${today()}.zip`);
      setStatus(`Done — ${rows.length} photos exported.`);
    } catch (err) {
      setStatus(
        err instanceof Error ? `Failed: ${err.message}` : "Export failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function downloadManifest() {
    setBusy(true);
    setStatus("Signing links…");
    try {
      const rows = await fetchRows();
      const { data: signed } = await supabase.storage
        .from("bingo-photos")
        .createSignedUrls(
          rows.map((r) => r.storage_path),
          60 * 60 * 24 * 7,
        );

      const byPath = new Map(
        (signed ?? []).map((s) => [s.path ?? "", s.signedUrl ?? ""]),
      );

      const csv = [
        "square_position,square_title,guest,taken_at,url",
        ...rows.map((r) =>
          [
            r.bingo_squares?.position ?? "",
            csvCell(r.bingo_squares?.title ?? ""),
            csvCell(r.guests?.display_name ?? ""),
            r.created_at,
            csvCell(byPath.get(r.storage_path) ?? ""),
          ].join(","),
        ),
      ].join("\n");

      triggerDownload(
        new Blob([csv], { type: "text/csv" }),
        `birthday-evidence-manifest-${today()}.csv`,
      );
      setStatus(`Manifest ready — ${rows.length} rows, links valid 7 days.`);
    } catch (err) {
      setStatus(
        err instanceof Error ? `Failed: ${err.message}` : "Export failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="doc-soft p-4">
        <h2 className="font-display text-sm uppercase tracking-widest">
          Recap reel export
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
          The bucket is private, so photos can only leave through here. The zip
          arrives sorted into one folder per bingo square, which is roughly the
          order you will want them on the timeline.
        </p>

        {busy ? (
          <div className="mt-4">
            <div className="h-3 w-full border-2 border-ink bg-bone">
              <div
                className="h-full bg-stamp transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {status ? (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
            {status}
          </p>
        ) : null}

        <button
          disabled={busy}
          onClick={downloadZip}
          className="mt-4 min-h-[52px] w-full border-2 border-ink bg-ink px-4 py-3 font-display text-sm uppercase tracking-[0.18em] text-bone shadow-[4px_4px_0_0_var(--color-stamp)] disabled:opacity-60"
        >
          Download everything as a zip
        </button>

        <button
          disabled={busy}
          onClick={downloadManifest}
          className="mt-2 min-h-[48px] w-full border-2 border-ink px-4 py-3 font-mono text-[11px] uppercase tracking-widest disabled:opacity-60"
        >
          Or download a CSV of links
        </button>
        <p className="mt-2 text-[11px] text-ink-faint">
          Use the CSV on a laptop if the zip is large — the links stay valid for
          a week and work with any download manager.
        </p>
      </section>
    </div>
  );
}

/* ---- helpers ---- */

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
