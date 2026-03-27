"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/store/useAppStore";
import type { FacingDirection } from "@/types";

const OPTIONS: { value: FacingDirection; label: string }[] = [
  { value: "S", label: "남향" },
  { value: "SE", label: "남동향" },
  { value: "SW", label: "남서향" },
  { value: "E", label: "동향" },
];

export function FacingFilter() {
  const facingDirections = useAppStore((s) => s.filter.facingDirections);
  const setFilter = useAppStore((s) => s.setFilter);

  function toggle(dir: FacingDirection) {
    const next = facingDirections.includes(dir)
      ? facingDirections.filter((d) => d !== dir)
      : [...facingDirections, dir];
    setFilter({ facingDirections: next });
  }

  const isAny = facingDirections.length === 0;

  function setAny() {
    setFilter({ facingDirections: [] });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">향</p>
      <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 -mx-1">
        <Checkbox
          checked={isAny}
          onCheckedChange={() => isAny ? setFilter({ facingDirections: ["S", "SE"] }) : setAny()}
        />
        <span className="text-sm">방향 무관 (미확인 포함)</span>
      </label>
      {OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 -mx-1"
        >
          <Checkbox
            checked={!isAny && facingDirections.includes(opt.value)}
            disabled={isAny}
            onCheckedChange={() => toggle(opt.value)}
          />
          <span className={`text-sm ${isAny ? "text-muted-foreground" : ""}`}>
            {opt.label}
          </span>
        </label>
      ))}
    </div>
  );
}
