import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GuestProvider } from "@/components/GuestProvider";
import { ThemeShell } from "@/components/ThemeShell";
import type { Guest } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: guest }, { data: settings }] = await Promise.all([
    supabase
      .from("guests")
      .select("id, display_name, avatar_url, role, created_at, updated_at")
      .eq("id", user.id)
      .single(),
    supabase.from("app_settings").select("party_name").single(),
  ]);

  if (!guest) redirect("/");

  return (
    <GuestProvider guest={guest as Guest}>
      <ThemeShell partyName={settings?.party_name ?? "The Party"}>
        {children}
      </ThemeShell>
    </GuestProvider>
  );
}
