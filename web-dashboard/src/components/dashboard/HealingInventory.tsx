"use client";

import type { HealingItem } from "@/lib/types";

export function HealingInventory({ items }: { items: HealingItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded border border-pine-border bg-pine-surface p-3">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-[1.5px] text-pine-accent">
          Healing Items
        </h2>
        <p className="text-[10px] text-pine-muted">No healing items</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-pine-border bg-pine-surface p-3">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-[1.5px] text-pine-accent">
        Healing Items
      </h2>
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
    </div>
  );
}
