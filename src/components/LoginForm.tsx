"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "guest-login",
        { body: { phone, displayName: name } },
      );

      if (fnError) {
        // Edge function errors arrive as a Response we still want to read.
        let message = "Something went wrong. Try again.";
        const ctx = (fnError as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            if (body?.error) message = body.error;
          } catch {
            /* fall through to the generic message */
          }
        }
        throw new Error(message);
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (sessionError) throw new Error("Could not start your session.");

      router.replace(params.get("next") || "/bingo");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={busy} className="space-y-5">
        <Field
          label="1a. Mobile number"
          hint="Used only to find your file. Never shown to other attendees."
        >
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0412 345 678"
            className="w-full border-2 border-ink bg-white px-3 py-3 font-mono tracking-wider outline-none placeholder:text-ink-faint/60 focus:ring-4 focus:ring-hazard"
          />
        </Field>

        <Field
          label="1b. Name, as you wish to be known"
          hint="This appears on the leaderboard and the draw."
        >
          <input
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Josh"
            className="w-full border-2 border-ink bg-white px-3 py-3 outline-none placeholder:text-ink-faint/60 focus:ring-4 focus:ring-hazard"
          />
        </Field>

        {error ? (
          <p
            role="alert"
            className="animate-shake border-2 border-stamp bg-stamp/8 px-3 py-2 text-sm font-medium text-stamp-deep"
          >
            {error}
          </p>
        ) : null}

        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          className="w-full border-2 border-ink bg-ink px-4 py-4 font-display text-base uppercase tracking-widest text-bone shadow-[4px_4px_0_0_var(--color-stamp)] disabled:opacity-60"
        >
          {busy ? "Processing…" : "Submit application"}
        </motion.button>
      </fieldset>

      <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Processing time: instant · Appeals: not accepted
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </span>
      {hint ? (
        <span className="mt-0.5 block text-[12px] leading-snug text-ink-faint">
          {hint}
        </span>
      ) : null}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
