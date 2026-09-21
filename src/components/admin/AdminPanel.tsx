"use client";

import { useState } from "react";
import { ControlsTab } from "./ControlsTab";
import { GuestsTab } from "./GuestsTab";
import { TournamentTab } from "./TournamentTab";
import { SquaresTab } from "./SquaresTab";
import { ExportTab } from "./ExportTab";
import type {
  AppSettings,
  BingoSquare,
  StaffGuest,
  Tournament,
} from "@/types/database";

const TABS = [
  "Controls",
  "Guests",
  "Tournament",
  "Squares",
  "Export",
] as const;

export function AdminPanel({
  isHost,
  settings,
  guests,
  squares,
  tournaments,
}: {
  isHost: boolean;
  settings: AppSettings;
  guests: StaffGuest[];
  squares: BingoSquare[];
  tournaments: Tournament[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Controls");

  return (
    <>
      <div className="flex gap-1 overflow-x-auto border-b-2 border-ink bg-card px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-2 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-widest ${
              tab === t
                ? "border-ink bg-ink text-bone"
                : "border-ink/25 bg-bone text-ink-soft"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 py-5 pb-12">
        {tab === "Controls" && <ControlsTab settings={settings} />}
        {tab === "Guests" && <GuestsTab guests={guests} isHost={isHost} />}
        {tab === "Tournament" && (
          <TournamentTab guests={guests} tournaments={tournaments} />
        )}
        {tab === "Squares" && <SquaresTab squares={squares} />}
        {tab === "Export" && <ExportTab />}
      </div>
    </>
  );
}
