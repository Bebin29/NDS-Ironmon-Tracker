"use client";

import type { HealingItem } from "@/lib/types";

export function HealingInventory({ items }: { items: HealingItem[] }) {
  if (items.length === 0) {
    return <p className="text-[10px] text-pine-muted">No healing items</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-1 rounded-sm bg-pine-bg px-2 py-1 text-[10px]"
        >
          <span className="text-pine-secondary">{item.name}</span>
          <span className="font-bold text-pine-accent">
            x{item.quantity}
          </span>
        </div>
      ))}
    </div>
  );
}
