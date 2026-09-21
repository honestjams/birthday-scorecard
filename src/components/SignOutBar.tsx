"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGuest } from "@/components/GuestProvider";

export function SignOutBar() {
  const guest = useGuest();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t-2 border-ink/15 bg-bone px-5 py-2">
      <span className="truncate font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
        Filed as {guest.display_name}
      </span>
      <button
        onClick={signOut}
        disabled={busy}
        className="shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-stamp underline underline-offset-2 disabled:opacity-50"
      >
        Not you?
      </button>
    </div>
  );
}
