"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGuest } from "@/components/GuestProvider";
import { Avatar } from "@/components/Avatar";

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
      <Link
        href={`/u/${guest.id}`}
        className="flex min-w-0 items-center gap-2 active:opacity-70"
      >
        <Avatar name={guest.display_name} url={guest.avatar_url} size={24} />
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
          Filed as{" "}
          <span className="text-ink underline underline-offset-2">
            {guest.display_name}
          </span>
        </span>
      </Link>
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
