"use client";

const STAT_COLORS: Record<string, string> = {
  HP: "bg-pine-danger",
  ATK: "bg-type-fire",
  DEF: "bg-pine-warning",
  SPA: "bg-type-water",
  SPD: "bg-pine-accent",
  SPE: "bg-type-psychic",
};

export function StatBar({
  label,
  value,
  maxValue = 255,
}: {
  label: string;
  value: number;
  maxValue?: number;
}) {
  const pct = Math.min((value / maxValue) * 100, 100);
  const color = STAT_COLORS[label] || "bg-pine-accent";

  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-right text-[10px] font-medium text-pine-muted">
        {label}
      </span>
      <div className="h-1 flex-1 rounded-sm bg-pine-bg">
        <div
          className={`h-1 rounded-sm ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-[10px] text-pine-dim">{value}</span>
    </div>
  );
}
