"use client";

import { usePathname } from "next/navigation";
import { themeClass, themeForPath } from "@/lib/themes";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

/**
 * Applies the current tab's accent theme to everything beneath it, and
 * frames the page with the top bar and bottom nav. The theme class drives
 * the `--color-accent` variables used across buttons, links and highlights.
 */
export function ThemeShell({
  partyName,
  children,
}: {
  partyName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const cls = themeClass(themeForPath(pathname));

  return (
    <div className={`${cls} flex min-h-dvh flex-col`}>
      <AppHeader partyName={partyName} />
      <div className="flex-1">{children}</div>
      <BottomNav />
    </div>
  );
}
