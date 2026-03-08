"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "ironmon-collapsed-sections";

function loadCollapsedState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCollapsedState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useCollapsedState(id: string, defaultOpen = true) {
  const [open, setOpen] = useState(() => {
    const saved = loadCollapsedState();
    return id in saved ? !saved[id] : defaultOpen;
  });

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      const saved = loadCollapsedState();
      saved[id] = !next; // saved stores "collapsed" state
      saveCollapsedState(saved);
      return next;
    });
  }, [id]);

  return [open, toggle] as const;
}

export function CollapsibleSection({
  id,
  title,
  summary,
  defaultOpen = true,
  variant = "default",
  headerRight,
  children,
}: {
  id: string;
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  variant?: "default" | "danger" | "warning" | "accent";
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  const [open, toggle] = useCollapsedState(id, defaultOpen);

  const titleColors = {
    default: "text-pine-accent",
    danger: "text-pine-danger",
    warning: "text-pine-warning",
    accent: "text-pine-accent",
  };

  const borderColors = {
    default: "border-pine-border",
    danger: "border-pine-danger/30",
    warning: "border-pine-border",
    accent: "border-pine-border",
  };

  return (
    <div className={`rounded border ${borderColors[variant]} bg-pine-surface`}>
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-pine-border/20 transition-colors cursor-pointer"
      >
        <span className="text-[10px] text-pine-muted">
          {open ? "\u25BC" : "\u25B6"}
        </span>
        <span className={`text-xs font-bold uppercase tracking-[1.5px] ${titleColors[variant]}`}>
          {title}
        </span>
        {!open && summary && (
          <span className="ml-auto text-[10px] text-pine-muted truncate">
            {summary}
          </span>
        )}
        {open && headerRight && (
          <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
            {headerRight}
          </div>
        )}
      </div>
      {open && (
        <div className="border-t border-pine-border/30 px-3 py-2">
          {children}
        </div>
      )}
    </div>
  );
}

/** Lightweight sub-section toggle for use inside BattleView etc. */
export function CollapsibleSub({
  id,
  title,
  summary,
  defaultOpen = true,
  variant = "accent",
  children,
}: {
  id: string;
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  variant?: "accent" | "danger";
  children: ReactNode;
}) {
  const [open, toggle] = useCollapsedState(id, defaultOpen);

  const color = variant === "danger" ? "text-pine-danger" : "text-pine-accent";

  return (
    <div className="mt-3 rounded border border-pine-border/30 bg-pine-bg/50">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left hover:bg-pine-border/10 transition-colors"
      >
        <span className="text-[9px] text-pine-muted">
          {open ? "\u25BC" : "\u25B6"}
        </span>
        <span className={`text-[10px] font-bold uppercase ${color}`}>
          {title}
        </span>
        {!open && summary && (
          <span className="ml-auto text-[9px] text-pine-muted truncate">
            {summary}
          </span>
        )}
      </button>
      {open && (
        <div className="px-2 pb-2">
          {children}
        </div>
      )}
    </div>
  );
}
