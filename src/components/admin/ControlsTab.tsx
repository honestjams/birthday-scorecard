"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppSettings } from "@/types/database";

export function ControlsTab({ settings }: { settings: AppSettings }) {
  const supabase = useMemo(() => createClient(), []);
  const [value, setValue] = useState(settings);
  const [saving, setSaving] = useState<string | null>(null);

  async function patch(patch: Partial<AppSettings>) {
    const key = Object.keys(patch)[0]!;
    setSaving(key);
    setValue((v) => ({ ...v, ...patch }));
    await supabase.from("app_settings").update(patch).eq("id", true);
    setSaving(null);
  }

  return (
    <div className="space-y-5">
      <section className="doc-soft p-4">
        <h2 className="font-display text-sm uppercase tracking-widest">
          What guests can do right now
        </h2>
        <p className="mt-1 mb-3 text-[12px] text-ink-faint">
          Closing an activity hides its form instantly on every phone. Nothing
          already submitted is lost.
        </p>
        <Toggle
          label="Photo bingo submissions"
          checked={value.bingo_open}
          busy={saving === "bingo_open"}
          onChange={(v) => patch({ bingo_open: v })}
        />
        <Toggle
          label="Lap time declarations"
          checked={value.kart_open}
          busy={saving === "kart_open"}
          onChange={(v) => patch({ kart_open: v })}
        />
        <Toggle
          label="Tournament visible"
          checked={value.tournament_open}
          busy={saving === "tournament_open"}
          onChange={(v) => patch({ tournament_open: v })}
        />
      </section>

      <section className="doc-soft p-4">
        <h2 className="font-display text-sm uppercase tracking-widest">
          Door policy
        </h2>
        <p className="mt-1 mb-3 text-[12px] text-ink-faint">
          Off, anyone with the link can sign in. On, only numbers you have added
          to the guest list can get in — useful if the link escapes.
        </p>
        <Toggle
          label="Invite list only"
          checked={value.invite_only}
          busy={saving === "invite_only"}
          onChange={(v) => patch({ invite_only: v })}
        />
      </section>

      <section className="doc-soft p-4">
        <h2 className="font-display text-sm uppercase tracking-widest">
          Party details
        </h2>
        <label className="mt-3 block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Name
          </span>
          <input
            value={value.party_name}
            onChange={(e) => setValue({ ...value, party_name: e.target.value })}
            onBlur={() => patch({ party_name: value.party_name })}
            className="mt-1 w-full border-2 border-ink bg-white px-3 py-2"
          />
        </label>
        <label className="mt-3 block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Date
          </span>
          <input
            type="date"
            value={value.party_date ?? ""}
            onChange={(e) => {
              setValue({ ...value, party_date: e.target.value });
              patch({ party_date: e.target.value || null });
            }}
            className="mt-1 w-full border-2 border-ink bg-white px-3 py-2"
          />
        </label>
      </section>
    </div>
  );
}

function Toggle({
  label,
  checked,
  busy,
  onChange,
}: {
  label: string;
  checked: boolean;
  busy: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-[48px] cursor-pointer items-center justify-between gap-3 border-b border-bone-deep py-2 last:border-0">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={busy}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 border-2 border-ink transition-colors ${
          checked ? "bg-approved" : "bg-bone-deep"
        } disabled:opacity-50`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 border-2 border-ink bg-bone transition-all ${
            checked ? "left-[26px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}
