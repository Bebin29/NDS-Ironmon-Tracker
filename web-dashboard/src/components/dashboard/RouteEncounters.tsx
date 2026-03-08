import type { EncounterData } from "@/lib/types";
import type { RouteClaimEntry, RouteStatus } from "@/hooks/useEncounterChecklist";

interface RouteEncountersProps {
  encounters?: EncounterData;
  currentLocation: string;
  claims?: Record<string, RouteClaimEntry>;
  onSetStatus?: (routeName: string, status: RouteStatus, pokemonName?: string, pokemonID?: number) => void;
  onRemoveClaim?: (routeName: string) => void;
  summary?: { caught: number; failed: number; skipped: number; total: number };
}

const STATUS_CONFIG: Record<RouteStatus, { label: string; icon: string; color: string; bg: string }> = {
  caught: { label: "Caught", icon: "\u25CF", color: "text-green-400", bg: "bg-green-700/20" },
  failed: { label: "Failed", icon: "\u2716", color: "text-red-400", bg: "bg-red-700/20" },
  skipped: { label: "Dupe", icon: "\u21BB", color: "text-yellow-400", bg: "bg-yellow-700/20" },
};

function StatusButton({
  status,
  active,
  onClick,
}: {
  status: RouteStatus;
  active: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`rounded px-1.5 py-px text-[9px] font-bold transition-colors ${
        active
          ? `${cfg.bg} ${cfg.color} border border-current`
          : "text-pine-dim hover:text-pine-muted border border-transparent"
      }`}
      title={active ? `Clear ${cfg.label}` : cfg.label}
    >
      {cfg.icon}
    </button>
  );
}

export function RouteEncounters({
  encounters,
  currentLocation,
  claims = {},
  onSetStatus,
  onRemoveClaim,
  summary,
}: RouteEncountersProps) {
  if (!encounters) return null;

  const { areaOrder, routes } = encounters;

  // Collect ordered routes, then any extras with data
  const extraRoutes = Object.keys(routes).filter(
    (name) => !areaOrder.includes(name) && (routes[name].seen.length > 0 || claims[name])
  );
  const allRouteNames = [...areaOrder, ...extraRoutes];

  if (allRouteNames.length === 0) return null;

  return (
    <div>
      {summary && summary.total > 0 && (
        <div className="mb-2 flex items-center gap-2 text-[9px] font-bold">
          {summary.caught > 0 && (
            <span className="text-green-400">{summary.caught} caught</span>
          )}
          {summary.failed > 0 && (
            <span className="text-red-400">{summary.failed} failed</span>
          )}
          {summary.skipped > 0 && (
            <span className="text-yellow-400">{summary.skipped} dupes</span>
          )}
        </div>
      )}
      <div className="space-y-1">
        {allRouteNames.map((routeName) => {
          const route = routes[routeName];
          if (!route) return null;

          const isCurrent = routeName === currentLocation;
          const seenCount = route.seen.length;
          const total = route.totalPokemon;
          const isComplete = total > 0 && seenCount >= total;
          const hasData = seenCount > 0;
          const claim = claims[routeName];

          const countStr = total > 0 ? `${seenCount}/${total}` : `${seenCount}/?`;

          const claimCfg = claim ? STATUS_CONFIG[claim.status] : null;

          return (
            <div
              key={routeName}
              className={`rounded px-2 py-1 text-xs ${
                isCurrent
                  ? "border border-pine-accent/30 bg-pine-accent/10"
                  : claim
                    ? `${claimCfg!.bg} border border-transparent`
                    : ""
              }`}
            >
              <div className="flex items-center gap-1.5">
                {/* Route status indicator */}
                {claim && (
                  <span className={`text-[10px] ${claimCfg!.color}`} title={claimCfg!.label}>
                    {claimCfg!.icon}
                  </span>
                )}

                <span
                  className={`flex-1 font-bold ${
                    claim
                      ? claimCfg!.color
                      : isComplete
                        ? "text-pine-success"
                        : hasData
                          ? "text-pine-secondary"
                          : "text-pine-muted"
                  }`}
                >
                  {isCurrent && "\u25B6 "}
                  {routeName}
                  {claim?.pokemonName && (
                    <span className="ml-1 font-normal text-pine-muted">
                      ({claim.pokemonName})
                    </span>
                  )}
                </span>

                {/* Status buttons */}
                {onSetStatus && hasData && (
                  <div className="flex gap-0.5">
                    {(["caught", "failed", "skipped"] as const).map((s) => (
                      <StatusButton
                        key={s}
                        status={s}
                        active={claim?.status === s}
                        onClick={() => {
                          if (claim?.status === s) {
                            onRemoveClaim?.(routeName);
                          } else {
                            const firstPokemon = route.seen[0];
                            onSetStatus(routeName, s, firstPokemon?.name, firstPokemon?.pokemonID);
                          }
                        }}
                      />
                    ))}
                  </div>
                )}

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
                <div className="mt-0.5 pl-4 text-pine-muted">
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
