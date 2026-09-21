import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("party_name, party_date")
    .single();

  const partyDate = settings?.party_date
    ? new Date(settings.party_date).toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <main className="min-h-dvh">
      {/* ---- letterhead ---- */}
      <div className="border-b-4 border-ink bg-ink px-5 pt-safe pb-5 text-bone">
        <div className="pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone/60">
            Commonwealth of Good Times
          </p>
          <h1 className="mt-2 font-display text-[2.6rem] leading-[0.92] uppercase">
            The Bureau
            <br />
            of Birthday
            <br />
            <span className="text-hazard">Affairs</span>
          </h1>
          <p className="mt-3 max-w-[38ch] text-sm leading-snug text-bone/75">
            {settings?.party_name ?? "An official celebration"}
            {partyDate ? ` · ${partyDate}` : ""}. All attendees must register
            before submitting evidence, lap times, or objections.
          </p>
        </div>
      </div>

      {/* ---- ticker ---- */}
      <div className="overflow-hidden border-b-2 border-ink bg-hazard py-1.5">
        <div className="flex w-max animate-ticker">
          {[0, 1].map((k) => (
            <p
              key={k}
              className="shrink-0 px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] whitespace-nowrap"
              aria-hidden={k === 1}
            >
              Photographic evidence required · Lap times are final · The draw is
              random and cannot be appealed · Photographic evidence required ·
              Lap times are final · The draw is random and cannot be appealed ·
            </p>
          ))}
        </div>
      </div>

      {/* ---- registration form ---- */}
      <section className="px-5 py-7">
        <div className="doc p-5">
          <div className="mb-5 flex items-baseline justify-between gap-3 rule-dotted pb-3">
            <h2 className="font-display text-lg uppercase tracking-tight">
              Form 1 — Registration
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              Rev. 1
            </span>
          </div>

          <Suspense
            fallback={
              <div className="h-64 animate-pulse rounded bg-bone-deep/50" />
            }
          >
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-[12px] leading-relaxed text-ink-faint">
          No password. No verification code. Your number simply keeps your
          photos and scores attached to you, on whichever phone you pick up.
        </p>
      </section>
    </main>
  );
}
