import type { EncounterData } from "@/lib/types";

interface RouteEncountersProps {
  encounters?: EncounterData;
  currentLocation: string;
}

export function RouteEncounters({ encounters, currentLocation }: RouteEncountersProps) {
  if (!encounters) return null;

  const { areaOrder, routes } = encounters;

  // Collect ordered routes, then any extras with data
  const extraRoutes = Object.keys(routes).filter(
    (name) => !areaOrder.includes(name) && routes[name].seen.length > 0
  );
  const allRouteNames = [...areaOrder, ...extraRoutes];

  if (allRouteNames.length === 0) return null;

  return (
    <div className="rounded border border-pine-border bg-pine-surface p-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-pine-accent">
        Route Encounters
      </h3>
      <div className="space-y-1">
        {allRouteNames.map((routeName) => {
          const route = routes[routeName];
          if (!route) return null;

          const isCurrent = routeName === currentLocation;
          const seenCount = route.seen.length;
          const total = route.totalPokemon;
          const isComplete = total > 0 && seenCount >= total;
          const hasData = seenCount > 0;

          const countStr = total > 0 ? `${seenCount}/${total}` : `${seenCount}/?`;

          return (
            <div
              key={routeName}
              className={`rounded px-2 py-1 text-xs ${
                isCurrent
                  ? "border border-pine-accent/30 bg-pine-accent/10"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`font-bold ${
                    isComplete
                      ? "text-pine-success"
                      : hasData
                        ? "text-pine-secondary"
                        : "text-pine-muted"
                  }`}
                >
                  {isCurrent && "▶ "}
                  {routeName}
                </span>
                <span
                  className={`font-mono ${
                    isComplete
                      ? "text-pine-success"
                      : hasData
                        ? "text-pine-text"
                        : "text-pine-dim"
                  }`}
                >
                  {countStr}
                </span>
              </div>
              {hasData && (
                <div className="mt-0.5 text-pine-muted">
                  {route.seen
                    .map(
                      (p) =>
                        `${p.name}${p.levels.length > 0 ? ` (Lv.${p.levels.join(",")})` : ""}`
                    )
                    .join(", ")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
