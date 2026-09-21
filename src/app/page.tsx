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

  const partyName = settings?.party_name ?? "The Party";
  const partyDate = settings?.party_date
    ? new Date(settings.party_date).toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <main className="theme-default min-h-dvh">
      {/* hero */}
      <div
        className="px-6 pt-safe pb-10 text-white"
        style={{ background: "linear-gradient(150deg,#4f46e5,#7c5cff 55%,#ff2d87)" }}
      >
        <div className="pt-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/70">
            Welcome to
          </p>
          <h1 className="mt-3 font-display text-[2.7rem] leading-[0.95] uppercase">
            {partyName}
          </h1>
          <p className="mt-4 max-w-[34ch] text-[15px] leading-snug text-white/85">
            {partyDate ? `${partyDate}. ` : ""}Photo bingo, kart times,
            carspotting and a tournament — all weekend, one overall winner.
          </p>
        </div>
      </div>

      {/* sign-in */}
      <section className="px-5 py-7">
        <div className="card p-5">
          <h2 className="font-display text-lg uppercase tracking-tight">
            Sign in
          </h2>
          <p className="mt-1 mb-5 text-[13px] text-ink-faint">
            Just your number and a name — no password.
          </p>
          <Suspense
            fallback={<div className="skeleton h-64 w-full" />}
          >
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-[12px] leading-relaxed text-ink-faint">
          Your number keeps your photos and scores attached to you, on whichever
          phone you pick up.
        </p>
      </section>
    </main>
  );
}
