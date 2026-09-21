"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type GalleryItem = {
  id: string;
  url: string;
  guestName: string;
  squareTitle: string;
  squarePosition: number;
  createdAt: string;
};

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  const people = useMemo(
    () => [...new Set(items.map((i) => i.guestName))].sort(),
    [items],
  );

  const shown = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.guestName === filter)),
    [items, filter],
  );

  if (items.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="font-display text-lg uppercase">The archive is empty</p>
        <p className="mt-2 text-sm text-ink-soft">
          No evidence has been submitted. The Bureau waits.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto border-b-2 border-ink bg-card px-4 py-2.5">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          Everyone · {items.length}
        </Chip>
        {people.map((p) => (
          <Chip key={p} active={filter === p} onClick={() => setFilter(p)}>
            {p}
          </Chip>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1 p-1 pb-10">
        {shown.map((item) => (
          <motion.button
            key={item.id}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setLightbox(item)}
            className="relative aspect-square overflow-hidden border border-ink/20 bg-bone-deep"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={`${item.squareTitle} by ${item.guestName}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 truncate bg-ink/75 px-1 py-0.5 text-left font-mono text-[8px] uppercase tracking-wide text-bone">
              {item.guestName}
            </span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {lightbox ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-ink/95 pb-safe"
            onClick={() => setLightbox(null)}
          >
            <div className="flex-1 overflow-hidden p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.url}
                alt={lightbox.squareTitle}
                className="mx-auto h-full w-full object-contain"
              />
            </div>
            <div className="border-t-2 border-bone/20 px-5 py-4 text-bone">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone/60">
                Item {String(lightbox.squarePosition).padStart(2, "0")} ·{" "}
                {new Date(lightbox.createdAt).toLocaleTimeString("en-AU", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <p className="mt-1 font-display text-lg uppercase">
                {lightbox.squareTitle}
              </p>
              <p className="text-sm text-bone/70">
                Submitted by {lightbox.guestName}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 border-2 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${
        active
          ? "border-ink bg-ink text-bone"
          : "border-ink/30 bg-bone text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}
