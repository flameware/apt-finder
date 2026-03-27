import type { NearbyNature } from "@/types";
import { natureTypeLabel } from "@/lib/geo";

interface Props {
  nearbyNature: NearbyNature[];
  maxDistance: number;
}

const TYPE_EMOJI: Record<string, string> = {
  mountain: "⛰️",
  forest: "🌲",
  water: "💧",
};

export function NatureProximityList({ nearbyNature, maxDistance }: Props) {
  const filtered = nearbyNature.filter((n) => n.distanceMeters <= maxDistance);

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {maxDistance}m 이내 자연환경 없음
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {filtered.map((n, i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          <span>{TYPE_EMOJI[n.type] ?? "🌿"}</span>
          <span className="text-muted-foreground text-xs w-12 shrink-0">
            {natureTypeLabel(n.type)}
          </span>
          <span className="flex-1 truncate font-medium">
            {n.name ?? "이름 없음"}
          </span>
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            {n.distanceMeters < 1000
              ? `${Math.round(n.distanceMeters)}m`
              : `${(n.distanceMeters / 1000).toFixed(1)}km`}
          </span>
        </li>
      ))}
    </ul>
  );
}
