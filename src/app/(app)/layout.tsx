import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GuestProvider } from "@/components/GuestProvider";
import { BottomNav } from "@/components/BottomNav";
import { SignOutBar } from "@/components/SignOutBar";
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

  const { data: guest } = await supabase
    .from("guests")
    .select("id, display_name, avatar_url, role, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (!guest) redirect("/");

  return (
    <GuestProvider guest={guest as Guest}>
      <div className="flex min-h-dvh flex-col">
        <div className="flex-1">{children}</div>
        <SignOutBar />
        <BottomNav />
      </div>
    </GuestProvider>
  );
}
