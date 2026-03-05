"use client";

export function HPBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  const color =
    pct > 50
      ? "bg-pine-accent"
      : pct > 25
        ? "bg-pine-warning"
        : "bg-pine-danger";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full rounded-sm bg-pine-bg">
        <div
          className={`h-2 rounded-sm transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="min-w-[60px] text-right text-[10px] text-pine-muted">
        {current}/{max}
      </span>
    </div>
  );
}
