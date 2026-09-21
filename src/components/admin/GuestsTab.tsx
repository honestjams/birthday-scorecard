"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Role, StaffGuest } from "@/types/database";

export function GuestsTab({
  guests,
  isHost,
}: {
  guests: StaffGuest[];
  isHost: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [list, setList] = useState(guests);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setRole(id: string, role: Role) {
    setBusy(id);
    setError(null);
    const { error: err } = await supabase
      .from("guests")
      .update({ role })
      .eq("id", id);
    if (err) setError(err.message);
    else setList((l) => l.map((g) => (g.id === id ? { ...g, role } : g)));
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-ink-faint">
        {list.length} {list.length === 1 ? "person has" : "people have"} signed
        in. Helpers can run the draw, record results and moderate photos. Only
        you can appoint them.
      </p>

      {error ? (
        <p className="border-2 border-stamp bg-stamp/10 px-3 py-2 text-sm text-stamp-deep">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {list.map((g) => (
          <li key={g.id} className="doc-soft p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{g.display_name}</p>
                <p className="font-mono text-[11px] text-ink-faint">
                  {g.phone}
                </p>
              </div>
              <span
                className={`shrink-0 border-2 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${
                  g.role === "host"
                    ? "border-stamp text-stamp"
                    : g.role === "helper"
                      ? "border-seal text-seal"
                      : "border-ink/25 text-ink-faint"
                }`}
              >
                {g.role}
              </span>
            </div>

            {isHost && g.role !== "host" ? (
              <div className="mt-3 flex gap-2">
                <button
                  disabled={busy === g.id}
                  onClick={() =>
                    setRole(g.id, g.role === "helper" ? "guest" : "helper")
                  }
                  className="flex-1 border-2 border-ink px-2 py-2 font-mono text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                  {g.role === "helper" ? "Remove helper" : "Make helper"}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {list.length === 0 ? (
        <p className="doc-soft px-4 py-8 text-center text-sm text-ink-faint">
          Nobody has signed in yet.
        </p>
      ) : null}
    </div>
  );
}
