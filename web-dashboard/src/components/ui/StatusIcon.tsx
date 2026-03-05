"use client";

const STATUS_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: "PSN", color: "bg-type-poison" },
  2: { label: "BRN", color: "bg-type-fire" },
  3: { label: "FRZ", color: "bg-type-ice" },
  4: { label: "PAR", color: "bg-type-electric" },
  5: { label: "SLP", color: "bg-pine-dim" },
  6: { label: "TOX", color: "bg-purple-700" },
};

export function StatusIcon({ status }: { status: number }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <span
      className={`${config.color} inline-block rounded-sm px-1.5 py-px text-[10px] font-bold text-white`}
    >
      {config.label}
    </span>
  );
}
