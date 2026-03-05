"use client";

export function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`h-2 w-2 rounded-full ${
          connected ? "animate-pulse bg-pine-accent" : "bg-pine-danger"
        }`}
      />
      <span className="text-[10px] font-bold uppercase tracking-wider text-pine-accent">
        {connected ? "Live" : "Offline"}
      </span>
    </div>
  );
}
