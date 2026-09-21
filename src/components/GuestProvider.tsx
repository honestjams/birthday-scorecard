"use client";

import { createContext, useContext } from "react";
import type { Guest } from "@/types/database";

const GuestContext = createContext<Guest | null>(null);

export function GuestProvider({
  guest,
  children,
}: {
  guest: Guest;
  children: React.ReactNode;
}) {
  return (
    <GuestContext.Provider value={guest}>{children}</GuestContext.Provider>
  );
}

/** Current signed-in guest. Only valid inside the authenticated layout. */
export function useGuest(): Guest {
  const guest = useContext(GuestContext);
  if (!guest) throw new Error("useGuest must be used inside GuestProvider");
  return guest;
}

export function useIsStaff(): boolean {
  const guest = useContext(GuestContext);
  return guest?.role === "host" || guest?.role === "helper";
}
