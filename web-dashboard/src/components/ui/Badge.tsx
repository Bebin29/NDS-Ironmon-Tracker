"use client";

import { BADGE_NAMES } from "@/lib/platinum-data";

export function BadgeIcon({
  index,
  earned,
}: {
  index: number;
  earned: boolean;
}) {
  return (
    <div
      className={`h-6 w-6 rounded-sm transition-all ${
        earned ? "bg-pine-accent" : "bg-pine-border"
      }`}
      title={`${BADGE_NAMES[index] || `Badge ${index + 1}`} Badge`}
    />
  );
}
