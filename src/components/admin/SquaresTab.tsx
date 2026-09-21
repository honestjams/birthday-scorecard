"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BingoSquare } from "@/types/database";

export function SquaresTab({ squares }: { squares: BingoSquare[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [list, setList] = useState(squares);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "" });
  const [busy, setBusy] = useState(false);

  function startEdit(sq: BingoSquare) {
    setEditing(sq.id);
    setDraft({ title: sq.title, description: sq.description ?? "" });
  }

  async function save(id: string) {
    setBusy(true);
    await supabase
      .from("bingo_squares")
      .update({ title: draft.title, description: draft.description })
      .eq("id", id);
    setList((l) =>
      l.map((s) =>
        s.id === id
          ? { ...s, title: draft.title, description: draft.description }
          : s,
      ),
    );
    setEditing(null);
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-ink-faint">
        Rewrite any square. Changes appear on every guest&rsquo;s card the next
        time they open it. Photos already filed against a square stay attached.
      </p>

      <ul className="space-y-2">
        {list.map((sq) => (
          <li key={sq.id} className="doc-soft p-3">
            {editing === sq.id ? (
              <div className="space-y-2">
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  maxLength={40}
                  className="w-full border-2 border-ink bg-white px-2 py-2 font-display text-sm uppercase"
                />
                <textarea
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  rows={3}
                  maxLength={240}
                  className="w-full border-2 border-ink bg-white px-2 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => save(sq.id)}
                    className="flex-1 border-2 border-ink bg-ink px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-bone disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="flex-1 border-2 border-ink px-2 py-2 font-mono text-[10px] uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => startEdit(sq)}
                className="w-full text-left"
              >
                <span className="font-mono text-[10px] text-ink-faint">
                  {String(sq.position).padStart(2, "0")}
                </span>
                <p className="font-display text-sm uppercase">{sq.title}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">
                  {sq.description}
                </p>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
